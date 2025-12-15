"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

type UserRole = "admin" | "employee" | "customer" | string | null;

export default function TopNav() {
  const [role, setRole] = useState<UserRole>(null);
  const router = useRouter();
  const pathname = usePathname();

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
    readRoleFromStorage();

    const handleAuthChange = () => readRoleFromStorage();
    window.addEventListener("festgo-auth-change", handleAuthChange);

    return () =>
      window.removeEventListener("festgo-auth-change", handleAuthChange);
  }, []);

  const isStaff = role === "admin" || role === "employee";
  const isAdmin = role === "admin";
  const isCustomer = role === "customer";

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
        background: "linear-gradient(to bottom, #020617, #020617)",
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

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            gap: "2.2rem",
            fontSize: "0.95rem",
            color: "#e5e7eb",
            alignItems: "center",
          }}
        >
          {/* STAFF */}
          {isStaff && (
            <>
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/pos" label="💳 FACTURACIÓN" />
              <NavLink href="/inventory" label="Inventario" />
              <NavLink href="/products" label="Productos" />

              {/* ✅ NUEVO */}
              <NavLink href="/categories" label="Categorías" />

              <NavLink href="/orders" label="Pedidos" />
              <NavLink href="/reservations" label="Reservas" />
              <NavLink href="/stock-movements" label="Movimientos" />
              <NavLink href="/bills" label="Bills" />
              <NavLink href="/customers" label="Clientes" />
              <NavLink href="/suppliers" label="Proveedores" />
              <NavLink href="/tables" label="Mesas" />
              <NavLink href="/waitlist" label="Waitlist" />

              {/* FINANZAS – SOLO ADMIN */}
              {isAdmin && (
                <>
                  <NavLink
                    href="/financial-summary"
                    label="Resumen financiero"
                  />
                  <NavLink
                    href="/financial-movements"
                    label="Movimientos financieros"
                  />
                </>
              )}
            </>
          )}

          {/* CUSTOMER */}
          {isCustomer && (
            <>
              <NavLink href="/customer" label="Inicio" />
              <NavLink href="/products" label="Menú" />
              <NavLink href="/reservations/new" label="Reservar" />
              <NavLink href="/customer/profile" label="Mi Perfil" />
            </>
          )}

          {/* VISITANTE */}
          {!role && !hideVisitorMenuOnPath && (
            <NavLink href="/products" label="Menú" />
          )}
        </div>

        {/* Logout */}
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

/* 🔹 Helper */
function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <span style={{ cursor: "pointer" }}>{label}</span>
    </Link>
  );
}
