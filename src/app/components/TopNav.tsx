"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

type UserRole = "admin" | "employee" | "customer" | string | null;

export default function TopNav() {
  const [role, setRole] = useState<UserRole>(null);
  const router = useRouter();
  const pathname = usePathname();

  // 👇 función reutilizable para leer el rol desde localStorage
  const readRoleFromStorage = () => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("festgo_user");
    if (!raw) {
      setRole(null);
      return;
    }

    try {
      const user = JSON.parse(raw) as { role?: string };
      setRole(user.role ?? null);
    } catch {
      setRole(null);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1️⃣ leer al montar
    readRoleFromStorage();

    // 2️⃣ escuchar cambios de auth (login / logout)
    const handleAuthChange = () => {
      readRoleFromStorage();
    };

    window.addEventListener("festgo-auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("festgo-auth-change", handleAuthChange);
    };
  }, []);

  const isStaff = role === "admin" || role === "employee";
  const isCustomer = role === "customer";

  // 👇 en estas rutas NO queremos mostrar el link "Menú" para visitantes
  const hideVisitorMenuOnPath = ["/", "/login", "/register"].includes(
    pathname ?? ""
  );

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("festgo_token");
      localStorage.removeItem("festgo_user");
      window.dispatchEvent(new Event("festgo-auth-change"));
    }

    setRole(null);
    router.push("/");
    router.refresh?.();
  };

  return (
    <nav
      style={{
        width: "100%",
        padding: "0.8rem 2rem",
        borderBottom: "1px solid #111827",
        background: "linear-gradient(to bottom, #020617, #020617, #020617)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Branding */}
      <span
        style={{
          fontWeight: 600,
          fontSize: "1.1rem",
          color: "#e5e7eb",
          letterSpacing: "0.04em",
        }}
      >
        FestGo Bar
      </span>

      {/* Links + botón salir */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "2.5rem",
            fontSize: "0.95rem",
            color: "#e5e7eb",
            alignItems: "center",
          }}
        >
          {/* STAFF: admin y employee */}
          {isStaff && (
            <>
              <Link
                href="/dashboard"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Dashboard</span>
              </Link>

              <Link
                href="/inventory"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Inventario</span>
              </Link>

              <Link
                href="/orders"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Pedidos</span>
              </Link>

              <Link
                href="/reservations"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Reservas</span>
              </Link>

              <Link
                href="/stock-movements"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Movimientos</span>
              </Link>

              <Link
                href="/bills"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Bills</span>
              </Link>

              <Link
                href="/customers"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Clientes</span>
              </Link>

              <Link
                href="/suppliers"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Proveedores</span>
              </Link>

              <Link
                href="/tables"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Mesas</span>
              </Link>

              <Link
                href="/waitlist"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Waitlist</span>
              </Link>
            </>
          )}

          {/* CUSTOMER */}
          {isCustomer && (
            <>
              <Link
                href="/customer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Inicio</span>
              </Link>

              <Link
                href="/products"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Menú</span>
              </Link>

              <Link
                href="/reservations/new"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Reservar</span>
              </Link>

              <Link
                href="/customer/profile"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ cursor: "pointer" }}>Mi Perfil</span>
              </Link>
            </>
          )}

          {/* VISITANTE – solo mostramos "Menú" en páginas internas, no en home/login/register */}
          {!role && !hideVisitorMenuOnPath && (
            <Link
              href="/products"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <span style={{ cursor: "pointer" }}>Menú</span>
            </Link>
          )}
        </div>

        {/* Botón Cerrar sesión */}
        {role && (
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "9999px",
              border: "1px solid #4b5563",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </nav>
  );
}
