"use client";

import { useState, useEffect } from "react";
import { getOrders, Order, getTables, Table } from "../lib/api";

// mismo tipo que en TopNav
type UserRole = "admin" | "employee" | "customer" | string | null;

export default function OrdersPage() {
  // 👉 control de permisos
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

  // 👉 ESTADOS DE FILTROS
  const [status, setStatus] = useState("");
  const [tableId, setTableId] = useState("");
  const [date, setDate] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  // 👉 tablas cargadas para el select
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // 👉 carga de mesas
  useEffect(() => {
    async function fetchTables() {
      setLoadingTables(true);
      try {
        const res = await getTables();
        if (res.success && res.data) {
          setTables(res.data);
        }
      } catch {
        console.error("Error cargando mesas");
      }
      setLoadingTables(false);
    }
    fetchTables();
  }, []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFetch = async () => {
    setLoading(true);
    setErrorMsg("");
    setOrders([]);

    try {
      const res = await getOrders({
        status: status || undefined,
        tableId: tableId || undefined,
        date: date || undefined,
        limit,
        page,
      });

      if (res.success && res.data) {
        setOrders(res.data);
      } else {
        setErrorMsg(res.message || "Error desconocido");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado");
    }

    setLoading(false);
  };

  // LOADING PERMISOS
  if (checkingRole) {
    return (
      <main style={{ padding: "2rem", color: "white", background: "#0f172a", minHeight: "100vh" }}>
        <h1 style={{ fontSize: "2rem" }}>🧾 Pedidos (Orders)</h1>
        <p style={{ color: "#9ca3af" }}>Cargando permisos...</p>
      </main>
    );
  }

  // NO STAFF
  if (!isStaff) {
    return (
      <main style={{ padding: "2rem", color: "white", background: "#0f172a", minHeight: "100vh" }}>
        <h1 style={{ fontSize: "2rem" }}>🧾 Pedidos (Orders)</h1>
        <p style={{ color: "#f87171", maxWidth: "520px" }}>
          No tenés permisos para ver esta página.
        </p>
      </main>
    );
  }

  // ✅ STAFF VIEW
  return (
    <main style={{ padding: "2rem", color: "white", background: "#0f172a", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>🧾 Pedidos (Orders)</h1>

      {/* FILTROS */}
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
        {/* STATUS */}
        <div>
          <label>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", padding: "0.4rem" }}>
            <option value="">(Todos)</option>
            <option value="pending">pending</option>
            <option value="preparing">preparing</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>

        {/* SELECT DE MESAS */}
        <div>
          <label>ID Mesa (tableId)</label>
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            style={{ width: "100%", padding: "0.4rem" }}
            disabled={loadingTables}
          >
            <option value="">(Todas)</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Mesa #{t.number} — {t.location}
              </option>
            ))}
          </select>
        </div>

        {/* FECHA DATEPICKER */}
        <div>
          <label>Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </div>

        {/* LIMIT */}
        <div>
          <label>Limit</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </div>

        {/* PAGE */}
        <div>
          <label>Page</label>
          <input
            type="number"
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </div>

        {/* BOTÓN */}
        <button
          onClick={handleFetch}
          style={{
            padding: "0.8rem",
            background: "#3b82f6",
            borderRadius: "0.6rem",
            fontWeight: "bold",
          }}
        >
          {loading ? "Buscando..." : "Buscar pedidos"}
        </button>
      </div>

      {errorMsg && <p style={{ color: "#f87171" }}>{errorMsg}</p>}

      {/* LISTA DE PEDIDOS */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {orders.map((o) => (
          <div key={o.id} style={{ background: "#1e293b", padding: "1rem", borderRadius: "0.75rem" }}>
            <h3>Pedido #{o.id}</h3>
            <p><strong>Mesa:</strong> #{o.tableNumber}</p>
            <p><strong>Estado:</strong> {o.status}</p>
            <p><strong>Total:</strong> ${o.total}</p>
            <p><strong>Creado:</strong> {new Date(o.createdAt).toLocaleString()}</p>

            <h4>Items:</h4>
            <ul>
              {o.items.map((it, idx) => (
                <li key={idx}>
                  {it.productName} x{it.quantity} — ${it.subtotal}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
