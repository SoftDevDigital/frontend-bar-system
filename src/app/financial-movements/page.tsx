"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FinancialMovement,
  getFinancialMovements,
  createFinancialMovement,
  type CreateFinancialMovementPayload,
  type FinancialMovementType,
  getFinancialSummary,
  type FinancialSummaryData,
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

function isValidYMD(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export default function FinancialMovementsPage() {
  // ✅ Solo admin (lo leemos como guardás vos: localStorage "festgo_user")
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("festgo_user");
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      setRole(u?.role ?? null);
    } catch {
      setRole(null);
    }
  }, []);

  const isAdmin = role === "admin";

  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    data: null,
  });

  // ✅ ahora se eligen con calendario (YYYY-MM-DD)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [type, setType] = useState<string>("");

  // ✅ Summary
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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

  const movementTypeOptions: { value: FinancialMovementType; label: string }[] = [
    { value: "INVENTORY_PURCHASE", label: "INVENTORY_PURCHASE — Compras a proveedores" },
    { value: "SALARY_PAYMENT", label: "SALARY_PAYMENT — Pagos de salarios" },
    { value: "UTILITY_PAYMENT", label: "UTILITY_PAYMENT — Pagos de servicios" },
    { value: "TAX_PAYMENT", label: "TAX_PAYMENT — Pagos de impuestos" },
    { value: "EXPENSE", label: "EXPENSE — Gastos generales" },
    { value: "CASH_WITHDRAWAL", label: "CASH_WITHDRAWAL — Retiros de efectivo" },
    { value: "CASH_DEPOSIT", label: "CASH_DEPOSIT — Depósitos de efectivo" },
    { value: "sale", label: "sale — (normalmente automático por facturas)" },
  ];

  const fetchSummary = async () => {
    if (!isAdmin) {
      setSummary(null);
      setSummaryError("Solo Admin puede ver el resumen financiero.");
      return;
    }

    // (type=date ya devuelve YYYY-MM-DD, igual mantenemos validación)
    if (startDate && !isValidYMD(startDate)) {
      setSummaryError("startDate inválida.");
      return;
    }
    if (endDate && !isValidYMD(endDate)) {
      setSummaryError("endDate inválida.");
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const res = await getFinancialSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (!res.success) {
        setSummary(null);
        setSummaryError(res.message || "No se pudo obtener el resumen.");
        return;
      }

      setSummary(res.data ?? null);
    } catch (err: any) {
      setSummary(null);
      setSummaryError(err?.message || "Error de red obteniendo resumen.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchData = async () => {
    if (!isAdmin) {
      setState({
        loading: false,
        error: "Acceso denegado: Solo Admin (JWT requerido).",
        data: null,
      });
      return;
    }

    if (startDate && !isValidYMD(startDate)) {
      setState({ loading: false, error: "startDate inválida.", data: null });
      return;
    }
    if (endDate && !isValidYMD(endDate)) {
      setState({ loading: false, error: "endDate inválida.", data: null });
      return;
    }

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

  const onSubmitCreate = async () => {
    if (!isAdmin) {
      setCreateError("Solo Admin puede registrar movimientos.");
      return;
    }

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

      // refrescar ambos
      fetchData();
      fetchSummary();
    } catch (err: any) {
      setCreateError(err?.message || "Error de red al registrar movimiento");
      setCreating(false);
    }
  };

  const onConsult = async () => {
    await fetchSummary();
    await fetchData();
  };

  const onClear = () => {
    setStartDate("");
    setEndDate("");
    setType("");
    setSummary(null);
    setSummaryError(null);
    setState((s) => ({ ...s, error: null }));
  };

  useEffect(() => {
    if (role) onConsult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: "#020617",
        color: "#e5e7eb",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        Resumen financiero & Movimientos 💳
      </h1>

      {/* Bloque de permisos */}
      {!isAdmin && role && (
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
          Acceso denegado. Tu rol es <strong>{role}</strong>. Esta sección es SOLO ADMIN.
        </div>
      )}

      {/* Filtros */}
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
          <label style={{ fontSize: "0.85rem" }}>Desde</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
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
          <label style={{ fontSize: "0.85rem" }}>Hasta</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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
          <label style={{ fontSize: "0.85rem" }}>Tipo (solo listado)</label>
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
          onClick={onConsult}
          disabled={!isAdmin || summaryLoading || state.loading}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.7rem",
            border: "none",
            background: !isAdmin ? "#64748b" : "#22c55e",
            color: "#022c22",
            fontWeight: 800,
            cursor: !isAdmin ? "not-allowed" : "pointer",
          }}
        >
          {summaryLoading || state.loading ? "Consultando..." : "Consultar"}
        </button>

        <button
          type="button"
          onClick={onClear}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.7rem",
            border: "1px solid #334155",
            background: "transparent",
            color: "#e5e7eb",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Limpiar
        </button>
      </section>

      {/* SUMMARY */}
      <section
        style={{
          background: "#0f172a",
          border: "1px solid #1f2937",
          borderRadius: "0.9rem",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.05rem", fontWeight: 900, marginBottom: "0.5rem" }}>
          Resumen financiero 👑
        </h2>

        {summaryError && (
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
            {summaryError}
          </div>
        )}

        {summaryLoading && <p style={{ color: "#94a3b8" }}>Cargando resumen...</p>}

        {!summaryLoading && !summaryError && !summary && (
          <p style={{ color: "#94a3b8" }}>Sin datos aún. Usá “Consultar” para traer el resumen.</p>
        )}

        {summary && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.8rem",
                marginBottom: "0.9rem",
              }}
            >
              <div style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: "0.8rem", padding: "0.9rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Ingresos</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{formatMoney(summary.totalIncome)}</div>
              </div>

              <div style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: "0.8rem", padding: "0.9rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Gastos</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{formatMoney(summary.totalExpenses)}</div>
              </div>

              <div style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: "0.8rem", padding: "0.9rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Balance</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{formatMoney(summary.netIncome)}</div>
              </div>

              <div style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: "0.8rem", padding: "0.9rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Movimientos</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{summary.count}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
              <div style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: "0.8rem", padding: "0.9rem" }}>
                <div style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Por tipo</div>
                {Object.keys(summary.byType || {}).length === 0 ? (
                  <div style={{ color: "#94a3b8" }}>Sin datos</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                    {Object.entries(summary.byType).map(([k, v]) => (
                      <li key={k}>
                        <strong>{k}:</strong> {formatMoney(Number(v) || 0)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: "0.8rem", padding: "0.9rem" }}>
                <div style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Por categoría</div>
                {Object.keys(summary.byCategory || {}).length === 0 ? (
                  <div style={{ color: "#94a3b8" }}>Sin datos</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                    {Object.entries(summary.byCategory).map(([k, v]) => (
                      <li key={k}>
                        <strong>{k}:</strong> {formatMoney(Number(v) || 0)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Registrar movimiento */}
      <section
        style={{
          background: "#0f172a",
          border: "1px solid #1f2937",
          borderRadius: "0.9rem",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.05rem", fontWeight: 900, marginBottom: "0.75rem" }}>
          Registrar gasto / movimiento 👑
        </h2>

        {createError && (
          <div style={{ background: "#450a0a", border: "1px solid #b91c1c", padding: "0.75rem", borderRadius: "0.75rem", marginBottom: "0.75rem", color: "#fecaca" }}>
            {createError}
          </div>
        )}

        {createSuccess && (
          <div style={{ background: "#052e16", border: "1px solid #16a34a", padding: "0.75rem", borderRadius: "0.75rem", marginBottom: "0.75rem", color: "#bbf7d0" }}>
            {createSuccess}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FinancialMovementType }))}
              style={{ padding: "0.55rem 0.75rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" }}
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
              onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value || 0) }))}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Método de pago</label>
            <input
              value={form.paymentMethod ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Categoría</label>
            <input
              value={form.category ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Subcategoría</label>
            <input
              value={form.subcategory ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Descripción</label>
            <input
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Notas (opcional)</label>
            <input
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={onSubmitCreate}
              disabled={!isAdmin || creating}
              style={{
                padding: "0.65rem 1.1rem",
                borderRadius: "0.7rem",
                border: "none",
                background: !isAdmin ? "#64748b" : creating ? "#64748b" : "#f59e0b",
                color: "#111827",
                fontWeight: 900,
                cursor: !isAdmin ? "not-allowed" : creating ? "not-allowed" : "pointer",
              }}
            >
              {creating ? "Registrando..." : "Registrar movimiento"}
            </button>
          </div>
        </div>
      </section>

      {/* Movimientos */}
      {state.loading && <p style={{ color: "#94a3b8" }}>Cargando movimientos...</p>}

      {state.error && !state.loading && (
        <div style={{ background: "#450a0a", border: "1px solid #b91c1c", padding: "0.75rem", borderRadius: "0.75rem", marginBottom: "1rem", color: "#fecaca" }}>
          {state.error}
        </div>
      )}

      {!state.loading && !state.error && (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: "0.9rem", padding: "1rem" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Movimientos</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: "0.25rem" }}>
                {state.data?.length ?? 0}
              </div>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: "0.9rem", padding: "1rem" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Suma montos (listado)</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: "0.25rem" }}>
                {formatMoney(totalAmount)}
              </div>
            </div>
          </section>

          <section style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: "0.9rem", padding: "1rem", overflowX: "auto" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.75rem" }}>Listado</h2>

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
                      <td style={{ padding: "0.7rem", borderRadius: "0.6rem 0 0 0.6rem" }}>{formatDate(m.createdAt)}</td>
                      <td style={{ padding: "0.7rem" }}>{m.type ?? "-"}</td>
                      <td style={{ padding: "0.7rem" }}>{m.category ?? "-"}</td>
                      <td style={{ padding: "0.7rem" }}>{m.subcategory ?? "-"}</td>
                      <td style={{ padding: "0.7rem" }}>{m.paymentMethod ?? "-"}</td>
                      <td style={{ padding: "0.7rem", fontWeight: 900 }}>{formatMoney(Number(m.amount) || 0)}</td>
                      <td style={{ padding: "0.7rem" }}>{m.description || m.notes || "-"}</td>
                      <td style={{ padding: "0.7rem", borderRadius: "0 0.6rem 0.6rem 0" }}>{m.movementNumber ?? "-"}</td>
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
