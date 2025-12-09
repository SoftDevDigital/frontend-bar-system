"use client";

import { useEffect, useState, FormEvent } from "react";
import { getWaitlist, type WaitlistEntry } from "../lib/api";

// 👉 tipo de rol
type UserRole = "admin" | "employee" | "customer" | string | null;

export default function WaitlistPage() {
  const [date, setDate] = useState("");
  const [stats, setStats] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  // ⭐ auth / rol
  const [role, setRole] = useState<UserRole>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // leer usuario de localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("festgo_user");
    if (!raw) {
      setRole(null);
      setAuthChecked(true);
      return;
    }

    try {
      const user = JSON.parse(raw) as { role?: string };
      setRole(user.role ?? null);
    } catch {
      setRole(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const isStaff = role === "admin" || role === "employee";

  const loadWaitlist = async () => {
    // si por algún motivo se llama sin ser staff, evitamos la llamada
    if (!isStaff) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await getWaitlist({
        date: date || undefined,
        stats,
      });

      if (res.success && res.data?.data) {
        setWaitlist(res.data.data);
      } else {
        setWaitlist([]);
        setErrorMsg(res.message || "No se pudo cargar la lista de espera");
      }
    } catch (err: any) {
      setWaitlist([]);
      setErrorMsg(err?.message || "Error inesperado al cargar la waitlist");
    } finally {
      setLoading(false);
    }
  };

  // cargar solo cuando ya sé el rol y es staff
  useEffect(() => {
    if (!authChecked) return;
    if (!isStaff) return;
    loadWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, isStaff]);

  const handleFilters = (e: FormEvent) => {
    e.preventDefault();
    loadWaitlist();
  };

  const handleClear = () => {
    setDate("");
    setStats(false);
    loadWaitlist();
  };

  // ===== GUARD POR ROL =====

  if (!authChecked) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Verificando permisos...
      </main>
    );
  }

  if (!isStaff) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: "480px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>
            Lista de espera – FestGo Bar
          </h1>
          <p style={{ color: "#f97316" }}>
            Esta sección de lista de espera es solo para el staff del bar
            (admin / employee).
          </p>
        </div>
      </main>
    );
  }

  // ===== VISTA NORMAL STAFF =====

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
      <div style={{ width: "100%", maxWidth: "900px" }}>
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 600,
            marginBottom: "0.3rem",
          }}
        >
          Lista de Espera
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "#9ca3af",
            marginBottom: "1.5rem",
          }}
        >
          Ver y filtrar la lista de espera del día.
        </p>

        {/* Filtros */}
        <section
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            borderRadius: "0.9rem",
            border: "1px solid #1f2937",
            background: "#020617",
          }}
        >
          <form
            onSubmit={handleFilters}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr) auto",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  color: "#9ca3af",
                }}
              >
                Fecha (YYYY-MM-DD)
              </label>
              <input
                type="text"
                placeholder="2025-11-20"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  color: "#9ca3af",
                }}
              >
                Estadísticas (true/false)
              </label>
              <select
                value={String(stats)}
                onChange={(e) => setStats(e.target.value === "true")}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "0.7rem",
                border: "none",
                background: loading ? "#6ee7b7" : "#22c55e",
                color: "#022c22",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "Cargando..." : "Filtrar"}
            </button>

            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: "0.6rem 0.9rem",
                borderRadius: "0.7rem",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.85rem",
              }}
            >
              Limpiar
            </button>
          </form>
        </section>

        {/* Mensajes */}
        {errorMsg && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.7rem",
              background: "#450a0a",
              border: "1px solid #b91c1c",
              fontSize: "0.9rem",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Tabla */}
        <section
          style={{
            borderRadius: "0.9rem",
            border: "1px solid #1f2937",
            overflow: "hidden",
            background: "#020617",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#020617",
                  borderBottom: "1px solid #111827",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "0.6rem 1rem" }}>Cliente</th>
                <th style={{ padding: "0.6rem 1rem" }}>Teléfono</th>
                <th style={{ padding: "0.6rem 1rem" }}>Personas</th>
                <th style={{ padding: "0.6rem 1rem" }}>Hora ingreso</th>
                <th style={{ padding: "0.6rem 1rem" }}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    No hay personas en la lista de espera.
                  </td>
                </tr>
              ) : (
                waitlist.map((w) => (
                  <tr
                    key={w.id}
                    style={{
                      borderBottom: "1px solid #111827",
                    }}
                  >
                    <td style={{ padding: "0.6rem 1rem" }}>
                      {w.customerName}
                    </td>
                    <td style={{ padding: "0.6rem 1rem" }}>
                      {w.customerPhone}
                    </td>
                    <td style={{ padding: "0.6rem 1rem" }}>{w.partySize}</td>
                    <td style={{ padding: "0.6rem 1rem" }}>
                      {new Date(w.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ padding: "0.6rem 1rem" }}>
                      {w.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
