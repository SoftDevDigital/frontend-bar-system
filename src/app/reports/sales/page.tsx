"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSalesReport,
  type SalesReportData,
  type SalesReportBillItem,
  type SalesReportPaymentMethodItem,
  type SalesReportTopProductItem,
} from "@/app/lib/api";

function formatMoney(n?: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
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

function getTodayYMD() {
  const d = new Date();
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFirstDayOfMonth() {
  const d = new Date();
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}-01`;
}

export default function SalesReportsPage() {
  const [role, setRole] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(getTodayYMD());
  const [groupBy, setGroupBy] = useState<string>("all");
  const [consumptionType, setConsumptionType] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SalesReportData | null>(null);

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

  const fetchReport = async () => {
    if (!isAdmin) {
      setLoading(false);
      setError("Acceso denegado: solo Admin puede ver este reporte.");
      setReport(null);
      return;
    }

    if (startDate && !isValidYMD(startDate)) {
      setError("startDate inválida.");
      return;
    }

    if (endDate && !isValidYMD(endDate)) {
      setError("endDate inválida.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getSalesReport({
        startDate,
        endDate,
        groupBy: groupBy || undefined,
        consumptionType: consumptionType || undefined,
      });

      if (!res.success) {
        setReport(null);
        setError(res.message || "No se pudo obtener el reporte de ventas.");
        return;
      }

      setReport(res.data ?? null);
    } catch (err: any) {
      setReport(null);
      setError(err?.message || "Error de red obteniendo reporte.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const totalPaymentMethods = useMemo(() => {
    return (report?.byPaymentMethod ?? []).reduce(
      (acc, item) => acc + Number(item.amount || 0),
      0
    );
  }, [report]);

  const onClear = () => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getTodayYMD());
    setGroupBy("all");
    setConsumptionType("all");
    setError(null);
    setReport(null);
  };

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
        Reporte de ventas 📊
      </h1>

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
          Acceso denegado. Tu rol es <strong>{role}</strong>. Esta sección es
          SOLO ADMIN.
        </div>
      )}

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
          <label style={{ fontSize: "0.85rem" }}>Agrupar por</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            style={{
              minWidth: "180px",
              padding: "0.55rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          >
            <option value="all">all</option>
            <option value="day">day</option>
            <option value="week">week</option>
            <option value="month">month</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.85rem" }}>Tipo de consumo</label>
          <select
            value={consumptionType}
            onChange={(e) => setConsumptionType(e.target.value)}
            style={{
              minWidth: "180px",
              padding: "0.55rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          >
            <option value="all">all</option>
            <option value="food">food</option>
            <option value="drink">drink</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchReport}
          disabled={!isAdmin || loading}
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
          {loading ? "Consultando..." : "Consultar"}
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

      {error && (
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
          {error}
        </div>
      )}

      {loading && <p style={{ color: "#94a3b8" }}>Cargando reporte...</p>}

      {!loading && !error && !report && (
        <p style={{ color: "#94a3b8" }}>Sin datos para mostrar.</p>
      )}

      {!loading && !error && report && (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <Card title="Ventas totales" value={formatMoney(report.sales.totalSales)} />
            <Card title="Ventas netas" value={formatMoney(report.sales.netSales)} />
            <Card title="Facturas" value={String(report.sales.numberOfBills || 0)} />
            <Card title="Ticket promedio" value={formatMoney(report.sales.averageBill)} />
            <Card title="Ingresos" value={formatMoney(report.financial.totalIncome)} />
            <Card title="Gastos" value={formatMoney(report.financial.totalExpenses)} />
            <Card title="Ganancia neta" value={formatMoney(report.financial.netIncome)} />
            <Card title="Movimientos" value={String(report.financial.totalMovements || 0)} />
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <Box title="Período">
              <p><strong>Desde:</strong> {report.period?.startDate || "-"}</p>
              <p><strong>Hasta:</strong> {report.period?.endDate || "-"}</p>
              <p><strong>Group by:</strong> {report.period?.groupBy || "-"}</p>
              <p><strong>Filtro consumo:</strong> {report.consumptionTypeFilter || "all"}</p>
            </Box>

            <Box title="Ventas por tipo de consumo">
              <p><strong>Food:</strong> {formatMoney(report.salesByConsumptionType?.food)}</p>
              <p><strong>Drink:</strong> {formatMoney(report.salesByConsumptionType?.drink)}</p>
              <p><strong>Other:</strong> {formatMoney(report.salesByConsumptionType?.other)}</p>
              <p><strong>Total:</strong> {formatMoney(report.salesByConsumptionType?.total)}</p>
            </Box>

            <Box title="Detalle de ventas">
              <p><strong>Impuestos:</strong> {formatMoney(report.sales.totalTax)}</p>
              <p><strong>Descuentos:</strong> {formatMoney(report.sales.totalDiscounts)}</p>
              <p><strong>Propinas:</strong> {formatMoney(report.sales.totalTips)}</p>
            </Box>

            <Box title="Resumen financiero">
              <p><strong>Total income:</strong> {formatMoney(report.financial.totalIncome)}</p>
              <p><strong>Total expenses:</strong> {formatMoney(report.financial.totalExpenses)}</p>
              <p><strong>Net income:</strong> {formatMoney(report.financial.netIncome)}</p>
            </Box>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <Box title="Movimientos por tipo">
              {Object.keys(report.financial.movementsByType || {}).length === 0 ? (
                <p style={{ color: "#94a3b8" }}>Sin datos</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                  {Object.entries(report.financial.movementsByType).map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}:</strong> {formatMoney(Number(v) || 0)}
                    </li>
                  ))}
                </ul>
              )}
            </Box>

            <Box title="Movimientos por categoría">
              {Object.keys(report.financial.movementsByCategory || {}).length === 0 ? (
                <p style={{ color: "#94a3b8" }}>Sin datos</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                  {Object.entries(report.financial.movementsByCategory).map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}:</strong> {formatMoney(Number(v) || 0)}
                    </li>
                  ))}
                </ul>
              )}
            </Box>
          </section>

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
              Ventas por método de pago
            </h2>

            {report.byPaymentMethod.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>Sin datos</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "left" }}>
                    <th>Método</th>
                    <th>Monto</th>
                    <th>Cantidad</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byPaymentMethod.map((item: SalesReportPaymentMethodItem, idx) => (
                    <tr key={`${item.paymentMethod}-${idx}`} style={{ background: "#0b1220" }}>
                      <td style={{ padding: "0.7rem", borderRadius: "0.6rem 0 0 0.6rem" }}>
                        {item.paymentMethod || "-"}
                      </td>
                      <td style={{ padding: "0.7rem", fontWeight: 800 }}>
                        {formatMoney(item.amount)}
                      </td>
                      <td style={{ padding: "0.7rem" }}>{item.count ?? "-"}</td>
                      <td style={{ padding: "0.7rem", borderRadius: "0 0.6rem 0.6rem 0" }}>
                        {item.percentage !== undefined ? `${item.percentage}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: "0.75rem", color: "#94a3b8" }}>
              Total métodos de pago: <strong style={{ color: "#e5e7eb" }}>{formatMoney(totalPaymentMethods)}</strong>
            </div>
          </section>

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
              Top productos
            </h2>

            {report.topProducts.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>Sin productos en el período.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "left" }}>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Total vendido</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((item: SalesReportTopProductItem, idx) => (
                    <tr key={`${item.productId || item.name || idx}`} style={{ background: "#0b1220" }}>
                      <td style={{ padding: "0.7rem", borderRadius: "0.6rem 0 0 0.6rem" }}>
                        {item.productName || item.name || "-"}
                      </td>
                      <td style={{ padding: "0.7rem" }}>{item.quantitySold ?? "-"}</td>
                      <td style={{ padding: "0.7rem" }}>{item.totalSold ?? "-"}</td>
                      <td style={{ padding: "0.7rem", borderRadius: "0 0.6rem 0.6rem 0", fontWeight: 800 }}>
                        {formatMoney(item.totalRevenue ?? item.amount ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section
            style={{
              background: "#0f172a",
              border: "1px solid #1f2937",
              borderRadius: "0.9rem",
              padding: "1rem",
              overflowX: "auto",
            }}
          >
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.75rem" }}>
              Facturas
            </h2>

            {report.bills.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>Sin facturas en el período.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "left" }}>
                    <th>Fecha</th>
                    <th>Nro factura</th>
                    <th>Método</th>
                    <th>Subtotal</th>
                    <th>Impuestos</th>
                    <th>Propina</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bills.map((bill: SalesReportBillItem, idx) => (
                    <tr key={`${bill.id || bill.billId || idx}`} style={{ background: "#0b1220" }}>
                      <td style={{ padding: "0.7rem", borderRadius: "0.6rem 0 0 0.6rem" }}>
                        {formatDate(bill.createdAt)}
                      </td>
                      <td style={{ padding: "0.7rem" }}>{bill.billNumber || bill.billId || "-"}</td>
                      <td style={{ padding: "0.7rem" }}>{bill.paymentMethod || "-"}</td>
                      <td style={{ padding: "0.7rem" }}>{formatMoney(bill.subtotal)}</td>
                      <td style={{ padding: "0.7rem" }}>{formatMoney(bill.tax)}</td>
                      <td style={{ padding: "0.7rem" }}>{formatMoney(bill.tip)}</td>
                      <td style={{ padding: "0.7rem", fontWeight: 900 }}>
                        {formatMoney(bill.total ?? bill.totalAmount)}
                      </td>
                      <td style={{ padding: "0.7rem", borderRadius: "0 0.6rem 0.6rem 0" }}>
                        {bill.status || "-"}
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

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1f2937",
        borderRadius: "0.9rem",
        padding: "1rem",
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{title}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: "0.25rem" }}>
        {value}
      </div>
    </div>
  );
}

function Box({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1f2937",
        borderRadius: "0.9rem",
        padding: "1rem",
      }}
    >
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.75rem" }}>
        {title}
      </h2>
      <div style={{ display: "grid", gap: "0.45rem" }}>{children}</div>
    </div>
  );
}