"use client";

import { useEffect, useState } from "react";
import {
  getProducts,
  type Product,
  createProduct,
  type CreateProductPayload,
  updateProduct,
  type UpdateProductPayload,
  deleteProduct, // ✅ NUEVO
} from "../lib/api";

type UserRole = "admin" | "employee" | "customer" | string | null;

// ✅ Lista de categorías (editá/expandí acá)
const CATEGORY_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "", label: "Seleccionar categoría..." },
  { id: "42088847-c2a6-401f-854c-1e1a336626c5", label: "Pizzas" },
  { id: "11111111-1111-1111-1111-111111111111", label: "Burgers" },
  { id: "22222222-2222-2222-2222-222222222222", label: "Bebidas" },
  { id: "33333333-3333-3333-3333-333333333333", label: "Postres" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [availableFilter, setAvailableFilter] = useState<"" | "true" | "false">(
    "true"
  );

  // ✅ ANTES: "pizzas" (eso te filtraba siempre y por eso veías 1 solo)
  // ✅ AHORA: "" (no manda category y trae todos)
  const [categoryFilter, setCategoryFilter] = useState("");

  // 👑 ROLE (para mostrar el form SOLO a admin)
  const [role, setRole] = useState<UserRole>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("festgo_user");
    if (!raw) {
      setCheckingRole(false);
      return;
    }

    try {
      const user = JSON.parse(raw) as { role?: string };
      setRole(user.role ?? null);
    } catch {
      setRole(null);
    } finally {
      setCheckingRole(false);
    }
  }, []);

  const isAdmin = role === "admin";

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await getProducts({
        available:
          availableFilter === ""
            ? undefined
            : availableFilter === "true"
            ? true
            : false,

        // ✅ Solo mandamos category si hay algo seleccionado (UUID o lo que sea que espere tu backend)
        category: categoryFilter || undefined,
      });

      if (res.success && res.data) {
        setProducts(res.data);
      } else {
        setErrorMsg(res.message || "Error al obtener productos");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error de red");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Si en algún momento cambiás filtros, refresca solo
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableFilter, categoryFilter]);

  /* ============================
     FORM CREAR PRODUCTO (ADMIN)
     ============================ */

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [categoryId, setCategoryId] = useState(""); // ✅ ahora select
  const [code, setCode] = useState(""); // ✅ Swagger requiere code
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [status, setStatus] = useState("available");
  const [preparationTime, setPreparationTime] = useState("");
  const [calories, setCalories] = useState("");

  const [isVegan, setIsVegan] = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isSpicy, setIsSpicy] = useState(false);
  const [spicyLevel, setSpicyLevel] = useState("");
  const [isPopular, setIsPopular] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [minimumAge, setMinimumAge] = useState("");

  const [allergensStr, setAllergensStr] = useState("");
  const [ingredientsStr, setIngredientsStr] = useState("");
  const [tagsStr, setTagsStr] = useState("");

  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sodium, setSodium] = useState("");

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!isAdmin) {
      setCreateError("Solo un usuario con rol ADMIN puede crear productos.");
      return;
    }

    if (!name.trim()) {
      setCreateError("El nombre es obligatorio.");
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      setCreateError("El precio es obligatorio y debe ser un número.");
      return;
    }
    if (!code.trim()) {
      setCreateError("El código es obligatorio (code).");
      return;
    }
    if (!categoryId.trim()) {
      setCreateError("La categoría es obligatoria (categoryId).");
      return;
    }

    const payload: CreateProductPayload = {
      name: name.trim(),
      price: Number(price),
      code: code.trim(),
      categoryId: categoryId.trim(),
    };

    try {
      setCreating(true);
      const res = await createProduct(payload);

      if (!res.success || !res.data) {
        setCreateError(res.message || "No se pudo crear el producto.");
        return;
      }

      setCreateSuccess(
        `Producto creado correctamente: ${res.data.name} (ID: ${res.data.id})`
      );

      await fetchData();

      setName("");
      setDescription("");
      setPrice("");
      setCostPrice("");
      setCode("");
      setSku("");
      setBarcode("");
      setImageUrl("");
      setPreparationTime("");
      setCalories("");
      setAllergensStr("");
      setIngredientsStr("");
      setTagsStr("");
      setProtein("");
      setCarbs("");
      setFat("");
      setFiber("");
      setSodium("");
      setCategoryId(""); // ✅ reset select
    } catch (err: any) {
      setCreateError(
        err?.message ||
          "Error inesperado al crear el producto. Verificá que tengas sesión como admin."
      );
    } finally {
      setCreating(false);
    }
  };

  /* ============================
     EDITAR PRODUCTO (ADMIN) - PUT /products/:id
     ============================ */

  const [editingOpen, setEditingOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCostPrice, setEditCostPrice] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editStatus, setEditStatus] = useState("available");
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [editPreparationTime, setEditPreparationTime] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [editIsVegan, setEditIsVegan] = useState(false);
  const [editIsGlutenFree, setEditIsGlutenFree] = useState(false);
  const [editIsSpicy, setEditIsSpicy] = useState(false);
  const [editIsPopular, setEditIsPopular] = useState(false);
  const [editDiscountPercentage, setEditDiscountPercentage] = useState("");
  const [editMinimumAge, setEditMinimumAge] = useState("");

  const openEdit = (p: Product) => {
    setUpdateError(null);
    setUpdateSuccess(null);

    setEditingProduct(p);
    setEditingOpen(true);

    setEditName(p.name ?? "");
    setEditCode(p.code ?? "");
    setEditDescription(p.description ?? "");
    setEditPrice(p.price !== undefined && p.price !== null ? String(p.price) : "");
    setEditCostPrice(
      (p as any)?.costPrice !== undefined && (p as any)?.costPrice !== null
        ? String((p as any).costPrice)
        : ""
    );
    setEditCategoryId(p.categoryId ?? "");
    setEditStatus(p.status ?? "available");
    setEditIsAvailable(Boolean(p.isAvailable));
    setEditPreparationTime(
      (p as any)?.preparationTime !== undefined && (p as any)?.preparationTime !== null
        ? String((p as any).preparationTime)
        : ""
    );
    setEditCalories(
      (p as any)?.calories !== undefined && (p as any)?.calories !== null
        ? String((p as any).calories)
        : ""
    );

    setEditIsVegan(Boolean((p as any)?.isVegan));
    setEditIsGlutenFree(Boolean((p as any)?.isGlutenFree));
    setEditIsSpicy(Boolean((p as any)?.isSpicy));
    setEditIsPopular(Boolean((p as any)?.isPopular));
    setEditDiscountPercentage(
      (p as any)?.discountPercentage !== undefined && (p as any)?.discountPercentage !== null
        ? String((p as any).discountPercentage)
        : "0"
    );
    setEditMinimumAge(
      (p as any)?.minimumAge !== undefined && (p as any)?.minimumAge !== null
        ? String((p as any).minimumAge)
        : "0"
    );
  };

  const closeEdit = () => {
    setEditingOpen(false);
    setEditingProduct(null);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);

    if (!isAdmin) {
      setUpdateError("Solo un usuario con rol ADMIN puede actualizar productos.");
      return;
    }
    if (!editingProduct?.id) {
      setUpdateError("No hay producto seleccionado para editar.");
      return;
    }

    if (!editName.trim()) {
      setUpdateError("El nombre es obligatorio.");
      return;
    }
    if (!editCode.trim()) {
      setUpdateError("El code es obligatorio.");
      return;
    }
    if (!editCategoryId.trim()) {
      setUpdateError("La categoría es obligatoria.");
      return;
    }
    if (!editPrice.trim() || isNaN(Number(editPrice))) {
      setUpdateError("El precio es obligatorio y debe ser un número.");
      return;
    }

    const payload: UpdateProductPayload = {
      name: editName.trim(),
      code: editCode.trim(),
      description: editDescription.trim(),
      price: Number(editPrice),
      costPrice: editCostPrice.trim() ? Number(editCostPrice) : undefined,
      categoryId: editCategoryId.trim(),
      status: editStatus,
      isAvailable: editIsAvailable,
      preparationTime: editPreparationTime.trim()
        ? Number(editPreparationTime)
        : undefined,
      calories: editCalories.trim() ? Number(editCalories) : undefined,
      isVegan: editIsVegan,
      isGlutenFree: editIsGlutenFree,
      isSpicy: editIsSpicy,
      isPopular: editIsPopular,
      discountPercentage: editDiscountPercentage.trim()
        ? Number(editDiscountPercentage)
        : 0,
      minimumAge: editMinimumAge.trim() ? Number(editMinimumAge) : 0,
    };

    try {
      setUpdating(true);
      const res = await updateProduct(editingProduct.id, payload);

      if (!res.success || !res.data) {
        const ve = (res as any)?.validationErrors;
        setUpdateError(
          res.message ||
            (ve ? JSON.stringify(ve) : "No se pudo actualizar el producto.")
        );
        return;
      }

      setUpdateSuccess(`Producto actualizado: ${res.data.name}`);
      await fetchData();
      closeEdit();
    } catch (err: any) {
      setUpdateError(err?.message || "Error inesperado al actualizar.");
    } finally {
      setUpdating(false);
    }
  };

  /* ============================
     ELIMINAR PRODUCTO (ADMIN) - DELETE /products/:id
     ============================ */

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const openDelete = (p: Product) => {
    setDeleteError(null);
    setDeleteSuccess(null);
    setDeleteTarget(p);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    setDeleteError(null);
    setDeleteSuccess(null);

    if (!isAdmin) {
      setDeleteError("Solo un usuario con rol ADMIN puede eliminar productos.");
      return;
    }
    if (!deleteTarget?.id) {
      setDeleteError("No hay producto seleccionado para eliminar.");
      return;
    }

    try {
      setDeleting(true);
      const res = await deleteProduct(deleteTarget.id);

      if (!res.success) {
        setDeleteError(res.message || "No se pudo eliminar el producto.");
        return;
      }

      setDeleteSuccess("Producto eliminado exitosamente");
      await fetchData();
      closeDelete();
    } catch (err: any) {
      setDeleteError(err?.message || "Error inesperado al eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: "#020617",
        color: "#e5e7eb",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        Menú – Productos 🍕
      </h1>

      {!checkingRole && (
        <p
          style={{
            fontSize: "0.85rem",
            marginBottom: "0.75rem",
            color: isAdmin ? "#4ade80" : "#e5e7eb",
          }}
        >
          Rol actual: <strong>{role ?? "anónimo / sin sesión"}</strong>{" "}
          {isAdmin ? "(tenés permiso para crear productos)" : "(solo lectura)"}
        </p>
      )}

      {isAdmin && (
        <section
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            borderRadius: "0.9rem",
            background: "#020617",
            border: "1px solid #334155",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
            Crear nuevo producto (👑 Solo Admin)
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
            onSubmit={handleCreateProduct}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {/* Nombre */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Nombre *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Descripción */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Descripción
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Precio */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Precio *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Code */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Code *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CCP"
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Costo */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Costo (costPrice)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* ✅ categoryId SELECT */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Category ID (UUID) *
              </label>

              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id || "empty"} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              {categoryId && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    marginTop: "0.25rem",
                  }}
                >
                  UUID: {categoryId}
                </span>
              )}
            </div>

            {/* SKU */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                SKU
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-start",
              }}
            >
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: "0.7rem 1.2rem",
                  borderRadius: "0.7rem",
                  border: "none",
                  background: "#22c55e",
                  color: "#022c22",
                  fontWeight: 600,
                  cursor: creating ? "default" : "pointer",
                }}
              >
                {creating ? "Creando..." : "Crear producto"}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading && <p>Cargando productos...</p>}

      {errorMsg && !loading && (
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
          {errorMsg}
        </p>
      )}

      {!loading && !errorMsg && (
        <>
          {products.length === 0 ? (
            <p>No se encontraron productos con esos filtros.</p>
          ) : (
            <section
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {products.map((p) => (
                <article
                  key={p.id}
                  style={{
                    background: "#0f172a",
                    borderRadius: "0.9rem",
                    padding: "1rem",
                    border: "1px solid #1f2937",
                  }}
                >
                  <header
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        marginRight: "0.5rem",
                      }}
                    >
                      {p.name}
                    </h2>
                    <span style={{ fontWeight: 700 }}>
                      ${Number(p.price).toFixed(2)}
                    </span>
                  </header>

                  <p style={{ fontSize: "0.9rem", color: "#cbd5f5" }}>
                    {p.description || ""}
                  </p>

                  <p style={{ fontSize: "0.8rem", marginTop: "0.35rem" }}>
                    Estado:{" "}
                    <strong
                      style={{
                        color: p.isAvailable ? "#4ade80" : "#f87171",
                      }}
                    >
                      {p.isAvailable ? "Disponible" : "No disponible"}
                    </strong>
                  </p>

                  {p.allergens && p.allergens.length > 0 && (
                    <p
                      style={{
                        fontSize: "0.75rem",
                        marginTop: "0.4rem",
                        color: "#fbbf24",
                      }}
                    >
                      Alérgenos: {p.allergens.join(", ")}
                    </p>
                  )}

                  {p.nutritionalInfo && (
                    <p
                      style={{
                        fontSize: "0.75rem",
                        marginTop: "0.4rem",
                        color: "#9ca3af",
                      }}
                    >
                      {p.nutritionalInfo.calories} kcal •{" "}
                      {p.nutritionalInfo.protein}g prot •{" "}
                      {p.nutritionalInfo.carbs}g carb •{" "}
                      {p.nutritionalInfo.fat}g grasa
                    </p>
                  )}

                  {isAdmin && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        style={{
                          padding: "0.5rem 0.8rem",
                          borderRadius: "0.6rem",
                          border: "1px solid #334155",
                          background: "#111827",
                          color: "#e5e7eb",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Editar
                      </button>

                      {/* ✅ NUEVO: ELIMINAR */}
                      <button
                        type="button"
                        onClick={() => openDelete(p)}
                        style={{
                          padding: "0.5rem 0.8rem",
                          borderRadius: "0.6rem",
                          border: "1px solid #7f1d1d",
                          background: "#450a0a",
                          color: "#fecaca",
                          cursor: "pointer",
                          fontWeight: 800,
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

      {/* ============================
          MODAL EDITAR PRODUCTO
         ============================ */}
      {editingOpen && editingProduct && (
        <div
          onClick={closeEdit}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 100%)",
              background: "#0b1220",
              border: "1px solid #334155",
              borderRadius: "1rem",
              padding: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                Editar producto:{" "}
                <span style={{ color: "#93c5fd" }}>{editingProduct.name}</span>
              </h3>

              <button
                type="button"
                onClick={closeEdit}
                style={{
                  border: "1px solid #334155",
                  background: "#111827",
                  color: "#e5e7eb",
                  borderRadius: "0.6rem",
                  padding: "0.35rem 0.6rem",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            {updateError && (
              <p
                style={{
                  marginTop: "0.75rem",
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
                  marginTop: "0.75rem",
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

            <form
              onSubmit={handleUpdateProduct}
              style={{
                marginTop: "0.75rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Nombre *
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Code *
                </label>
                <input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Descripción
                </label>
                <input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Precio *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Costo (costPrice)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Categoría *
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.id || "empty"} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                >
                  <option value="available">available</option>
                  <option value="unavailable">unavailable</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <label style={{ fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={editIsAvailable}
                    onChange={(e) => setEditIsAvailable(e.target.checked)}
                    style={{ marginRight: "0.4rem" }}
                  />
                  Disponible
                </label>

                <label style={{ fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={editIsVegan}
                    onChange={(e) => setEditIsVegan(e.target.checked)}
                    style={{ marginRight: "0.4rem" }}
                  />
                  Vegan
                </label>

                <label style={{ fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={editIsGlutenFree}
                    onChange={(e) => setEditIsGlutenFree(e.target.checked)}
                    style={{ marginRight: "0.4rem" }}
                  />
                  Gluten Free
                </label>

                <label style={{ fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={editIsSpicy}
                    onChange={(e) => setEditIsSpicy(e.target.checked)}
                    style={{ marginRight: "0.4rem" }}
                  />
                  Spicy
                </label>

                <label style={{ fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={editIsPopular}
                    onChange={(e) => setEditIsPopular(e.target.checked)}
                    style={{ marginRight: "0.4rem" }}
                  />
                  Popular
                </label>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Preparation Time
                </label>
                <input
                  type="number"
                  value={editPreparationTime}
                  onChange={(e) => setEditPreparationTime(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Calories
                </label>
                <input
                  type="number"
                  value={editCalories}
                  onChange={(e) => setEditCalories(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Discount %
                </label>
                <input
                  type="number"
                  value={editDiscountPercentage}
                  onChange={(e) => setEditDiscountPercentage(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Minimum Age
                </label>
                <input
                  type="number"
                  value={editMinimumAge}
                  onChange={(e) => setEditMinimumAge(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={closeEdit}
                  style={{
                    padding: "0.65rem 1rem",
                    borderRadius: "0.7rem",
                    border: "1px solid #334155",
                    background: "transparent",
                    color: "#e5e7eb",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  style={{
                    padding: "0.65rem 1rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    background: "#22c55e",
                    color: "#022c22",
                    cursor: updating ? "default" : "pointer",
                    fontWeight: 800,
                  }}
                >
                  {updating ? "Actualizando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================
          ✅ MODAL ELIMINAR PRODUCTO
         ============================ */}
      {deleteOpen && deleteTarget && (
        <div
          onClick={closeDelete}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              background: "#0b1220",
              border: "1px solid #7f1d1d",
              borderRadius: "1rem",
              padding: "1rem",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
              Eliminar producto (⚠️ irreversible)
            </h3>

            <p style={{ marginTop: "0.75rem", color: "#e5e7eb", fontSize: "0.9rem" }}>
              Vas a eliminar permanentemente:{" "}
              <strong style={{ color: "#fecaca" }}>{deleteTarget.name}</strong>
            </p>

            {deleteError && (
              <p
                style={{
                  marginTop: "0.75rem",
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
                  marginTop: "0.75rem",
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

            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                style={{
                  padding: "0.65rem 1rem",
                  borderRadius: "0.7rem",
                  border: "1px solid #334155",
                  background: "transparent",
                  color: "#e5e7eb",
                  cursor: deleting ? "default" : "pointer",
                  fontWeight: 700,
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  padding: "0.65rem 1rem",
                  borderRadius: "0.7rem",
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  cursor: deleting ? "default" : "pointer",
                  fontWeight: 900,
                }}
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
