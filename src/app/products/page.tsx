"use client";

import { useEffect, useState } from "react";
import {
  getProducts,
  type Product,
  createProduct,
  type CreateProductPayload,
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
  const [categoryFilter, setCategoryFilter] = useState("pizzas");

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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

              {/* opcional: mostrar el UUID seleccionado chiquito */}
              {categoryId && (
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
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

            {/* --- el resto de tu form sigue igual --- */}
            {/* (te lo dejé igual a tu código original para no sacarte nada) */}

            {/* ...tu código sin cambios desde Barcode hasta el botón Crear... */}

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

      {/* ...tu listado y filtros quedan igual... */}

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
                    <span style={{ fontWeight: 700 }}>${p.price.toFixed(2)}</span>
                  </header>

                  <p style={{ fontSize: "0.9rem", color: "#cbd5f5" }}>
                    {p.description}
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
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
