"use client";

import { useState, FormEvent, useEffect } from "react";
import { createReservation, type CreateReservationPayload } from "@/app/lib/api";

export default function NewReservationPage() {
  // ✅ form SOLO con campos que existen en CreateReservationPayload
  const [form, setForm] = useState<CreateReservationPayload>({
    partySize: 2,
    reservationDate: "",
    reservationTime: "",
  });

  // ✅ notes separado (porque el type no lo trae)
  const [notes, setNotes] = useState<string>("");

  // ✅ customerId si el usuario logueado es "customer"
  const [customerId, setCustomerId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("festgo_user");
    if (!raw) {
      setCustomerId(null);
      return;
    }

    try {
      const user = JSON.parse(raw) as { userId?: string; role?: string };
      if (user.userId && user.role === "customer") {
        setCustomerId(user.userId);
      } else {
        setCustomerId(null);
      }
    } catch {
      setCustomerId(null);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // ✅ payload base tipado correcto
      const basePayload: CreateReservationPayload = {
        partySize: Number(form.partySize),
        reservationDate: form.reservationDate,
        reservationTime: form.reservationTime,
      };

      // ✅ armamos extras SIN romper el build aunque el type no los tenga
      const extra: { notes?: string; customerId?: string } = {};
      const cleanNotes = notes.trim();
      if (cleanNotes) extra.notes = cleanNotes;
      if (customerId) extra.customerId = customerId;

      // ✅ payload final: intersección de tipos (no falla el build)
      const payload = {
        ...basePayload,
        ...extra,
      } as CreateReservationPayload & { notes?: string; customerId?: string };

      const res = await createReservation(payload);

      if (res.success && res.data) {
        const created = (res.data as any).data ?? (res.data as any); // por si tu backend envuelve data
        setSuccessMsg(
          `Reserva creada correctamente. Código de confirmación: ${created?.confirmationCode ?? "—"}`
        );

        // reset suave
        setForm((prev) => ({
          ...prev,
          partySize: 2,
          reservationTime: "",
        }));
        setNotes("");
      } else {
        setErrorMsg(res.message || "No se pudo crear la reserva. Revisá los datos.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error inesperado al crear la reserva.");
    } finally {
      setLoading(false);
    }
  };

  const isLoggedCustomer = Boolean(customerId);

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
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <header
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Reservar mesa</h1>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Elegí fecha, horario y cantidad de personas para tu visita.
          </p>

          <p
            style={{
              fontSize: "0.8rem",
              color: "#6b7280",
              marginTop: "0.25rem",
            }}
          >
            Estás reservando como{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 500 }}>
              {isLoggedCustomer
                ? "cliente registrado (historial guardado)"
                : "visitante (sin historial)"}
            </span>
            .
          </p>
        </header>

        <section
          style={{
            background: "#020617",
            borderRadius: "0.9rem",
            border: "1px solid #1f2937",
            padding: "1.25rem",
          }}
        >
          {errorMsg && (
            <p
              style={{
                marginBottom: "0.75rem",
                fontSize: "0.85rem",
                color: "#fecaca",
                background: "#450a0a",
                borderRadius: "0.6rem",
                padding: "0.5rem 0.75rem",
                border: "1px solid #b91c1c",
              }}
            >
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p
              style={{
                marginBottom: "0.75rem",
                fontSize: "0.85rem",
                color: "#bbf7d0",
                background: "#064e3b",
                borderRadius: "0.6rem",
                padding: "0.5rem 0.75rem",
                border: "1px solid #16a34a",
              }}
            >
              {successMsg}
            </p>
          )}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.9rem" }}>
            {/* Fecha */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Fecha
              </label>
              <input
                type="date"
                value={form.reservationDate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    reservationDate: e.target.value,
                  }))
                }
                required
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                }}
              />
            </div>

            {/* Hora */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Hora
              </label>
              <input
                type="time"
                value={form.reservationTime}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    reservationTime: e.target.value,
                  }))
                }
                required
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                }}
              />
            </div>

            {/* Personas */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Personas
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.partySize}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    partySize: Number(e.target.value),
                  }))
                }
                required
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                }}
              />
            </div>

            {/* Notas */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Notas (opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: mesa cerca de la ventana…"
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "0.5rem",
                width: "100%",
                padding: "0.7rem 1rem",
                borderRadius: "0.7rem",
                border: "none",
                background: loading ? "#6ee7b7" : "#22c55e",
                color: "#022c22",
                fontWeight: 600,
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "Creando reserva..." : "Confirmar reserva"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
