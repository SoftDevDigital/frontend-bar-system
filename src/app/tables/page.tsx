"use client";

import { useEffect, useState } from "react";
import {
  getTables,
  Table,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
} from "../lib/api";

// 👉 tipo de rol
type UserRole = "admin" | "employee" | "customer" | string | null;

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ⭐ estados para crear mesa
  const [number, setNumber] = useState(1);
  const [capacity, setCapacity] = useState(2);
  const [location, setLocation] = useState("Interior");
  const [creating, setCreating] = useState(false);

  // ⭐ estados para detalle por ID
  const [tableIdInput, setTableIdInput] = useState("");
  const [detail, setDetail] = useState<Table | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ⭐ estados para actualizar mesa seleccionada
  const [editNumber, setEditNumber] = useState<number | "">("");
  const [editCapacity, setEditCapacity] = useState<number | "">("");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("available");
  const [updating, setUpdating] = useState(false);

  // ⭐ eliminar
  const [deleting, setDeleting] = useState(false);

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

  // obtener mesas (solo staff)
  useEffect(() => {
    if (!authChecked) return;

    if (!isStaff) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    getTables()
      .then((res) => {
        if (res.success && res.data) {
          setTables(res.data);
        } else {
          setErrorMsg(res.message || "Error al obtener mesas");
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || "Error de red");
      })
      .finally(() => setLoading(false));
  }, [authChecked, isStaff]);

  // cuando cambia el detalle, rellenamos los campos de edición
  useEffect(() => {
    if (detail) {
      setEditNumber(detail.number);
      setEditCapacity(detail.capacity);
      setEditLocation(detail.location);
      setEditStatus(detail.status);
    }
  }, [detail]);

  // crear mesa
  const handleCreateTable = async (e: any) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);

    try {
      const res = await createTable({
        number,
        capacity,
        location,
      });

      if (res.success && res.data) {
        setTables((prev) => [res.data!, ...prev]);
      } else {
        setErrorMsg(res.message || "No se pudo crear la mesa");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al crear mesa");
    } finally {
      setCreating(false);
    }
  };

  // obtener /tables/:id
  const handleFetchDetail = async (e: any) => {
    e.preventDefault();
    if (!tableIdInput.trim()) {
      setErrorMsg("Ingresá un ID de mesa");
      return;
    }

    setLoadingDetail(true);
    setErrorMsg(null);
    setDetail(null);

    try {
      const res = await getTableById(tableIdInput.trim());

      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        setErrorMsg(res.message || "No se pudo obtener el detalle");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error de red");
    } finally {
      setLoadingDetail(false);
    }
  };

  // actualizar mesa (PUT)
  const handleUpdateTable = async (e: any) => {
    e.preventDefault();

    if (!detail || !tableIdInput.trim()) {
      setErrorMsg("Primero seleccioná una mesa y cargá el detalle.");
      return;
    }

    if (editNumber === "" || editCapacity === "" || !editLocation.trim()) {
      setErrorMsg("Completá todos los campos para actualizar la mesa.");
      return;
    }

    setUpdating(true);
    setErrorMsg(null);

    try {
      const res = await updateTable(tableIdInput.trim(), {
        number: Number(editNumber),
        capacity: Number(editCapacity),
        location: editLocation,
        status: editStatus,
      });

      if (res.success && res.data) {
        const updated = res.data;
        setDetail(updated);
        setTables((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      } else {
        setErrorMsg(res.message || "No se pudo actualizar la mesa");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al actualizar mesa");
    } finally {
      setUpdating(false);
    }
  };

  // eliminar mesa (DELETE)
  const handleDeleteTable = async () => {
    if (!detail || !tableIdInput.trim()) {
      setErrorMsg("Primero seleccioná una mesa y cargá el detalle.");
      return;
    }

    const ok = window.confirm(
      `¿Seguro que querés eliminar la mesa #${detail.number}? Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    setDeleting(true);
    setErrorMsg(null);

    try {
      const res = await deleteTable(tableIdInput.trim());

      if (res.success) {
        setTables((prev) => prev.filter((t) => t.id !== detail.id));
        setDetail(null);
        setTableIdInput("");
      } else {
        setErrorMsg(res.message || "No se pudo eliminar la mesa");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al eliminar mesa");
    } finally {
      setDeleting(false);
    }
  };

  // ===== GUARD POR ROL =====

  if (!authChecked) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "white",
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "white",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "480px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>
            Mesas – FestGo Bar
          </h1>
          <p style={{ color: "#f97316" }}>
            Esta sección de mesas es solo para el staff del bar (admin /
            employee).
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "white",
        }}
      >
        Cargando mesas...
      </div>
    );
  }

  // ===== VISTA NORMAL STAFF =====

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: "#0f172a",
        color: "white",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        Mesas disponibles 🍽️
      </h1>

      {errorMsg && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }}>{errorMsg}</p>
      )}

      {/* FORMULARIO CREAR */}
      <form
        onSubmit={handleCreateTable}
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          alignItems: "flex-end",
          flexWrap: "wrap",
          background: "#1e293b",
          padding: "1rem",
          borderRadius: "0.75rem",
          border: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Número
          </label>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              background: "#020617",
              color: "white",
              border: "1px solid #475569",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Capacidad
          </label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              background: "#020617",
              color: "white",
              border: "1px solid #475569",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Ubicación
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              background: "#020617",
              color: "white",
              border: "1px solid #475569",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={creating}
          style={{
            padding: "0.7rem 1.2rem",
            background: "#22c55e",
            color: "#022c22",
            borderRadius: "0.6rem",
            fontWeight: 700,
            border: "none",
            cursor: creating ? "default" : "pointer",
          }}
        >
          {creating ? "Creando..." : "Crear mesa"}
        </button>
      </form>

      {/* FORMULARIO DETALLE / SELECT */}
      <form
        onSubmit={handleFetchDetail}
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "flex-end",
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          border: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Mesa (para /tables/:id)
          </label>

          <select
            value={tableIdInput}
            onChange={(e) => setTableIdInput(e.target.value)}
            style={{
              marginBottom: "0.4rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #475569",
              background: "#020617",
              color: "white",
            }}
          >
            <option value="">Seleccioná una mesa...</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Mesa #{t.number} – {t.location}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={tableIdInput}
            onChange={(e) => setTableIdInput(e.target.value)}
            placeholder="o pegá un ID manualmente"
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #475569",
              background: "#020617",
              color: "white",
              fontSize: "0.8rem",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loadingDetail}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.7rem",
            border: "none",
            background: "#3b82f6",
            color: "white",
            fontWeight: 600,
            cursor: loadingDetail ? "default" : "pointer",
          }}
        >
          {loadingDetail ? "Buscando..." : "Ver detalle"}
        </button>
      </form>

      {/* DETALLE + EDIT + DELETE */}
      {detail && (
        <section
          style={{
            marginBottom: "2rem",
            background: "#1e293b",
            borderRadius: "0.75rem",
            padding: "1rem",
            border: "1px solid #334155",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Detalle mesa #{detail.number}
          </h2>
          <p>ID: {detail.id}</p>
          <p>Capacidad: {detail.capacity}</p>
          <p>Ubicación: {detail.location}</p>
          <p>
            Estado:{" "}
            <strong
              style={{
                color: detail.status === "available" ? "#4ade80" : "#f87171",
              }}
            >
              {detail.status}
            </strong>
          </p>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Creada: {new Date(detail.createdAt).toLocaleString()}
          </p>

          {/* FORMULARIO UPDATE */}
          <form
            onSubmit={handleUpdateTable}
            style={{
              marginTop: "1rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                Número
              </label>
              <input
                type="number"
                value={editNumber}
                onChange={(e) =>
                  setEditNumber(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  background: "#020617",
                  color: "white",
                  border: "1px solid #475569",
                  width: "90px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                Capacidad
              </label>
              <input
                type="number"
                value={editCapacity}
                onChange={(e) =>
                  setEditCapacity(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  background: "#020617",
                  color: "white",
                  border: "1px solid #475569",
                  width: "100px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                Ubicación
              </label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  background: "#020617",
                  color: "white",
                  border: "1px solid #475569",
                  minWidth: "140px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                Estado
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  background: "#020617",
                  color: "white",
                  border: "1px solid #475569",
                  minWidth: "130px",
                }}
              >
                <option value="available">available</option>
                <option value="occupied">occupied</option>
                <option value="reserved">reserved</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={updating}
              style={{
                padding: "0.55rem 1.2rem",
                borderRadius: "0.6rem",
                border: "none",
                background: "#f97316",
                color: "white",
                fontWeight: 600,
                cursor: updating ? "default" : "pointer",
              }}
            >
              {updating ? "Actualizando..." : "Actualizar mesa"}
            </button>

            {/* ⭐ BOTÓN ELIMINAR */}
            <button
              type="button"
              onClick={handleDeleteTable}
              disabled={deleting}
              style={{
                padding: "0.55rem 1.2rem",
                borderRadius: "0.6rem",
                border: "none",
                background: "#ef4444",
                color: "white",
                fontWeight: 600,
                cursor: deleting ? "default" : "pointer",
                marginLeft: "0.5rem",
              }}
            >
              {deleting ? "Eliminando..." : "Eliminar mesa"}
            </button>
          </form>
        </section>
      )}

      {/* LISTADO DE MESAS */}
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        }}
      >
        {tables.map((t) => (
          <div
            key={t.id}
            style={{
              background: "#1e293b",
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "1px solid #334155",
            }}
          >
            <h2 style={{ fontSize: "1.2rem" }}>Mesa #{t.number}</h2>
            <p>Capacidad: {t.capacity} personas</p>
            <p>Ubicación: {t.location}</p>
            <p>
              Estado:{" "}
              <strong
                style={{
                  color: t.status === "available" ? "#4ade80" : "#f87171",
                }}
              >
                {t.status}
              </strong>
            </p>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Creada: {new Date(t.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
