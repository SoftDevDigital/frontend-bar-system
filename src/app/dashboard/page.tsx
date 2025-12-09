"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboardData, getAdminDashboard } from "../lib/api";

type State = {
  loading: boolean;
  error: string | null;
  data: AdminDashboardData | null;
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    data: null,
  });

  // 🔒 GUARD — Solo admin o employee
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("festgo_user");
    const token = localStorage.getItem("festgo_token");

    if (!raw || !token) {
      setAuthorized(false);
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(raw);

      if (user.role === "admin" || user.role === "employee") {
        setAuthorized(true); // OK
      } else {
        setAuthorized(false);
        router.replace("/"); // cliente → afuera
      }
    } catch {
      setAuthorized(false);
      router.replace("/login");
    }
  }, [router]);

  // 📊 Cargar métricas solo cuando está autorizado
  useEffect(() => {
    if (authorized !== true) return; // solo admin/employee

    const fetchData = async () => {
      try {
        const res = await getAdminDashboard();

        if (!res.success) {
          setState({
            loading: false,
            error:
              res.message ||
              "No se pudieron obtener las métricas del dashboard",
            data: null,
          });
          return;
        }

        setState({
          loading: false,
          error: null,
          data: res.data || null,
        });
      } catch (err: any) {
        setState({
          loading: false,
          error:
            err?.message ||
            "Error inesperado al cargar el dashboard de administrador",
          data: null,
        });
      }
    };

    fetchData();
  }, [authorized]);

  const { loading, error, data } = state;

  // Mientras no sepamos si está autorizado
  if (authorized === null) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "1rem",
        }}
      >
        Verificando acceso...
      </main>
    );
  }

  // Si no está autorizado, ya fue redirigido arriba
  if (!authorized) {
    return null;
  }

  // -------------------------------
  // 🔽 Dashboard admin
  // -------------------------------
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
        <header
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.8rem",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              Dashboard administrador
            </h1>
            <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
              Métricas generales del sistema en tiempo real.
            </p>
          </div>
          {data?.message && (
            <span
              style={{
                fontSize: "0.8rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "999px",
                border: "1px solid #1f2937",
                color: "#9ca3af",
              }}
            >
              {data.message}
            </span>
          )}
        </header>

        {loading && (
          <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>
            Cargando métricas...
          </p>
        )}

        {error && !loading && (
          <p
            style={{
              fontSize: "0.9rem",
              color: "#fecaca",
              background: "#450a0a",
              borderRadius: "0.6rem",
              padding: "0.6rem 0.8rem",
              border: "1px solid #b91c1c",
              marginBottom: "1rem",
            }}
          >
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* Tarjetas de métricas */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {/* Ventas */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "0.9rem",
                  border: "1px solid #1f2937",
                  background:
                    "radial-gradient(circle at top left, #0f172a, #020617)",
                }}
              >
                <h2
                  style={{
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#9ca3af",
                    marginBottom: "0.4rem",
                  }}
                >
                  Ventas
                </h2>
                <p style={{ fontSize: "1.4rem", fontWeight: 600 }}>
                  ${data?.sales?.today?.toLocaleString("es-AR") ?? "0"}
                </p>
                <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  Semana: $
                  {data?.sales?.week?.toLocaleString("es-AR") ?? "0"} · Mes: $
                  {data?.sales?.month?.toLocaleString("es-AR") ?? "0"}
                </p>
              </div>

              {/* Reservas */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "0.9rem",
                  border: "1px solid #1f2937",
                  background:
                    "radial-gradient(circle at top left, #0b1120, #020617)",
                }}
              >
                <h2
                  style={{
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#9ca3af",
                    marginBottom: "0.4rem",
                  }}
                >
                  Reservas
                </h2>
                <p style={{ fontSize: "1.4rem", fontWeight: 600 }}>
                  {data?.reservations?.today ?? 0} hoy
                </p>
                <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  Pendientes: {data?.reservations?.pending ?? 0} · Confirmadas:{" "}
                  {data?.reservations?.confirmed ?? 0} · Completadas:{" "}
                  {data?.reservations?.completed ?? 0}
                </p>
              </div>

              {/* Mesas */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "0.9rem",
                  border: "1px solid #1f2937",
                  background:
                    "radial-gradient(circle at top left, #111827, #020617)",
                }}
              >
                <h2
                  style={{
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#9ca3af",
                    marginBottom: "0.4rem",
                  }}
                >
                  Mesas
                </h2>
                <p style={{ fontSize: "1.4rem", fontWeight: 600 }}>
                  {data?.tables?.available ?? 0} disponibles
                </p>
                <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  Ocupadas: {data?.tables?.occupied ?? 0} · Reservadas:{" "}
                  {data?.tables?.reserved ?? 0} · Total:{" "}
                  {data?.tables?.total ?? 0}
                </p>
              </div>

              {/* Clientes */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "0.9rem",
                  border: "1px solid #1f2937",
                  background:
                    "radial-gradient(circle at top left, #0b1120, #020617)",
                }}
              >
                <h2
                  style={{
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#9ca3af",
                    marginBottom: "0.4rem",
                  }}
                >
                  Clientes
                </h2>
                <p style={{ fontSize: "1.4rem", fontWeight: 600 }}>
                  {data?.customers?.total ?? 0} totales
                </p>
                <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  VIP: {data?.customers?.vip ?? 0} · Nuevos hoy:{" "}
                  {data?.customers?.newToday ?? 0}
                </p>
              </div>
            </section>

            {/* Top productos + alertas de inventario */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.4fr)",
                gap: "1.25rem",
                alignItems: "flex-start",
              }}
            >
              {/* Top productos */}
              <div
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid #1f2937",
                  background: "#020617",
                  padding: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    marginBottom: "0.75rem",
                  }}
                >
                  Productos más vendidos
                </h2>
                {data?.topProducts && data.topProducts.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {data.topProducts.map((p, idx) => (
                      <li
                        key={p.name + idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.4rem 0",
                          borderBottom:
                            idx < data.topProducts!.length - 1
                              ? "1px solid #111827"
                              : "none",
                        }}
                      >
                        <span style={{ fontSize: "0.9rem" }}>{p.name}</span>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "#9ca3af",
                          }}
                        >
                          {p.sales} ventas
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                    Todavía no hay datos de productos.
                  </p>
                )}
              </div>

              {/* Alertas inventario */}
              <div
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid #1f2937",
                  background: "#020617",
                  padding: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    marginBottom: "0.75rem",
                  }}
                >
                  Alertas de inventario
                </h2>
                {data?.inventoryAlerts &&
                data.inventoryAlerts.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {data.inventoryAlerts.map((a, idx) => (
                      <li
                        key={a.item + idx}
                        style={{
                          padding: "0.45rem 0",
                          borderBottom:
                            idx < data.inventoryAlerts!.length - 1
                              ? "1px solid #111827"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontSize: "0.9rem" }}>{a.item}</span>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#f97316",
                            }}
                          >
                            Stock: {a.stock} / Mín: {a.minimum}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                    No hay alertas de stock por el momento.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
