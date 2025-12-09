// src/app/register/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { registerUser } from "../lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await registerUser({ name, email, password });

      if (res.success && res.data?.access_token) {
        // ✅ Guardamos token y usuario (login automático)
        if (typeof window !== "undefined") {
          localStorage.setItem("festgo_token", res.data.access_token);
          localStorage.setItem("festgo_user", JSON.stringify(res.data.user));
        }

        setSuccessMsg("Usuario registrado correctamente ✅");

        // Más adelante podés redirigir:
        // window.location.href = "/tables";
      } else {
        if (res.validationErrors?.email) {
          setErrorMsg(res.validationErrors.email);
        } else if (res.validationErrors?.password) {
          setErrorMsg(res.validationErrors.password);
        } else {
          setErrorMsg(res.message || "Error al registrar");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#020617",
          borderRadius: "1rem",
          padding: "2rem",
          border: "1px solid #1f2937",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Registro – FestGo Bar
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "#9ca3af",
            marginBottom: "1.5rem",
          }}
        >
          Crea tu usuario para empezar a usar el sistema.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.9rem" }}>
          <div>
            <label
              style={{
                fontSize: "0.85rem",
                marginBottom: "0.25rem",
                display: "block",
              }}
            >
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: "0.85rem",
                marginBottom: "0.25rem",
                display: "block",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: "0.85rem",
                marginBottom: "0.25rem",
                display: "block",
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "0.6rem",
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                outline: "none",
              }}
            />
          </div>

          {errorMsg && (
            <p
              style={{
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
                fontSize: "0.85rem",
                color: "#bbf7d0",
                background: "#052e16",
                borderRadius: "0.6rem",
                padding: "0.5rem 0.75rem",
                border: "1px solid #16a34a",
              }}
            >
              {successMsg}
            </p>
          )}

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
            {loading ? "Registrando..." : "Crear cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}
