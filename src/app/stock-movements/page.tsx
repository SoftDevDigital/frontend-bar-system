"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  getStockMovementsByDateRange,
  getStockMovementsSummary,
  getTopMovingItems,
  type InventoryMovement,
  type StockMovementsSummary,
  type TopMovingItem,
} from "../lib/api";

// 👉 mismo tipo de rol que en inventory
type UserRole = "admin" | "employee" | "customer" | string | null;

// helper para formatear Date como "YYYY-MM-DD" para <input type="date" />
const formatDateInput = (d: Date) => d.toISOString().slice(0, 10);

const formatNumber = (n: number | undefined | null) => {
  if (typeof n !== "number") return "0";
  return n.toLocaleString("es-AR");
};

const formatCurrency = (n: number | undefined | null) => {
  if (typeof n !== "number") return "$ 0";
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
};

export default function StockMovementsPage() {
  // 🔐 control de permisos (admin / employee)
  const [role, setRole] = useState<UserRole>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("festgo_user");
    if (!raw) {
      setCheckingRole(false);
      return;
    }

    try {
      const user = JSON.parse(raw) as { role?: string };
      setRole(user.role ?? null);
    } catch {
      setRole(null);
    } finally {
      setCheckingRole(false);
    }
  }, []);

  const isStaff = role === "admin" || role === "employee";

  const [rows, setRows] = useState<InventoryMovement[]>([]);
  const [summary, setSummary] = useState<StockMovementsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // TOP MOVING ITEMS
  const [topItems, setTopItems] = useState<TopMovingItem[]>([]);
  const [topDays, setTopDays] = useState<string>("7");
  const [topLimit, setTopLimit] = useState<string>("5");
  const [loadingTop, setLoadingTop] = useState<boolean>(false);
  const [topErrorMsg, setTopErrorMsg] = useState<string | null>(null);

  // filtros de fecha (solo fecha, sin hora, para el form)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // función que realmente llama a ambos endpoints de rango
  const fetchData = async (start: string, end: string) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // armamos las ISO igual que en el curl de Swagger
      const startISO = `${start}T00:00:00.000Z`;
      const endISO = `${end}T23:59:59.999Z`;

      // 👉 pegamos a /by-date-range (lista) y /summary (agregado) a la vez
      const [movementsRes, summaryRes] = await Promise.all([
        getStockMovementsByDateRange({
          startDate: startISO,
          endDate: endISO,
        }),
        getStockMovementsSummary({
          startDate: startISO,
          endDate: endISO,
        }),
      ]);

      if (!movementsRes.success) {
        throw new Error(
          movementsRes.message || "No se pudieron obtener los movimientos"
        );
      }

      if (!summaryRes.success) {
        throw new Error(
          summaryRes.message ||
            "No se pudo obtener el resumen de movimientos"
        );
      }

      if (Array.isArray(movementsRes.data)) {
        setRows(movementsRes.data);
      } else {
        setRows([]);
      }

      setSummary(summaryRes.data ?? null);
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al cargar los datos");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // función para llamar a /stock-movements/top-moving-items
  const fetchTopItems = async (daysStr?: string, limitStr?: string) => {
    const days = daysStr ?? topDays;
    const limit = limitStr ?? topLimit;

    setLoadingTop(true);
    setTopErrorMsg(null);

    try {
      const res = await getTopMovingItems({
        days: days ? Number(days) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      if (!res.success) {
        throw new Error(
          res.message ||
            "No se pudieron obtener los artículos con más movimiento"
        );
      }

      if (Array.isArray(res.data)) {
        setTopItems(res.data);
      } else {
        setTopItems([]);
      }
    } catch (err: any) {
      setTopErrorMsg(
        err.message ||
          "Error inesperado al cargar los artículos con más movimiento"
      );
      setTopItems([]);
    } finally {
      setLoadingTop(false);
    }
  };

  // al montar, seteamos por defecto "últimos 7 días" y cargamos
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const start = formatDateInput(sevenDaysAgo);
    const end = formatDateInput(today);

    setStartDate(start);
    setEndDate(end);

    // llamamos una vez con esos valores
    fetchData(start, end);
    // y también cargamos top items por defecto (7 días, top 5)
    fetchTopItems("7", "5");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // submit del formulario de filtros
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    fetchData(startDate, endDate);
  };

  // submit del formulario de Top Moving Items
  const handleTopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTopItems(topDays, topLimit);
  };

  // ⛔️ Mientras chequeamos el rol, mostramos loading simple
  if (checkingRole) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          padding: "1.5rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "1200px" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 600 }}>
            Stock Movements
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Cargando permisos...
          </p>
        </div>
      </main>
    );
  }

  // ⛔️ Si NO es admin / employee, bloqueamos la vista
  if (!isStaff) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          padding: "1.5rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "1200px" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 600 }}>
            Stock Movements
          </h1>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#fecaca",
              background: "#450a0a",
              borderRadius: "0.6rem",
              padding: "0.5rem 0.75rem",
              border: "1px solid #b91c1c",
              marginTop: "0.75rem",
              maxWidth: "520px",
            }}
          >
            No tenés permisos para ver esta página. Solo el staff del bar
            (administradores y empleados) puede acceder a los movimientos de
            stock.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        padding: "1.5rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "1200px" }}>
        {/* Header */}
        <header
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <h1 style={{ fontSize: "1.6rem", fontWeight: 600 }}>
            Stock Movements
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Resumen y detalle de movimientos de stock filtrados por rango de
            fechas.
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8rem",
              color: "#a5b4fc",
              background: "#111827",
              borderRadius: "999px",
              padding: "0.25rem 0.75rem",
              border: "1px solid #1d2440",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "999px",
                background: "#22c55e",
              }}
            />
            GET /api/v1/stock-movements/summary
            <span style={{ opacity: 0.6 }}>+</span>
            GET /api/v1/stock-movements/by-date-range
            <span style={{ opacity: 0.6 }}>+</span>
            GET /api/v1/stock-movements/top-moving-items
          </div>
        </header>

        {/* Filtros de fecha */}
        <section
          style={{
            marginBottom: "1rem",
            background: "#020617",
            borderRadius: "0.75rem",
            border: "1px solid #1f2937",
            padding: "0.75rem 1rem",
          }}
        >
          <form
            onSubmit={handleFilterSubmit}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                Fecha inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  background: "#020617",
                  color: "#e5e7eb",
                  borderRadius: "0.5rem",
                  border: "1px solid #374151",
                  padding: "0.35rem 0.5rem",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                Fecha fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  background: "#020617",
                  color: "#e5e7eb",
                  borderRadius: "0.5rem",
                  border: "1px solid #374151",
                  padding: "0.35rem 0.5rem",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "999px",
                border: "1px solid #4f46e5",
                background:
                  "linear-gradient(135deg, #4f46e5, #7c3aed, #ec4899)",
                fontSize: "0.85rem",
                fontWeight: 500,
                color: "#f9fafb",
                cursor: "pointer",
                marginLeft: "auto",
              }}
            >
              Aplicar filtro
            </button>
          </form>
        </section>

        {/* Card principal */}
        <section
          style={{
            background: "#020617",
            borderRadius: "1rem",
            border: "1px solid #1f2937",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            padding: "1.25rem",
          }}
        >
          {/* Estados */}
          {loading && (
            <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
              Cargando movimientos de stock...
            </p>
          )}

          {errorMsg && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#fecaca",
                background: "#450a0a",
                borderRadius: "0.6rem",
                padding: "0.5rem 0.75rem",
                border: "1px solid #b91c1c",
                marginBottom: "0.75rem",
              }}
            >
              {errorMsg}
            </p>
          )}

          {/* Resumen */}
          {!loading && !errorMsg && summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #1f2937",
                  background:
                    "radial-gradient(circle at top left, #1d283a, #020617)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                    marginBottom: "0.25rem",
                  }}
                >
                  Movimientos totales
                </p>
                <p style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                  {formatNumber(summary.totalMovements)}
                </p>
              </div>

              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #1f2937",
                  background:
                    "radial-gradient(circle at top left, #172554, #020617)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                    marginBottom: "0.25rem",
                  }}
                >
                  Cantidad total
                </p>
                <p style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                  {formatNumber(summary.totalQuantity)}
                </p>
              </div>

              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #1f2937",
                  background:
                    "radial-gradient(circle at top left, #1e293b, #020617)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                    marginBottom: "0.25rem",
                  }}
                >
                  Valor total
                </p>
                <p style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                  {formatCurrency(summary.totalValue)}
                </p>
              </div>

              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #1f2937",
                  background: "#020617",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                    marginBottom: "0.35rem",
                  }}
                >
                  Por tipo
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                  }}
                >
                  {Object.entries(summary.byType || {}).map(
                    ([type, count]) => (
                      <span
                        key={type}
                        style={{
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                          border: "1px solid #334155",
                          fontSize: "0.75rem",
                          background:
                            type === "sale"
                              ? "rgba(248,113,113,0.12)"
                              : "rgba(56,189,248,0.08)",
                        }}
                      >
                        {type}: {formatNumber(count as number)}
                      </span>
                    )
                  )}
                  {Object.keys(summary.byType || {}).length === 0 && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                      }}
                    >
                      Sin datos de tipos
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Top Moving Items */}
          {!errorMsg && (
            <section
              style={{
                marginBottom: "1.25rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid #1f2937",
                background: "#020617",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      marginBottom: "0.15rem",
                    }}
                  >
                    Artículos con más movimiento
                  </h2>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    Basado en movimientos de stock recientes.
                  </p>
                </div>

                <form
                  onSubmit={handleTopSubmit}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <label
                      style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                    >
                      Días
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={topDays}
                      onChange={(e) => setTopDays(e.target.value)}
                      style={{
                        width: "4rem",
                        background: "#020617",
                        color: "#e5e7eb",
                        borderRadius: "0.5rem",
                        border: "1px solid #374151",
                        padding: "0.25rem 0.4rem",
                        fontSize: "0.8rem",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <label
                      style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                    >
                      Top
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={topLimit}
                      onChange={(e) => setTopLimit(e.target.value)}
                      style={{
                        width: "4rem",
                        background: "#020617",
                        color: "#e5e7eb",
                        borderRadius: "0.5rem",
                        border: "1px solid #374151",
                        padding: "0.25rem 0.4rem",
                        fontSize: "0.8rem",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "999px",
                      border: "1px solid #4f46e5",
                      background:
                        "linear-gradient(135deg, #4f46e5, #7c3aed, #ec4899)",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      color: "#f9fafb",
                      cursor: "pointer",
                    }}
                  >
                    Actualizar
                  </button>
                </form>
              </div>

              {loadingTop && (
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  Cargando artículos con más movimiento...
                </p>
              )}

              {topErrorMsg && (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "#fecaca",
                    background: "#450a0a",
                    borderRadius: "0.5rem",
                    padding: "0.35rem 0.6rem",
                    border: "1px solid #b91c1c",
                  }}
                >
                  {topErrorMsg}
                </p>
              )}

              {!loadingTop && !topErrorMsg && topItems.length === 0 && (
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  No hay datos de artículos con más movimiento para los
                  parámetros seleccionados.
                </p>
              )}

              {!loadingTop && !topErrorMsg && topItems.length > 0 && (
                <div style={{ width: "100%", overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.8rem",
                      minWidth: "600px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#020617",
                        }}
                      >
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>Item ID</th>
                        <th style={thStyle}>Cantidad total</th>
                        <th style={thStyle}>Movimientos</th>
                        <th style={thStyle}>Último movimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.map((item, index) => (
                        <tr
                          key={item.inventoryItemId}
                          style={{
                            borderBottom: "1px solid #111827",
                          }}
                        >
                          <td style={tdStyle}>{index + 1}</td>
                          <td style={tdStyle}>
                            <code
                              style={{
                                fontSize: "0.75rem",
                                background: "#020617",
                                padding: "0.15rem 0.35rem",
                                borderRadius: "0.35rem",
                                border: "1px solid #1f2937",
                              }}
                            >
                              {item.inventoryItemId}
                            </code>
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              textAlign: "right",
                            }}
                          >
                            {formatNumber(item.totalQuantity)}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              textAlign: "right",
                            }}
                          >
                            {formatNumber(item.movementCount)}
                          </td>
                          <td style={tdStyle}>
                            {new Date(item.lastMovement).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {!loading && !errorMsg && rows.length === 0 && (
            <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
              No hay movimientos registrados en el rango seleccionado.
            </p>
          )}

          {/* Tabla principal de movimientos */}
          {!loading && !errorMsg && rows.length > 0 && (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                  minWidth: "800px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#111827",
                    }}
                  >
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Item ID</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Razón</th>
                    <th style={thStyle}>Cantidad</th>
                    <th style={thStyle}>Referencia</th>
                    <th style={thStyle}>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: "1px solid #111827",
                      }}
                    >
                      <td style={tdStyle}>
                        {new Date(m.movementDate).toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        <code
                          style={{
                            fontSize: "0.78rem",
                            background: "#020617",
                            padding: "0.15rem 0.35rem",
                            borderRadius: "0.35rem",
                            border: "1px solid #1f2937",
                          }}
                        >
                          {m.inventoryItemId}
                        </code>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            background:
                              m.type === "sale"
                                ? "rgba(248,113,113,0.15)"
                                : "rgba(52,211,153,0.12)",
                            border:
                              m.type === "sale"
                                ? "1px solid rgba(248,113,113,0.5)"
                                : "1px solid rgba(52,211,153,0.5)",
                            color:
                              m.type === "sale" ? "#fecaca" : "#bbf7d0",
                          }}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td style={tdStyle}>{m.reason}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {m.quantity}
                      </td>
                      <td style={tdStyle}>{m.reference || "—"}</td>
                      <td style={tdStyle}>{m.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.6rem 0.75rem",
  fontWeight: 600,
  fontSize: "0.8rem",
  color: "#9ca3af",
  borderBottom: "1px solid #1f2937",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.55rem 0.75rem",
  fontSize: "0.8rem",
  color: "#e5e7eb",
  verticalAlign: "top",
};
