"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FinancialMovement,
  getFinancialMovements,
  createFinancialMovement,
  type CreateFinancialMovementPayload,
  type FinancialMovementType,
} from "../lib/api";

type State = {
  loading: boolean;
  error: string | null;
  data: FinancialMovement[] | null;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("es-AR");
  } catch {
    return iso;
  }
}

export default function FinancialMovementsPage() {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    data: null,
  });

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [type, setType] = useState<string>("");

  // ✅ Form create movement
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<CreateFinancialMovementPayload>({
    type: "EXPENSE",
    amount: 0,
    description: "",
    category: "",
    subcategory: "",
    supplierId: "",
    employeeId: "",
    paymentMethod: "",
    receiptUrl: "",
    approvedBy: "",
    notes: "",
    tags: [],
  });

  const totalAmount = useMemo(() => {
    const arr = state.data ?? [];
    return arr.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  }, [state.data]);

  const fetchData = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await getFinancialMovements({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: type || undefined,
      });

      if (!res.success) {
        setState({
          loading: false,
          error: res.message || "No se pudieron obtener los movimientos",
          data: null,
        });
        return;
      }

      setState({
        loading: false,
        error: null,
        data: res.data ?? [],
      });
    } catch (err: any) {
      setState({
        loading: false,
        error: err?.message || "Error de red",
        data: null,
      });
    }
  };

  const movementTypeOptions: { value: FinancialMovementType; label: string }[] = [
    { value: "INVENTORY_PURCHASE", label: "INVENTORY_PURCHASE — Compras a proveedores" },
    { value: "SALARY_PAYMENT", label: "SALARY_PAYMENT — Pagos de salarios" },
    { value: "UTILITY_PAYMENT", label: "UTILITY_PAYMENT — Pagos de servicios" },
    { value: "TAX_PAYMENT", label: "TAX_PAYMENT — Pagos de impuestos" },
    { value: "EXPENSE", label: "EXPENSE — Gastos generales" },
    { value: "CASH_WITHDRAWAL", label: "CASH_WITHDRAWAL — Retiros de efectivo" },
    { value: "CASH_DEPOSIT", label: "CASH_DEPOSIT — Depósitos de efectivo" },
    // sale normalmente es automático, pero lo dejamos por compatibilidad
    { value: "sale", label: "sale — (normalmente automático por facturas)" },
  ];

  const onSubmitCreate = async () => {
    setCreateSuccess(null);
    setCreateError(null);
    setCreating(true);

    try {
      const res = await createFinancialMovement(form);

      if (!res.success) {
        setCreateError(res.message || "No se pudo registrar el movimiento");
        setCreating(false);
        return;
      }

      setCreateSuccess("Movimiento financiero registrado exitosamente ✅");
      setCreating(false);

      // Reset básico
      setForm((f) => ({
        ...f,
        amount: 0,
        description: "",
        category: "",
        subcategory: "",
        supplierId: "",
        employeeId: "",
        paymentMethod: "",
        receiptUrl: "",
        approvedBy: "",
        notes: "",
        tags: [],
      }));

      // Refrescar listado
      fetchData();
    } catch (err: any) {
      setCreateError(err?.message || "Error de red al registrar movimiento");
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: "#020617",
        color: "#e5e7eb",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
        Movimientos financieros 💳
      </h1>

      <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: "1rem" }}>
        Solo Admin • JWT requerido • Endpoints: GET /financial-movements • POST /financial-movements • GET /financial-movements/summary
      </p>

      {/* ✅ Registrar movimiento */}
      <section
        style={{
          background: "#0f172a",
          border: "1px solid #1f2937",
          borderRadius: "0.9rem",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.75rem" }}>
          Registrar gasto / movimiento 👑
        </h2>

        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
          ABSOLUTAMENTE TODO movimiento de dinero debe registrarse aquí (excepto SALE, que se registra automático al crear facturas).
        </p>

        {createError && (
          <div
            style={{
              background: "#450a0a",
              border: "1px solid #b91c1c",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              marginBottom: "0.75rem",
              color: "#fecaca",
            }}
          >
            {createError}
          </div>
        )}

        {createSuccess && (
          <div
            style={{
              background: "#052e16",
              border: "1px solid #16a34a",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              marginBottom: "0.75rem",
              color: "#bbf7d0",
            }}
          >
            {createSuccess}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Tipo</label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as FinancialMovementType }))
              }
              style={{
                padding: "0.55rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            >
              {movementTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Monto</label>
            <input
              type="number"
              value={String(form.amount ?? 0)}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: Number(e.target.value || 0) }))
              }
              placeholder="1000"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Método de pago</label>
            <input
              value={form.paymentMethod ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              placeholder="cash / card / transfer..."
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Categoría</label>
            <input
              value={form.category ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="ej: servicios"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Subcategoría</label>
            <input
              value={form.subcategory ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
              placeholder="ej: luz"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Proveedor ID (opcional)</label>
            <input
              value={form.supplierId ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
              placeholder="uuid proveedor"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Empleado ID (opcional)</label>
            <input
              value={form.employeeId ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              placeholder="uuid empleado"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Descripción</label>
            <input
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="ej: Pago de luz diciembre"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Notas (opcional)</label>
            <input
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="info extra"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={onSubmitCreate}
              disabled={creating}
              style={{
                padding: "0.65rem 1.1rem",
                borderRadius: "0.7rem",
                border: "none",
                background: creating ? "#64748b" : "#f59e0b",
                color: "#111827",
                fontWeight: 900,
                cursor: creating ? "not-allowed" : "pointer",
              }}
            >
              {creating ? "Registrando..." : "Registrar movimiento"}
            </button>

            <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              Endpoint: <strong>/financial-movements</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Filtros listado */}
      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.85rem" }}>Start Date (YYYY-MM-DD)</label>
          <input
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="2025-12-01"
            style={{
              minWidth: "200px",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.85rem" }}>End Date (YYYY-MM-DD)</label>
          <input
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="2025-12-12"
            style={{
              minWidth: "200px",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.85rem" }}>Type (filtro)</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              minWidth: "260px",
              padding: "0.55rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          >
            <option value="">--</option>
            {movementTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={fetchData}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.7rem",
            border: "none",
            background: "#22c55e",
            color: "#022c22",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Consultar
        </button>
      </section>

      {/* Estados */}
      {state.loading && <p>Cargando movimientos...</p>}

      {state.error && !state.loading && (
        <div
          style={{
            background: "#450a0a",
            border: "1px solid #b91c1c",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            marginBottom: "1rem",
            color: "#fecaca",
          }}
        >
          {state.error}
          <div style={{ marginTop: "0.4rem", color: "#fca5a5", fontSize: "0.85rem" }}>
            Tip: asegurate de tener <strong>festgo_token</strong> en localStorage y que tu usuario sea{" "}
            <strong>admin</strong>.
          </div>
        </div>
      )}

      {!state.loading && !state.error && (
        <>
          {/* KPIs */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1f2937",
                borderRadius: "0.9rem",
                padding: "1rem",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Movimientos</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem" }}>
                {state.data?.length ?? 0}
              </div>
            </div>

            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1f2937",
                borderRadius: "0.9rem",
                padding: "1rem",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Suma montos</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem" }}>
                {formatMoney(totalAmount)}
              </div>
            </div>
          </section>

          {/* Tabla */}
          <section
            style={{
              background: "#0f172a",
              border: "1px solid #1f2937",
              borderRadius: "0.9rem",
              padding: "1rem",
              overflowX: "auto",
            }}
          >
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              Listado
            </h2>

            {!state.data || state.data.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>Sin movimientos para los filtros elegidos.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "left" }}>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Subcat.</th>
                    <th>Método</th>
                    <th>Importe</th>
                    <th>Descripción</th>
                    <th>Nro</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((m) => (
                    <tr key={m.id} style={{ background: "#0b1220" }}>
                      <td style={{ padding: "0.7rem", borderRadius: "0.6rem 0 0 0.6rem" }}>
                        {formatDate(m.createdAt)}
                      </td>
                      <td style={{ padding: "0.7rem" }}>{m.type ?? "-"}</td>
                      <td style={{ padding: "0.7rem" }}>{m.category ?? "-"}</td>
                      <td style={{ padding: "0.7rem" }}>{m.subcategory ?? "-"}</td>
                      <td style={{ padding: "0.7rem" }}>{m.paymentMethod ?? "-"}</td>
                      <td style={{ padding: "0.7rem", fontWeight: 800 }}>
                        {formatMoney(Number(m.amount) || 0)}
                      </td>
                      <td style={{ padding: "0.7rem" }}>{m.description || m.notes || "-"}</td>
                      <td style={{ padding: "0.7rem", borderRadius: "0 0.6rem 0.6rem 0" }}>
                        {m.movementNumber ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}
