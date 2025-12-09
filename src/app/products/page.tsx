"use client";

import { useEffect, useState } from "react";
import { getProducts, Product } from "../lib/api";


export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [availableFilter, setAvailableFilter] = useState<"" | "true" | "false">(
    "true"
  );
  const [categoryFilter, setCategoryFilter] = useState("pizzas");

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

      {/* Filtros */}
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
