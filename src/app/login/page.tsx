"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const payload = {
        email: email.trim(),
        password: password.trim(),
      };

      const res = await loginUser(payload);

      if (res.success && res.data?.access_token && res.data.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("festgo_token", res.data.access_token);
          localStorage.setItem("festgo_user", JSON.stringify(res.data.user));

          // 🔔 avisar al TopNav (y a quien lo escuche) que cambió la auth
          window.dispatchEvent(new Event("festgo-auth-change"));
        }

        const role = res.data.user.role;

        if (role === "admin" || role === "employee") {
          router.push("/bills");
        } else if (role === "customer") {
          router.push("/customer");
        } else {
          router.push("/");
        }
      } else {
        if (res.validationErrors?.email) {
          setErrorMsg(res.validationErrors.email);
        } else if (res.validationErrors?.password) {
          setErrorMsg(res.validationErrors.password);
        } else {
          setErrorMsg(res.message || "Error al iniciar sesión");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al iniciar sesión");
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
        background: "#020617",
        color: "#e5e7eb",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
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
          Login – FestGo Bar
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "#9ca3af",
            marginBottom: "1.5rem",
          }}
        >
          Ingresá con tu email y contraseña.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: "0.9rem" }}
        >
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
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
