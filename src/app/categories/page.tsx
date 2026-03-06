"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Category,
  createCategory,
  CreateCategoryPayload,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../lib/api";

type UserRole = "admin" | "employee" | "customer" | string | null;
type ConsumptionType = "food" | "drink" | "";

type State = {
  loading: boolean;
  error: string | null;
  data: Category[];
};

export default function CategoriesPage() {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    data: [],
  });

  // role
  const [role, setRole] = useState<UserRole>(null);
  const isAdmin = role === "admin";

  // form create
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("1");
  const [color, setColor] = useState("#334155");
  const [icon, setIcon] = useState("🍽️");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [consumptionType, setConsumptionType] = useState<ConsumptionType>("");

  // EDIT
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("1");
  const [editColor, setEditColor] = useState("#334155");
  const [editIcon, setEditIcon] = useState("🍽️");
  const [editParentCategoryId, setEditParentCategoryId] = useState("");
  const [editConsumptionType, setEditConsumptionType] =
    useState<ConsumptionType>("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // DELETE
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

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

  const fetchData = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const res = await getCategories();

      const list = Array.isArray(res.data) ? res.data : [];

      if (!res.success) {
        setState({
          loading: false,
          error: res.message || "Error al obtener categorías",
          data: [],
        });
        return;
      }

      const ordered = [...list].sort(
        (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
      );

      setState({ loading: false, error: null, data: ordered });
    } catch (err: any) {
      setState({
        loading: false,
        error: err?.message || "Error de red",
        data: [],
      });
    }
  };

  useEffect(() => {
    readRoleFromStorage();
    fetchData();

    const handleAuthChange = () => readRoleFromStorage();
    window.addEventListener("festgo-auth-change", handleAuthChange);

    return () =>
      window.removeEventListener("festgo-auth-change", handleAuthChange);
  }, []);

  const activeCategories = useMemo(
    () => state.data.filter((c) => c.isActive !== false),
    [state.data]
  );

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!isAdmin) {
      setCreateError("Solo un usuario con rol ADMIN puede crear categorías.");
      return;
    }

    if (!name.trim()) {
      setCreateError("El nombre es obligatorio.");
      return;
    }

    const payload: CreateCategoryPayload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      imageUrl: imageUrl.trim() ? imageUrl.trim() : undefined,
      sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined,
      color: color.trim() ? color.trim() : undefined,
      icon: icon.trim() ? icon.trim() : undefined,
      parentCategoryId: parentCategoryId.trim()
        ? parentCategoryId.trim()
        : undefined,
      consumptionType: consumptionType || undefined,
    };

    try {
      setCreating(true);

      const res = await createCategory(payload);

      if (!res.success || !res.data) {
        setCreateError(res.message || "No se pudo crear la categoría.");
        return;
      }

      setCreateSuccess(`Categoría creada: ${res.data.name}`);
      await fetchData();

      setName("");
      setDescription("");
      setImageUrl("");
      setSortOrder("1");
      setColor("#334155");
      setIcon("🍽️");
      setParentCategoryId("");
      setConsumptionType("");
    } catch (err: any) {
      setCreateError(
        err?.message ||
          "Error inesperado al crear la categoría. Verificá token admin."
      );
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (c: Category) => {
    if (!isAdmin) return;

    setUpdateError(null);
    setUpdateSuccess(null);
    setEditingId(c.id);
    setEditName(c.name || "");
    setEditDescription(c.description || "");
    setEditImageUrl(c.imageUrl || "");
    setEditSortOrder(
      c.sortOrder !== undefined && c.sortOrder !== null
        ? String(c.sortOrder)
        : "1"
    );
    setEditColor(c.color || "#334155");
    setEditIcon(c.icon || "🍽️");
    setEditParentCategoryId(c.parentCategoryId || "");
    setEditConsumptionType(
      c.consumptionType === "food" || c.consumptionType === "drink"
        ? c.consumptionType
        : ""
    );
    setEditIsActive(c.isActive !== false);
  };

  const handleUpdateCategory = async () => {
    setUpdateError(null);
    setUpdateSuccess(null);

    if (!isAdmin) {
      setUpdateError("Solo un usuario con rol ADMIN puede actualizar categorías.");
      return;
    }

    if (!editingId) return;

    const cleanName = editName.trim();
    if (!cleanName) {
      setUpdateError("El nombre es obligatorio.");
      return;
    }

    try {
      setUpdating(true);

      const res = await updateCategory(editingId, {
        name: cleanName,
        description: editDescription.trim() ? editDescription.trim() : undefined,
        imageUrl: editImageUrl.trim() ? editImageUrl.trim() : undefined,
        sortOrder: editSortOrder.trim() ? Number(editSortOrder) : undefined,
        parentCategoryId: editParentCategoryId.trim()
          ? editParentCategoryId.trim()
          : undefined,
        color: editColor.trim() ? editColor.trim() : undefined,
        icon: editIcon.trim() ? editIcon.trim() : undefined,
        consumptionType: editConsumptionType || undefined,
        isActive: editIsActive,
      });

      if (!res.success || !res.data) {
        setUpdateError(res.message || "No se pudo actualizar la categoría.");
        return;
      }

      setUpdateSuccess(`Categoría actualizada: ${res.data.name}`);
      setEditingId(null);
      await fetchData();
    } catch (err: any) {
      setUpdateError(
        err?.message ||
          "Error inesperado al actualizar. Verificá token admin."
      );
    } finally {
      setUpdating(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditImageUrl("");
    setEditSortOrder("1");
    setEditColor("#334155");
    setEditIcon("🍽️");
    setEditParentCategoryId("");
    setEditConsumptionType("");
    setEditIsActive(true);
    setUpdateError(null);
    setUpdateSuccess(null);
  };

  const openDelete = (c: Category) => {
    if (!isAdmin) return;
    setDeleteError(null);
    setDeleteSuccess(null);
    setDeletingId(c.id);
    setDeletingName(c.name || "");
  };

  const cancelDelete = () => {
    setDeletingId(null);
    setDeletingName("");
    setDeleteError(null);
    setDeleteSuccess(null);
  };

  const handleDeleteCategory = async () => {
    setDeleteError(null);
    setDeleteSuccess(null);

    if (!isAdmin) {
      setDeleteError("Solo un usuario con rol ADMIN puede eliminar categorías.");
      return;
    }

    if (!deletingId) return;

    try {
      setDeleting(true);

      const res = await deleteCategory(deletingId);

      if (!res.success) {
        setDeleteError(
          res.message ||
            "No se pudo eliminar la categoría. Puede tener productos asociados."
        );
        return;
      }

      setDeleteSuccess("Categoría eliminada exitosamente");
      setDeletingId(null);
      await fetchData();
    } catch (err: any) {
      setDeleteError(
        err?.message ||
          "Error inesperado al eliminar. Verificá token admin o productos asociados."
      );
    } finally {
      setDeleting(false);
    }
  };

  const getConsumptionTypeLabel = (value?: ConsumptionType | null) => {
    if (value === "food") return "Comida";
    if (value === "drink") return "Bebida";
    return "Sin definir";
  };

  const getConsumptionTypeStyles = (
    value?: ConsumptionType | null
  ): React.CSSProperties => {
    if (value === "food") {
      return {
        background: "rgba(34, 197, 94, 0.15)",
        color: "#86efac",
        border: "1px solid rgba(34, 197, 94, 0.35)",
      };
    }

    if (value === "drink") {
      return {
        background: "rgba(59, 130, 246, 0.15)",
        color: "#93c5fd",
        border: "1px solid rgba(59, 130, 246, 0.35)",
      };
    }

    return {
      background: "rgba(148, 163, 184, 0.15)",
      color: "#cbd5e1",
      border: "1px solid rgba(148, 163, 184, 0.35)",
    };
  };

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          padding: "2rem",
          background: "#020617",
          color: "#e5e7eb",
        }}
      >
        <header style={{ marginBottom: "1.25rem" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>
            Categorías 🍽️
          </h1>
          <p style={{ fontSize: "0.95rem", color: "#cbd5f5" }}>
            GET público /categories (ordenadas por sortOrder).
          </p>

          <p
            style={{
              fontSize: "0.85rem",
              marginTop: "0.5rem",
              color: isAdmin ? "#4ade80" : "#94a3b8",
            }}
          >
            Rol actual:{" "}
            <strong style={{ color: "#e5e7eb" }}>{role ?? "visitante"}</strong>
          </p>
        </header>

        {isAdmin && (
          <section
            style={{
              marginBottom: "1.25rem",
              padding: "1rem",
              borderRadius: "0.9rem",
              background: "#020617",
              border: "1px solid #334155",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
              Crear nueva categoría (👑 Solo Admin)
            </h2>

            {createError && (
              <p
                style={{
                  marginBottom: "0.5rem",
                  color: "#fecaca",
                  background: "#450a0a",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #b91c1c",
                  fontSize: "0.85rem",
                }}
              >
                {createError}
              </p>
            )}

            {createSuccess && (
              <p
                style={{
                  marginBottom: "0.5rem",
                  color: "#bbf7d0",
                  background: "#064e3b",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #16a34a",
                  fontSize: "0.85rem",
                }}
              >
                {createSuccess}
              </p>
            )}

            <form
              onSubmit={handleCreateCategory}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <Field label="Nombre *">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Descripción">
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Image URL (debe ser URL válida)">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://picsum.photos/600/400"
                  style={inputStyle}
                />
              </Field>

              <Field label="Sort Order">
                <input
                  type="number"
                  min={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Color">
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#FF6B6B"
                  style={inputStyle}
                />
              </Field>

              <Field label="Icono">
                <input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🍕"
                  style={inputStyle}
                />
              </Field>

              <Field label="Parent Category ID (UUID opcional)">
                <input
                  value={parentCategoryId}
                  onChange={(e) => setParentCategoryId(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Tipo de consumo">
                <select
                  value={consumptionType}
                  onChange={(e) =>
                    setConsumptionType(
                      e.target.value as "food" | "drink" | ""
                    )
                  }
                  style={inputStyle}
                >
                  <option value="">Sin definir</option>
                  <option value="food">Comida</option>
                  <option value="drink">Bebida</option>
                </select>
              </Field>

              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: "0.7rem 1.2rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    background: "#22c55e",
                    color: "#022c22",
                    fontWeight: 800,
                    cursor: creating ? "default" : "pointer",
                    width: "100%",
                  }}
                >
                  {creating ? "Creando..." : "Crear categoría"}
                </button>
              </div>
            </form>
          </section>
        )}

        {isAdmin && editingId && (
          <section
            style={{
              marginBottom: "1.25rem",
              padding: "1rem",
              borderRadius: "0.9rem",
              background: "#0b1220",
              border: "1px solid #334155",
            }}
          >
            <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>
              Editar categoría (PUT /categories/:id)
            </h2>

            <div
              style={{
                fontSize: "0.8rem",
                color: "#94a3b8",
                marginBottom: "0.75rem",
              }}
            >
              ID: <span style={{ color: "#e5e7eb" }}>{editingId}</span>
            </div>

            {updateError && (
              <p
                style={{
                  marginBottom: "0.5rem",
                  color: "#fecaca",
                  background: "#450a0a",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #b91c1c",
                  fontSize: "0.85rem",
                }}
              >
                {updateError}
              </p>
            )}

            {updateSuccess && (
              <p
                style={{
                  marginBottom: "0.5rem",
                  color: "#bbf7d0",
                  background: "#064e3b",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #16a34a",
                  fontSize: "0.85rem",
                }}
              >
                {updateSuccess}
              </p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <Field label="Nombre *">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Descripción">
                <input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Image URL">
                <input
                  type="url"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Sort Order">
                <input
                  type="number"
                  min={1}
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Color">
                <input
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Icono">
                <input
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Parent Category ID">
                <input
                  value={editParentCategoryId}
                  onChange={(e) => setEditParentCategoryId(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Tipo de consumo">
                <select
                  value={editConsumptionType}
                  onChange={(e) =>
                    setEditConsumptionType(
                      e.target.value as "food" | "drink" | ""
                    )
                  }
                  style={inputStyle}
                >
                  <option value="">Sin definir</option>
                  <option value="food">Comida</option>
                  <option value="drink">Bebida</option>
                </select>
              </Field>

              <Field label="Activa">
                <select
                  value={editIsActive ? "true" : "false"}
                  onChange={(e) => setEditIsActive(e.target.value === "true")}
                  style={inputStyle}
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </Field>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "0.5rem",
                  gridColumn: "1 / -1",
                }}
              >
                <button
                  type="button"
                  onClick={handleUpdateCategory}
                  disabled={updating}
                  style={{
                    padding: "0.7rem 1.2rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    background: "#22c55e",
                    color: "#022c22",
                    fontWeight: 800,
                    cursor: updating ? "default" : "pointer",
                    width: "100%",
                  }}
                >
                  {updating ? "Guardando..." : "Guardar"}
                </button>

                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={updating}
                  style={{
                    padding: "0.7rem 1.2rem",
                    borderRadius: "0.7rem",
                    border: "1px solid #334155",
                    background: "transparent",
                    color: "#e5e7eb",
                    fontWeight: 800,
                    cursor: updating ? "default" : "pointer",
                    width: "100%",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        )}

        {isAdmin && deletingId && (
          <section
            style={{
              marginBottom: "1.25rem",
              padding: "1rem",
              borderRadius: "0.9rem",
              background: "#1b0b0b",
              border: "1px solid #7f1d1d",
            }}
          >
            <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>
              Eliminar categoría (DELETE /categories/:id)
            </h2>

            <p
              style={{
                fontSize: "0.9rem",
                color: "#fecaca",
                marginBottom: "0.75rem",
              }}
            >
              Vas a eliminar <strong>{deletingName || "esta categoría"}</strong>{" "}
              permanentemente.
              <br />
              <strong>IMPORTANTE:</strong> si tiene productos asociados, el
              backend no te va a dejar.
            </p>

            <div
              style={{
                fontSize: "0.8rem",
                color: "#fca5a5",
                marginBottom: "0.75rem",
              }}
            >
              ID: <span style={{ color: "#fff" }}>{deletingId}</span>
            </div>

            {deleteError && (
              <p
                style={{
                  marginBottom: "0.5rem",
                  color: "#fecaca",
                  background: "#450a0a",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #b91c1c",
                  fontSize: "0.85rem",
                }}
              >
                {deleteError}
              </p>
            )}

            {deleteSuccess && (
              <p
                style={{
                  marginBottom: "0.5rem",
                  color: "#bbf7d0",
                  background: "#064e3b",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #16a34a",
                  fontSize: "0.85rem",
                }}
              >
                {deleteSuccess}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={deleting}
                style={{
                  padding: "0.7rem 1.2rem",
                  borderRadius: "0.7rem",
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: deleting ? "default" : "pointer",
                  width: "100%",
                }}
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>

              <button
                type="button"
                onClick={cancelDelete}
                disabled={deleting}
                style={{
                  padding: "0.7rem 1.2rem",
                  borderRadius: "0.7rem",
                  border: "1px solid #7f1d1d",
                  background: "transparent",
                  color: "#fecaca",
                  fontWeight: 900,
                  cursor: deleting ? "default" : "pointer",
                  width: "100%",
                }}
              >
                Cancelar
              </button>
            </div>
          </section>
        )}

        <section
          style={{ marginBottom: "1.25rem", display: "flex", gap: "0.75rem" }}
        >
          <button
            type="button"
            onClick={fetchData}
            disabled={state.loading}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "0.7rem",
              border: "none",
              background: "#22c55e",
              color: "#022c22",
              fontWeight: 700,
              cursor: state.loading ? "default" : "pointer",
            }}
          >
            {state.loading ? "Cargando..." : "Recargar"}
          </button>

          <div
            style={{
              fontSize: "0.9rem",
              color: "#94a3b8",
              alignSelf: "center",
            }}
          >
            Total:{" "}
            <strong style={{ color: "#e5e7eb" }}>
              {activeCategories.length}
            </strong>
          </div>
        </section>

        {state.error && !state.loading && (
          <p
            style={{
              marginBottom: "1rem",
              color: "#fecaca",
              background: "#450a0a",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid #b91c1c",
            }}
          >
            {state.error}
          </p>
        )}

        {state.loading && <p>Cargando categorías...</p>}

        {!state.loading && !state.error && (
          <>
            {activeCategories.length === 0 ? (
              <p>No hay categorías activas para mostrar.</p>
            ) : (
              <section
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                }}
              >
                {activeCategories.map((c) => (
                  <article
                    key={c.id}
                    style={{
                      background: "#0f172a",
                      borderRadius: "0.9rem",
                      padding: "1rem",
                      border: "1px solid #1f2937",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "4px",
                        background: c.color || "#334155",
                      }}
                    />

                    <header
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <h2
                          style={{
                            fontSize: "1.15rem",
                            fontWeight: 800,
                            marginBottom: "0.25rem",
                          }}
                        >
                          <span style={{ marginRight: "0.5rem" }}>
                            {c.icon || "📦"}
                          </span>
                          {c.name}
                        </h2>
                        <p style={{ fontSize: "0.9rem", color: "#cbd5f5" }}>
                          {c.description || "Sin descripción"}
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          Orden
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                          {c.sortOrder ?? "-"}
                        </div>
                      </div>
                    </header>

                    <div
                      style={{
                        marginTop: "0.75rem",
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0.35rem 0.65rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        ...getConsumptionTypeStyles(c.consumptionType ?? null),
                      }}
                    >
                      {getConsumptionTypeLabel(c.consumptionType ?? null)}
                    </div>

                    <div
                      style={{
                        marginTop: "0.8rem",
                        fontSize: "0.78rem",
                        color: "#94a3b8",
                      }}
                    >
                      ID: <span style={{ color: "#e5e7eb" }}>{c.id}</span>
                    </div>

                    {isAdmin && (
                      <div
                        style={{
                          marginTop: "0.9rem",
                          display: "flex",
                          gap: "0.5rem",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          style={{
                            padding: "0.55rem 0.9rem",
                            borderRadius: "0.7rem",
                            border: "1px solid #334155",
                            background: "transparent",
                            color: "#e5e7eb",
                            fontWeight: 800,
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => openDelete(c)}
                          style={{
                            padding: "0.55rem 0.9rem",
                            borderRadius: "0.7rem",
                            border: "1px solid #7f1d1d",
                            background: "transparent",
                            color: "#fecaca",
                            fontWeight: 900,
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.6rem",
  border: "1px solid #374151",
  background: "#020617",
  color: "#e5e7eb",
};