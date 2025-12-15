"use client";

import { useEffect, useMemo, useState } from "react";
import { FinancialSummaryData, getFinancialSummary } from "../lib/api";

// ✅ Envelope posible: { data: FinancialSummaryData }
type FinancialSummaryEnvelope = {
  data: FinancialSummaryData;
  success?: boolean;
  statusCode?: number;
  message?: string;
  timestamp?: string;
  executionTime?: string;
};

type State = {
  loading: boolean;
  error: string | null;
  data: FinancialSummaryData | null;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

// ✅ Type guards (evita casts peligrosos y arregla el build)
function isEnvelope(x: unknown): x is FinancialSummaryEnvelope {
  return !!x && typeof x === "object" && "data" in x && !!(x as any).data;
}

function isFinancialSummaryData(x: unknown): x is FinancialSummaryData {
  return (
    !!x &&
    typeof x === "object" &&
    "totalIncome" in x &&
    "totalExpenses" in x &&
    "netIncome" in x &&
    "byType" in x &&
    "byCategory" in x &&
    "count" in x
  );
}

export default function FinancialSummaryPage() {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    data: null,
  });

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const byTypeEntries = useMemo(() => {
    const bt = state.data?.byType ?? {};
    return Object.entries(bt).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  }, [state.data]);

  const byCategoryEntries = useMemo(() => {
    const bc = state.data?.byCategory ?? {};
    return Object.entries(bc).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  }, [state.data]);

  const fetchData = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const res = await getFinancialSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (!res.success || !res.data) {
        setState({
          loading: false,
          error: res.message || "No se pudo obtener el resumen financiero",
          data: null,
        });
        return;
      }

      // ✅ Soporta:
      // - res.data = FinancialSummaryData
      // - res.data = { data: FinancialSummaryData }
      const raw = res.data as unknown;

      let payload: FinancialSummaryData | null = null;

      if (isEnvelope(raw) && isFinancialSummaryData(raw.data)) {
        payload = raw.data;
      } else if (isFinancialSummaryData(raw)) {
        payload = raw;
      }

      if (!payload) {
        setState({
          loading: false,
          error: "Formato de respuesta inesperado en /financial-movements/summary",
          data: null,
        });
        return;
      }

      setState({
        loading: false,
        error: null,
        data: payload,
      });
    } catch (err: any) {
      setState({
        loading: false,
        error: err?.message || "Error de red",
        data: null,
      });
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
        Resumen financiero 💰
      </h1>

      <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: "1rem" }}>
        Solo Admin • JWT requerido • Endpoint: /financial-movements/summary
      </p>

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
      {state.loading && <p>Cargando resumen...</p>}

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

      {/* Data */}
      {!state.loading && !state.error && state.data && (
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
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Total ingresos</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem" }}>
                {formatMoney(state.data.totalIncome)}
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
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Total gastos</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem" }}>
                {formatMoney(state.data.totalExpenses)}
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
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Neto</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem" }}>
                {formatMoney(state.data.netIncome)}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.35rem" }}>
                Movimientos: <strong>{state.data.count}</strong>
              </div>
            </div>
          </section>

          {/* Desgloses */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1rem",
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
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                Por tipo
              </h2>

              {byTypeEntries.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>Sin datos</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
                  {byTypeEntries.map(([k, v]) => (
                    <li
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        border: "1px solid #1f2937",
                        borderRadius: "0.75rem",
                        padding: "0.6rem 0.75rem",
                      }}
                    >
                      <span style={{ color: "#e5e7eb" }}>{k}</span>
                      <strong>{formatMoney(v)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1f2937",
                borderRadius: "0.9rem",
                padding: "1rem",
              }}
            >
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                Por categoría
              </h2>

              {byCategoryEntries.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>Sin datos</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
                  {byCategoryEntries.map(([k, v]) => (
                    <li
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        border: "1px solid #1f2937",
                        borderRadius: "0.75rem",
                        padding: "0.6rem 0.75rem",
                      }}
                    >
                      <span style={{ color: "#e5e7eb" }}>{k}</span>
                      <strong>{formatMoney(v)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
