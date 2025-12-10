"use client";

import { useEffect, useState } from "react";
import {
  getProducts,
  type Product,
  createProduct,
  type CreateProductPayload,
} from "../lib/api";

type UserRole = "admin" | "employee" | "customer" | string | null;

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
  const [categoryId, setCategoryId] = useState("pizzas");
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
    if (!categoryId.trim()) {
      setCreateError("La categoría es obligatoria (categoryId).");
      return;
    }

    const payload: CreateProductPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: Number(price),
      categoryId: categoryId.trim(),
      status: status || undefined,
      isAvailable,
      imageUrl: imageUrl.trim() || undefined,
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      costPrice: costPrice.trim() ? Number(costPrice) : undefined,
      preparationTime: preparationTime.trim()
        ? Number(preparationTime)
        : undefined,
      calories: calories.trim() ? Number(calories) : undefined,

      isVegan,
      isGlutenFree,
      isSpicy,
      spicyLevel: spicyLevel.trim() ? Number(spicyLevel) : undefined,
      isPopular,
      discountPercentage: discountPercentage.trim()
        ? Number(discountPercentage)
        : undefined,
      minimumAge: minimumAge.trim() ? Number(minimumAge) : undefined,

      allergens: allergensStr
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      ingredients: ingredientsStr
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      tags: tagsStr
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      nutritionalInfo:
        protein || carbs || fat || fiber || sodium
          ? {
              protein: Number(protein || 0),
              carbs: Number(carbs || 0),
              fat: Number(fat || 0),
              fiber: Number(fiber || 0),
              sodium: Number(sodium || 0),
            }
          : undefined,
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

      // refrescar listado
      await fetchData();

      // limpiar campos básicos (no todo para no volver loco al admin)
      setName("");
      setDescription("");
      setPrice("");
      setCostPrice("");
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

      {/* Info de rol */}
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

      {/* =======================
          FORM CREAR PRODUCTO (ADMIN)
      ======================== */}
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

            {/* categoryId */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Category ID *
              </label>
              <input
                type="text"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder="pizzas, burgers..."
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
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

            {/* Barcode */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Código de barras
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* imageUrl */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Imagen principal (URL)
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Status */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
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

            {/* isAvailable */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Disponible
              </label>
              <select
                value={isAvailable ? "true" : "false"}
                onChange={(e) =>
                  setIsAvailable(e.target.value === "true" ? true : false)
                }
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* preparación */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Tiempo preparación (min)
              </label>
              <input
                type="number"
                min={0}
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Calorías */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Calorías
              </label>
              <input
                type="number"
                min={0}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* booleanos */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <label style={{ fontSize: "0.85rem" }}>Opciones</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.8rem" }}>
                  <input
                    type="checkbox"
                    checked={isVegan}
                    onChange={(e) => setIsVegan(e.target.checked)}
                    style={{ marginRight: "0.3rem" }}
                  />
                  Vegano
                </label>
                <label style={{ fontSize: "0.8rem" }}>
                  <input
                    type="checkbox"
                    checked={isGlutenFree}
                    onChange={(e) => setIsGlutenFree(e.target.checked)}
                    style={{ marginRight: "0.3rem" }}
                  />
                  Sin gluten
                </label>
                <label style={{ fontSize: "0.8rem" }}>
                  <input
                    type="checkbox"
                    checked={isSpicy}
                    onChange={(e) => setIsSpicy(e.target.checked)}
                    style={{ marginRight: "0.3rem" }}
                  />
                  Picante
                </label>
                <label style={{ fontSize: "0.8rem" }}>
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    style={{ marginRight: "0.3rem" }}
                  />
                  Popular
                </label>
              </div>
            </div>

            {/* spicy level */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Nivel picante (0–3)
              </label>
              <input
                type="number"
                min={0}
                max={3}
                value={spicyLevel}
                onChange={(e) => setSpicyLevel(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* descuento */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Descuento (%) 
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* edad mínima */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Edad mínima
              </label>
              <input
                type="number"
                min={0}
                value={minimumAge}
                onChange={(e) => setMinimumAge(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Alérgenos */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Alérgenos (separados por coma)
              </label>
              <input
                type="text"
                value={allergensStr}
                onChange={(e) => setAllergensStr(e.target.value)}
                placeholder="gluten, lácteos..."
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Ingredientes */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Ingredientes (separados por coma)
              </label>
              <input
                type="text"
                value={ingredientsStr}
                onChange={(e) => setIngredientsStr(e.target.value)}
                placeholder="tomate, mozzarella, albahaca..."
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Tags */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Tags (separados por coma)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="promo, 2x1, etc."
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Nutritional info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <label style={{ fontSize: "0.85rem" }}>
                Información nutricional (por porción)
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                  gap: "0.4rem",
                }}
              >
                <input
                  type="number"
                  placeholder="Prot"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  style={{
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.8rem",
                  }}
                />
                <input
                  type="number"
                  placeholder="Carb"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  style={{
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.8rem",
                  }}
                />
                <input
                  type="number"
                  placeholder="Grasa"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  style={{
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.8rem",
                  }}
                />
                <input
                  type="number"
                  placeholder="Fibra"
                  value={fiber}
                  onChange={(e) => setFiber(e.target.value)}
                  style={{
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.8rem",
                  }}
                />
                <input
                  type="number"
                  placeholder="Sodio"
                  value={sodium}
                  onChange={(e) => setSodium(e.target.value)}
                  style={{
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.6rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.8rem",
                  }}
                />
              </div>
            </div>

            {/* Botón crear */}
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

      {/* Filtros de listado */}
      <section
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.85rem" }}>Disponibilidad</label>
          <select
            value={availableFilter}
            onChange={(e) => setAvailableFilter(e.target.value as any)}
            style={{
              minWidth: "160px",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #374151",
              background: "#020617",
              color: "#e5e7eb",
            }}
          >
            <option value="">Todos</option>
            <option value="true">Solo disponibles</option>
            <option value="false">Solo no disponibles</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.85rem" }}>Categoría</label>
          <input
            type="text"
            placeholder="pizzas, burgers..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              minWidth: "200px",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.6rem",
              border: "1px solid #374151",
              background: "#020617",
              color: "#e5e7eb",
            }}
          />
        </div>

        <button
          type="button"
          onClick={fetchData}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.7rem",
            border: "none",
            background: "#22c55e",
            color: "#022c22",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Aplicar filtros
        </button>
      </section>

      {/* Estado de carga / error */}
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

      {/* Lista de productos */}
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
                      ${p.price.toFixed(2)}
                    </span>
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
