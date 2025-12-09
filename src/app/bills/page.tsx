// src/app/bills/page.tsx
"use client";

import { useState } from "react";
import { getBills, Bill } from "../lib/api";

export default function BillsPage() {
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFetch = async () => {
    setLoading(true);
    setErrorMsg("");
    setBills([]);

    try {
      const res = await getBills({
        date: date || undefined,
        paymentMethod: paymentMethod || undefined,
        status: status || undefined,
        limit,
        page,
      });

      if (res.success && res.data) {
        setBills(res.data);
      } else {
        setErrorMsg(res.message || "Error desconocido");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado");
    }

    setLoading(false);
  };

  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "white" }}>
      <main
        style={{
          padding: "2rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          💳 Facturas (Bills)
        </h1>

        {/* Controles */}
        <div
          style={{
            background: "#1e293b",
            padding: "1rem",
            borderRadius: "0.75rem",
            marginBottom: "1.5rem",
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          }}
        >
          <div>
            <label htmlFor="date-input">Fecha</label>
            <input
              id="date-input"
              type="date"              // 👈 ahora abre el calendario nativo
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.4rem",
                background: "white",
                color: "black",
              }}
            />
          </div>

          <div>
            <label>Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: "100%", padding: "0.4rem" }}
            >
              <option value="">(Todos)</option>
              <option value="cash">cash</option>
              <option value="card">card</option>
            </select>
          </div>

          <div>
            <label>Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%", padding: "0.4rem" }}
            >
              <option value="">(Todos)</option>
              <option value="paid">paid</option>
              <option value="pending">pending</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div>
            <label>Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ width: "100%", padding: "0.4rem" }}
            />
          </div>

          <div>
            <label>Page</label>
            <input
              type="number"
              value={page}
              onChange={(e) => setPage(Number(e.target.value))}
              style={{ width: "100%", padding: "0.4rem" }}
            />
          </div>

          <button
            onClick={handleFetch}
            style={{
              padding: "0.8rem",
              background: "#22c55e",
              borderRadius: "0.6rem",
              fontWeight: "bold",
            }}
          >
            {loading ? "Buscando..." : "Buscar facturas"}
          </button>
        </div>

        {errorMsg && <p style={{ color: "#f87171" }}>{errorMsg}</p>}

        {/* LISTADO DE BILLS */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {bills.map((b) => (
            <div
              key={b.id}
              style={{
                background: "#1e293b",
                padding: "1rem",
                borderRadius: "0.75rem",
              }}
            >
              <h3>Factura #{b.id}</h3>
              <p>
                <strong>Pedido:</strong> {b.orderId}
              </p>
              <p>
                <strong>Mesa:</strong> #{b.tableNumber}
              </p>
              <p>
                <strong>Subtotal:</strong> ${b.subtotal}
              </p>
              <p>
                <strong>Impuesto (tax):</strong> ${b.tax}
              </p>
              <p>
                <strong>Propina (tip):</strong> ${b.tip}
              </p>
              <p>
                <strong>Total:</strong> ${b.total}
              </p>
              <p>
                <strong>Método de pago:</strong> {b.paymentMethod}
              </p>
              <p>
                <strong>Estado:</strong> {b.status}
              </p>
              <p>
                <strong>Creada:</strong>{" "}
                {new Date(b.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
