// src/app/suppliers/page.tsx
"use client";

import { useEffect, useState } from "react";
// 🔧 Ajustá la ruta según tu proyecto
import {
  getSuppliers,
  type Supplier,
  createSupplier,
  type CreateSupplierPayload,
  getSuppliersTopByVolume, // ✅ ya lo tenías
  getSuppliersByPaymentTerms, // ✅ AGRUPADO
  type SuppliersByPaymentTerms,
  getSupplierById, // ✅ NUEVO IMPORT
  deleteSupplier, // ✅ NUEVO IMPORT PARA DELETE
} from "@/app/lib/api";

// 👉 tipo para el rol del usuario
type UserRole = "admin" | "employee" | "customer" | string | null;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeOnly, setActiveOnly] = useState(true); // por defecto solo activos

  // 👉 estados para crear proveedor
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateSupplierPayload>({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    paymentTerms: 0,
    volumeDiscount: 0,
    notes: "",
  });

  // 👉 estados para TOP proveedores
  const [topSuppliers, setTopSuppliers] = useState<Supplier[]>([]);
  const [loadingTop, setLoadingTop] = useState(false);

  // 👉 AGRUPADOS por términos de pago
  const [byPaymentTerms, setByPaymentTerms] =
    useState<SuppliersByPaymentTerms>({});
  const [loadingByTerms, setLoadingByTerms] = useState(false);

  // 👉 NUEVO: detalle por ID
  const [supplierIdQuery, setSupplierIdQuery] = useState("");
  const [supplierDetail, setSupplierDetail] = useState<Supplier | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null); // ✅ NUEVO ESTADO

  // 👉 NUEVO: rol + flag de auth chequeada
  const [role, setRole] = useState<UserRole>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // lee festgo_user de localStorage para saber el rol
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

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await getSuppliers(
        activeOnly ? { active: "active" } : undefined
      );

      if (res.success && res.data) {
        setSuppliers(res.data);
      } else {
        setErrorMsg(res.message || "No se pudieron obtener los proveedores");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al obtener proveedores");
    } finally {
      setLoading(false);
    }
  };

  // ✅ obtener TOP proveedores por volumen
  const fetchTopSuppliers = async () => {
    setLoadingTop(true);
    setErrorMsg("");
    try {
      const res = await getSuppliersTopByVolume({ limit: 5 });

      if (res.success && res.data) {
        setTopSuppliers(res.data);
      } else {
        setErrorMsg(
          res.message || "No se pudo obtener el top de proveedores"
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al obtener el top");
    } finally {
      setLoadingTop(false);
    }
  };

  // ✅ AGRUPADOS por términos de pago
  const fetchSuppliersByPaymentTerms = async () => {
    setLoadingByTerms(true);
    setErrorMsg("");
    try {
      const res = await getSuppliersByPaymentTerms();

      if (res.success && res.data) {
        setByPaymentTerms(res.data);
      } else {
        setErrorMsg(
          res.message ||
            "No se pudo obtener el agrupado por términos de pago"
        );
      }
    } catch (err: any) {
      setErrorMsg(
        err.message || "Error inesperado al obtener términos de pago"
      );
    } finally {
      setLoadingByTerms(false);
    }
  };

  // ✅ NUEVO: obtener proveedor por ID
  const fetchSupplierDetail = async (id?: string) => {
    const targetId = (id ?? supplierIdQuery).trim();
    if (!targetId) return;

    setLoadingDetail(true);
    setErrorMsg("");
    try {
      const res = await getSupplierById(targetId);

      if (res.success && res.data) {
        setSupplierDetail(res.data);
      } else {
        setSupplierDetail(null);
        setErrorMsg(res.message || "No se encontró el proveedor con ese ID");
      }
    } catch (err: any) {
      setSupplierDetail(null);
      setErrorMsg(err.message || "Error inesperado al obtener el proveedor");
    } finally {
      setLoadingDetail(false);
    }
  };

  // ✅ NUEVO: eliminar proveedor
  const handleDeleteSupplier = async (id: string) => {
    const confirmDelete = window.confirm(
      "¿Seguro que querés eliminar este proveedor? Esta acción no se puede deshacer."
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    setErrorMsg("");

    try {
      const res = await deleteSupplier(id);

      if (res.success) {
        // sacamos el proveedor de la lista general
        setSuppliers((prev) => prev.filter((s) => s.id !== id));

        // si el detalle actual es el mismo, lo limpiamos
        if (supplierDetail?.id === id) {
          setSupplierDetail(null);
          setSupplierIdQuery("");
        }

        // refrescamos top y agrupado
        fetchTopSuppliers();
        fetchSuppliersByPaymentTerms();
      } else {
        setErrorMsg(
          res.message || "No se pudo eliminar el proveedor seleccionado."
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al eliminar proveedor");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  // ✅ cargamos TOP y BY-PAYMENT-TERMS al montar
  useEffect(() => {
    fetchTopSuppliers();
    fetchSuppliersByPaymentTerms();
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg("");

    try {
      const res = await createSupplier({
        ...form,
        paymentTerms: Number(form.paymentTerms),
        volumeDiscount: Number(form.volumeDiscount),
      });

      if (res.success && res.data) {
        // agregamos el nuevo proveedor al principio de la lista
        setSuppliers((prev) => [res.data!, ...prev]);
        // reseteamos formulario
        setForm({
          name: "",
          contactName: "",
          email: "",
          phone: "",
          address: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
          paymentTerms: 0,
          volumeDiscount: 0,
          notes: "",
        });
        // ✅ refrescamos el TOP y el agrupado
        fetchTopSuppliers();
        fetchSuppliersByPaymentTerms();
      } else {
        setErrorMsg(
          res.message ||
            "No se pudo crear el proveedor. Revisá los datos enviados."
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al crear proveedor");
    } finally {
      setCreating(false);
    }
  };

  // ===== GUARD DE ACCESO SEGÚN ROL =====

  if (!authChecked) {
    return (
      <main
        style={{
          padding: "2rem",
          color: "white",
          background: "#0f172a",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>🚚 Proveedores</h1>
        <p style={{ color: "#9ca3af" }}>Verificando permisos…</p>
      </main>
    );
  }

  if (!isStaff) {
    return (
      <main
        style={{
          padding: "2rem",
          color: "white",
          background: "#0f172a",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>🚚 Proveedores</h1>
        <p style={{ color: "#f97316" }}>
          Esta sección de proveedores es solo para el staff del bar
          (admin / employee).
        </p>
      </main>
    );
  }

  // ===== VISTA NORMAL (STAFF) =====

  return (
    <main
      style={{
        padding: "2rem",
        color: "white",
        background: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>🚚 Proveedores</h1>

      {errorMsg && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }}>{errorMsg}</p>
      )}

      {/* FORM CREAR PROVEEDOR */}
      <section
        style={{
          background: "#1e293b",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #334155",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>
          Crear nuevo proveedor
        </h2>

        <form
          onSubmit={handleCreateSupplier}
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Persona de contacto</label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contactName: e.target.value }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Teléfono</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          {/* Dirección */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Calle</label>
            <input
              type="text"
              value={form.address.street}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  address: { ...prev.address, street: e.target.value },
                }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Ciudad</label>
            <input
              type="text"
              value={form.address.city}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  address: { ...prev.address, city: e.target.value },
                }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Provincia / Estado</label>
            <input
              type="text"
              value={form.address.state}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  address: { ...prev.address, state: e.target.value },
                }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Código postal</label>
            <input
              type="text"
              value={form.address.zipCode}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  address: { ...prev.address, zipCode: e.target.value },
                }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>País</label>
            <input
              type="text"
              value={form.address.country}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  address: { ...prev.address, country: e.target.value },
                }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          {/* Otros campos */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Plazo de pago (días)</label>
            <input
              type="number"
              value={form.paymentTerms}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  paymentTerms: Number(e.target.value),
                }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Descuento por volumen (%)</label>
            <input
              type="number"
              value={form.volumeDiscount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  volumeDiscount: Number(e.target.value),
                }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Notas</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="submit"
              disabled={creating}
              style={{
                padding: "0.7rem 1.2rem",
                background: "#22c55e",
                borderRadius: "0.6rem",
                fontWeight: "bold",
                border: "none",
                cursor: creating ? "default" : "pointer",
              }}
            >
              {creating ? "Creando..." : "Crear proveedor"}
            </button>
          </div>
        </form>
      </section>

      {/* ✅ BLOQUE TOP PROVEEDORES */}
      <section
        style={{
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #1f2937",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h2 style={{ fontSize: "1.1rem" }}>🔥 Top proveedores por volumen</h2>
          <button
            onClick={fetchTopSuppliers}
            disabled={loadingTop}
            style={{
              padding: "0.4rem 0.9rem",
              background: "#3b82f6",
              borderRadius: "0.5rem",
              border: "none",
              fontSize: "0.85rem",
              cursor: loadingTop ? "default" : "pointer",
            }}
          >
            {loadingTop ? "Actualizando..." : "Actualizar top"}
          </button>
        </div>

        {topSuppliers.length === 0 && !loadingTop && (
          <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
            No hay información de volumen todavía.
          </p>
        )}

        {topSuppliers.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr style={{ background: "#111827" }}>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>#</th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>
                    Proveedor
                  </th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>
                    Contacto
                  </th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>
                    Total órdenes
                  </th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>
                    Importe total
                  </th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.map((s, idx) => (
                  <tr key={s.id} style={{ borderTop: "1px solid #1f2937" }}>
                    <td style={{ padding: "0.5rem" }}>{idx + 1}</td>
                    <td style={{ padding: "0.5rem" }}>{s.name}</td>
                    <td style={{ padding: "0.5rem" }}>{s.contactName}</td>
                    <td style={{ padding: "0.5rem" }}>{s.totalOrders}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {s.totalAmount.toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ✅ NUEVO BLOQUE: BUSCAR PROVEEDOR POR ID */}
      <section
        style={{
          background: "#1e293b",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #334155",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
          🔍 Buscar proveedor (GET /suppliers/{"{id}"})
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          {/* SELECT DE PROVEEDORES EN VEZ DE INPUT DE TEXTO */}
          <select
            value={supplierIdQuery}
            onChange={(e) => setSupplierIdQuery(e.target.value)}
            style={{
              flex: "1 1 260px",
              padding: "0.45rem 0.6rem",
              borderRadius: "0.5rem",
              border: "1px solid #475569",
              background: "#020617",
              color: "white",
            }}
          >
            <option value="">Seleccioná un proveedor…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} – {s.contactName} ({s.id.slice(0, 8)}…)
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchSupplierDetail()}
            disabled={loadingDetail || !supplierIdQuery.trim()}
            style={{
              padding: "0.6rem 1rem",
              background: "#3b82f6",
              borderRadius: "0.6rem",
              border: "none",
              fontWeight: "bold",
              cursor:
                loadingDetail || !supplierIdQuery.trim()
                  ? "default"
                  : "pointer",
            }}
          >
            {loadingDetail ? "Buscando..." : "Ver detalle"}
          </button>
        </div>

        {supplierDetail && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              background: "#020617",
              border: "1px solid #1f2937",
            }}
          >
            <h3 style={{ marginBottom: "0.4rem", fontSize: "1rem" }}>
              {supplierDetail.name}
            </h3>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
              <strong>ID:</strong> {supplierDetail.id}
            </p>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
              <strong>Contacto:</strong> {supplierDetail.contactName}
            </p>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
              <strong>Email:</strong> {supplierDetail.email}
            </p>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
              <strong>Teléfono:</strong> {supplierDetail.phone}
            </p>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
              <strong>Ubicación:</strong>{" "}
              {supplierDetail.address?.city ?? "—"},{" "}
              {supplierDetail.address?.state ?? "—"} –{" "}
              {supplierDetail.address?.country ?? "—"}
            </p>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
              <strong>Total órdenes:</strong> {supplierDetail.totalOrders}
            </p>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
              <strong>Importe total:</strong>{" "}
              {supplierDetail.totalAmount.toLocaleString("es-ES", {
                style: "currency",
                currency: "EUR",
              })}
            </p>
            <p style={{ fontSize: "0.9rem" }}>
              <strong>Estado:</strong>{" "}
              <span
                style={{
                  padding: "0.15rem 0.45rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  backgroundColor: supplierDetail.isActive
                    ? "#16a34a33"
                    : "#f8717133",
                  color: supplierDetail.isActive ? "#4ade80" : "#fca5a5",
                }}
              >
                {supplierDetail.isActive ? "Activo" : "Inactivo"}
              </span>
            </p>

            {/* ✅ BOTÓN ELIMINAR PROVEEDOR */}
            <div
              style={{
                marginTop: "0.8rem",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => handleDeleteSupplier(supplierDetail.id)}
                disabled={deletingId === supplierDetail.id}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.6rem",
                  border: "none",
                  fontWeight: "bold",
                  background: "#ef4444",
                  color: "white",
                  cursor:
                    deletingId === supplierDetail.id ? "default" : "pointer",
                }}
              >
                {deletingId === supplierDetail.id
                  ? "Eliminando..."
                  : "Eliminar proveedor"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ✅ NUEVO BLOQUE: AGRUPADO POR TÉRMINOS DE PAGO */}
      <section
        style={{
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #1f2937",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h2 style={{ fontSize: "1.1rem" }}>
            🧾 Proveedores por términos de pago
          </h2>
          <button
            onClick={fetchSuppliersByPaymentTerms}
            disabled={loadingByTerms}
            style={{
              padding: "0.4rem 0.9rem",
              background: "#3b82f6",
              borderRadius: "0.5rem",
              border: "none",
              fontSize: "0.85rem",
              cursor: loadingByTerms ? "default" : "pointer",
            }}
          >
            {loadingByTerms ? "Actualizando..." : "Actualizar agrupado"}
          </button>
        </div>

        {Object.keys(byPaymentTerms).length === 0 && !loadingByTerms && (
          <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
            No hay datos de términos de pago todavía.
          </p>
        )}

        {Object.entries(byPaymentTerms).map(([term, list]) => (
          <div
            key={term}
            style={{
              marginBottom: "1rem",
              borderTop: "1px solid #1f2937",
              paddingTop: "0.75rem",
            }}
          >
            <h3 style={{ marginBottom: "0.4rem", fontSize: "0.95rem" }}>
              Plazo de pago:{" "}
              <span style={{ fontWeight: "bold" }}>{term} días</span>{" "}
              <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                ({list.length} proveedores)
              </span>
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                }}
              >
                <thead>
                  <tr style={{ background: "#111827" }}>
                    <th style={{ padding: "0.4rem", textAlign: "left" }}>
                      Nombre
                    </th>
                    <th style={{ padding: "0.4rem", textAlign: "left" }}>
                      Contacto
                    </th>
                    <th style={{ padding: "0.4rem", textAlign: "left" }}>
                      Email
                    </th>
                    <th style={{ padding: "0.4rem", textAlign: "left" }}>
                      Teléfono
                    </th>
                    <th style={{ padding: "0.4rem", textAlign: "left" }}>
                      Órdenes
                    </th>
                    <th style={{ padding: "0.4rem", textAlign: "left" }}>
                      Importe total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} style={{ borderTop: "1px solid #1f2937" }}>
                      <td style={{ padding: "0.4rem" }}>{s.name}</td>
                      <td style={{ padding: "0.4rem" }}>{s.contactName}</td>
                      <td style={{ padding: "0.4rem" }}>{s.email}</td>
                      <td style={{ padding: "0.4rem" }}>{s.phone}</td>
                      <td style={{ padding: "0.4rem" }}>{s.totalOrders}</td>
                      <td style={{ padding: "0.4rem" }}>
                        {s.totalAmount?.toLocaleString("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {/* CONTROLES LISTA GENERAL */}
      <section
        style={{
          background: "#1e293b",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          border: "1px solid #334155",
        }}
      >
        <label
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Mostrar solo proveedores activos (active=active)
        </label>

        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: "0.7rem 1.2rem",
            background: "#3b82f6",
            borderRadius: "0.6rem",
            fontWeight: "bold",
            border: "none",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Cargando..." : "Recargar lista"}
        </button>
      </section>

      {/* LISTADO GENERAL */}
      {suppliers.length === 0 && !loading && (
        <p style={{ color: "#9ca3af" }}>No hay proveedores para mostrar.</p>
      )}

      {suppliers.length > 0 && (
        <div
          style={{
            overflowX: "auto",
            borderRadius: "0.75rem",
            border: "1px solid #1f2937",
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
              <tr style={{ background: "#111827" }}>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>Nombre</th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>Email</th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>
                  Teléfono
                </th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>
                  Contacto
                </th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>
                  Ubicación
                </th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>
                  Total órdenes
                </th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>
                  Importe total
                </th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>Estado</th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>
                  Última orden
                </th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr
                  key={s.id}
                  style={{ borderTop: "1px solid #1f2937" }}
                  // opcional: clic en fila carga detalle por ID
                  onClick={() => fetchSupplierDetail(s.id)}
                >
                  <td style={{ padding: "0.6rem" }}>{s.name}</td>
                  <td style={{ padding: "0.6rem" }}>{s.email}</td>
                  <td style={{ padding: "0.6rem" }}>{s.phone}</td>
                  <td style={{ padding: "0.6rem" }}>{s.contactName}</td>
                  <td style={{ padding: "0.6rem" }}>
                    {s.address?.city ?? "—"}, {s.address?.state ?? "—"} –{" "}
                    {s.address?.country ?? "—"}
                  </td>
                  <td style={{ padding: "0.6rem" }}>{s.totalOrders}</td>
                  <td style={{ padding: "0.6rem" }}>
                    {s.totalAmount.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </td>
                  <td style={{ padding: "0.6rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        backgroundColor: s.isActive ? "#16a34a33" : "#f8717133",
                        color: s.isActive ? "#4ade80" : "#fca5a5",
                      }}
                    >
                      {s.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem" }}>
                    {s.lastOrderDate
                      ? new Date(s.lastOrderDate).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
