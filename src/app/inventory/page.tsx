"use client";

import { useState } from "react";
import { useEffect } from "react"; // 👈 nuevo import
import {
  getInventory,
  getInventoryLowStock,
  createInventory,
  InventoryItem,
  CreateInventoryPayload,
  getInventoryValue,
  InventoryValueSummary,
  getInventoryMovements, // 👈 NUEVO
  InventoryMovement, // 👈 NUEVO
  getInventoryById, // 👈 NUEVO: GET /inventory/{id}
  updateInventoryItem, // 👈 NUEVO: PATCH /inventory/{id}
  UpdateInventoryPayload, // 👈 NUEVO: tipo para actualizar
  deleteInventoryItem, // 👈 NUEVO: DELETE /inventory/{id}
  adjustInventoryStock, // 👈 NUEVO: POST /inventory/{id}/adjust-stock
  AdjustStockPayload, // 👈 NUEVO: tipo payload ajuste
  consumeInventoryItem, // 👈 NUEVO: POST /inventory/{id}/consume
  ConsumeStockPayload, // 👈 NUEVO: tipo payload consumo
} from "../lib/api";

// 👇 mismo tipo de rol que usaste en TopNav
type UserRole = "admin" | "employee" | "customer" | string | null;

export default function InventoryPage() {
  // 👇 control de permisos (admin / employee)
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

  const isStaff = role === "admin" || role === "employee";

  const [lowStock, setLowStock] = useState(true); // por defecto como en el curl
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 👉 estados para crear nuevo ítem
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateInventoryPayload>({
    productId: "",
    itemName: "",
    sku: "",
    currentStock: 0,
    minimumStock: 0,
    maximumStock: 0,
    unit: "",
    costPerUnit: 0,
    supplierId: "",
    expirationDate: "",
    location: "",
    notes: "",
  });

  // 👉 estados para el resumen de valor de inventario (API /inventory/value)
  const [valueSummary, setValueSummary] =
    useState<InventoryValueSummary | null>(null);
  const [loadingValue, setLoadingValue] = useState(false);

  // 👉 NUEVO: estados para movimientos de inventario
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [selectedItemIdForMovs, setSelectedItemIdForMovs] =
    useState<string>(""); // último ítem consultado
  const [itemIdFilter, setItemIdFilter] = useState<string>(""); // ítem elegido en el select

  // 👉 NUEVO: estados para buscar artículo por ID (GET /inventory/{id})
  const [detailId, setDetailId] = useState<string>(""); // ID escrito / seleccionado
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 👉 NUEVO: estados para edición del artículo
  const [editForm, setEditForm] = useState<UpdateInventoryPayload | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // 👉 NUEVO: estado para eliminar artículo
  const [deleting, setDeleting] = useState(false);

  // 👉 NUEVO: estados para ajuste manual de stock
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("Inventario físico");
  const [adjustNotes, setAdjustNotes] = useState<string>(
    "Ajuste por conteo físico"
  );
  const [adjusting, setAdjusting] = useState(false);

  // 👉 NUEVO: estados para consumo de stock
  const [consumeQuantity, setConsumeQuantity] = useState<number>(0);
  const [consumeReference, setConsumeReference] =
    useState<string>("order-123");
  const [consuming, setConsuming] = useState(false);

  // ✅ ESTE useEffect TIENE QUE IR ANTES DE CUALQUIER RETURN CONDICIONAL
  // cuando cambia detailItem, rellenamos el formulario de edición
  useEffect(() => {
    if (!detailItem) {
      setEditForm(null);
      return;
    }

    setEditForm({
      productId: detailItem.productId || "",
      itemName: detailItem.itemName,
      sku: detailItem.sku,
      currentStock: detailItem.currentStock,
      minimumStock: detailItem.minimumStock,
      maximumStock: detailItem.maximumStock,
      unit: detailItem.unit,
      costPerUnit: detailItem.costPerUnit,
      supplierId: detailItem.supplierId,
      expirationDate: detailItem.expirationDate || "",
      location: detailItem.location,
      notes: detailItem.notes || "",
    });

    // reset de formulario de ajuste al cambiar de ítem
    setAdjustQuantity(0);
    setAdjustReason("Inventario físico");
    setAdjustNotes("Ajuste por conteo físico");

    // reset de formulario de consumo al cambiar de ítem
    setConsumeQuantity(0);
    setConsumeReference("order-123");
  }, [detailItem]);

  const handleChange = (
    field: keyof CreateInventoryPayload,
    value: string | number
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 👉 cambios del formulario de edición
  const handleEditChange = (
    field: keyof UpdateInventoryPayload,
    value: string | number
  ) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleFetch = async () => {
    setLoading(true);
    setErrorMsg("");
    setItems([]);

    try {
      const res = lowStock
        ? await getInventoryLowStock()
        : await getInventory();

      if (res.success && res.data) {
        setItems(res.data);
      } else {
        setErrorMsg(res.message || "Error desconocido");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado");
    }

    setLoading(false);
  };

  // 👉 GET /inventory/value
  const handleFetchValue = async () => {
    setLoadingValue(true);
    setErrorMsg("");
    setValueSummary(null);

    try {
      const res = await getInventoryValue();

      if (res.success && res.data) {
        setValueSummary(res.data);
      } else {
        setErrorMsg(
          res.message || "No se pudo obtener el valor total del inventario"
        );
      }
    } catch (err: any) {
      setErrorMsg(
        err.message || "Error inesperado al calcular valor de inventario"
      );
    } finally {
      setLoadingValue(false);
    }
  };

  // 👉 GET /inventory/movements
  const handleFetchMovements = async (itemId?: string) => {
    setLoadingMovements(true);
    setErrorMsg("");
    setMovements([]);
    setSelectedItemIdForMovs(itemId || "");

    try {
      const res = await getInventoryMovements(itemId ? { itemId } : undefined);

      if (res.success && res.data) {
        setMovements(res.data);
      } else {
        setErrorMsg(
          res.message || "No se pudieron obtener los movimientos de inventario"
        );
      }
    } catch (err: any) {
      setErrorMsg(
        err.message || "Error inesperado al obtener movimientos de inventario"
      );
    } finally {
      setLoadingMovements(false);
    }
  };

  // 👉 NUEVO: GET /inventory/{id} (acepta ID opcional para usar desde el select)
  const handleFetchById = async (forcedId?: string) => {
    const idToUse = (forcedId ?? detailId).trim();
    if (!idToUse) return;

    setLoadingDetail(true);
    setErrorMsg("");
    setDetailItem(null);

    try {
      const res = await getInventoryById(idToUse);

      if (res.success && res.data) {
        setDetailItem(res.data);
      } else {
        setErrorMsg(res.message || "No se pudo obtener el artículo por ID");
      }
    } catch (err: any) {
      setErrorMsg(
        err.message || "Error inesperado al buscar artículo por ID"
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  // 👉 NUEVO: PATCH /inventory/{id}
  const handleSaveEdit = async () => {
    if (!detailItem || !editForm) return;

    setSavingEdit(true);
    setErrorMsg("");

    // nos aseguramos de castear los numéricos
    const payload: UpdateInventoryPayload = {
      ...editForm,
      currentStock:
        editForm.currentStock !== undefined
          ? Number(editForm.currentStock)
          : undefined,
      minimumStock:
        editForm.minimumStock !== undefined
          ? Number(editForm.minimumStock)
          : undefined,
      maximumStock:
        editForm.maximumStock !== undefined
          ? Number(editForm.maximumStock)
          : undefined,
      costPerUnit:
        editForm.costPerUnit !== undefined
          ? Number(editForm.costPerUnit)
          : undefined,
    };

    try {
      const res = await updateInventoryItem(detailItem.id, payload);

      if (res.success && res.data) {
        // actualizamos el detalle
        setDetailItem(res.data);

        // y sincronizamos la card en el listado
        setItems((prev) =>
          prev.map((it) =>
            it.id === res.data!.id ? { ...it, ...res.data! } : it
          )
        );
      } else {
        setErrorMsg(
          res.message || "No se pudo actualizar el artículo de inventario"
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al actualizar artículo");
    } finally {
      setSavingEdit(false);
    }
  };

  // 👉 NUEVO: ajustar stock manualmente (POST /inventory/{id}/adjust-stock)
  const handleAdjustStock = async () => {
    if (!detailItem) return;

    setAdjusting(true);
    setErrorMsg("");

    const payload: AdjustStockPayload = {
      quantity: Number(adjustQuantity),
      reason: adjustReason || "Ajuste manual",
      notes: adjustNotes || undefined,
    };

    try {
      const res = await adjustInventoryStock(detailItem.id, payload);

      if (res.success) {
        // refrescamos el detalle desde GET /inventory/{id}
        const refreshed = await getInventoryById(detailItem.id);
        if (refreshed.success && refreshed.data) {
          setDetailItem(refreshed.data);
          setItems((prev) =>
            prev.map((it) =>
              it.id === refreshed.data!.id ? refreshed.data! : it
            )
          );
        }

        // refrescar movimientos si estás filtrando por ese ítem
        if (
          selectedItemIdForMovs === detailItem.id ||
          itemIdFilter === detailItem.id
        ) {
          await handleFetchMovements(detailItem.id);
        }

        // opcional: dejar cantidad en 0 luego del ajuste
        setAdjustQuantity(0);
      } else {
        setErrorMsg(res.message || "No se pudo ajustar el stock");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al ajustar stock");
    } finally {
      setAdjusting(false);
    }
  };

  // 👉 NUEVO: registrar consumo de stock (POST /inventory/{id}/consume)
  const handleConsumeStock = async () => {
    if (!detailItem) return;
    if (!consumeQuantity || consumeQuantity <= 0) return;

    setConsuming(true);
    setErrorMsg("");

    const payload: ConsumeStockPayload = {
      quantity: Number(consumeQuantity),
      reference: consumeReference || undefined,
    };

    try {
      const res = await consumeInventoryItem(detailItem.id, payload);

      if (res.success) {
        // refrescamos el detalle con el stock actualizado
        const refreshed = await getInventoryById(detailItem.id);
        if (refreshed.success && refreshed.data) {
          setDetailItem(refreshed.data);
          setItems((prev) =>
            prev.map((it) =>
              it.id === refreshed.data!.id ? refreshed.data! : it
            )
          );
        }

        // refrescar movimientos si estás viendo los de ese ítem
        if (
          selectedItemIdForMovs === detailItem.id ||
          itemIdFilter === detailItem.id
        ) {
          await handleFetchMovements(detailItem.id);
        }

        setConsumeQuantity(0);
      } else {
        setErrorMsg(res.message || "No se pudo registrar el consumo de stock");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al consumir stock");
    } finally {
      setConsuming(false);
    }
  };

  // 👉 NUEVO: DELETE /inventory/{id}
  const handleDeleteItem = async () => {
    if (!detailItem) return;

    // confirmación básica
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "¿Seguro que querés eliminar este artículo del inventario? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    setDeleting(true);
    setErrorMsg("");

    try {
      const res = await deleteInventoryItem(detailItem.id);

      if (res.success) {
        // sacamos el ítem del listado
        setItems((prev) => prev.filter((it) => it.id !== detailItem.id));
        // limpiamos detalle y movimientos
        setDetailItem(null);
        setMovements([]);
        setSelectedItemIdForMovs("");
        setItemIdFilter("");
      } else {
        setErrorMsg(
          res.message || "No se pudo eliminar el artículo de inventario"
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al eliminar artículo");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg("");

    try {
      const payload: CreateInventoryPayload = {
        ...form,
        currentStock: Number(form.currentStock),
        minimumStock: Number(form.minimumStock),
        maximumStock: Number(form.maximumStock),
        costPerUnit: Number(form.costPerUnit),
      };

      const res = await createInventory(payload);

      if (res.success && res.data) {
        // agregamos el nuevo item al listado (al principio)
        setItems((prev) => [res.data!, ...prev]);
        // reseteamos el formulario
        setForm({
          productId: "",
          itemName: "",
          sku: "",
          currentStock: 0,
          minimumStock: 0,
          maximumStock: 0,
          unit: "",
          costPerUnit: 0,
          supplierId: "",
          expirationDate: "",
          location: "",
          notes: "",
        });
      } else {
        setErrorMsg(
          res.message ||
            "No se pudo crear el artículo. Revisá los datos enviados."
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al crear artículo");
    } finally {
      setCreating(false);
    }
  };

  // ⛔️ Mientras chequeamos el rol, mostramos loading simple
  if (checkingRole) {
    return (
      <main
        style={{
          padding: "2rem",
          color: "white",
          background: "#0f172a",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>📦 Inventario</h1>
        <p style={{ color: "#9ca3af" }}>Cargando permisos...</p>
      </main>
    );
  }

  // ⛔️ Si NO es admin / employee, bloqueamos la vista
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
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>📦 Inventario</h1>
        <p style={{ color: "#f87171", maxWidth: "520px" }}>
          No tenés permisos para ver esta página. Solo el staff del bar
          (administradores y empleados) puede acceder al módulo de inventario.
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: "2rem",
        color: "white",
        background: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>📦 Inventario</h1>

      {errorMsg && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }}>{errorMsg}</p>
      )}

      {/* FORMULARIO CREAR ARTÍCULO INVENTARIO */}
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
          Crear nuevo artículo de inventario
        </h2>

        <form
          onSubmit={handleCreate}
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>productId (UUID del producto)</label>
            <input
              type="text"
              value={form.productId}
              onChange={(e) => handleChange("productId", e.target.value)}
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Nombre del ítem (itemName)</label>
            <input
              type="text"
              value={form.itemName}
              onChange={(e) => handleChange("itemName", e.target.value)}
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Stock actual</label>
            <input
              type="number"
              value={form.currentStock}
              onChange={(e) =>
                handleChange("currentStock", Number(e.target.value))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Stock mínimo</label>
            <input
              type="number"
              value={form.minimumStock}
              onChange={(e) =>
                handleChange("minimumStock", Number(e.target.value))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Stock máximo</label>
            <input
              type="number"
              value={form.maximumStock}
              onChange={(e) =>
                handleChange("maximumStock", Number(e.target.value))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Unidad (kg, l, u, etc.)</label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => handleChange("unit", e.target.value)}
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Costo por unidad</label>
            <input
              type="number"
              step="0.01"
              value={form.costPerUnit}
              onChange={(e) =>
                handleChange("costPerUnit", Number(e.target.value))
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>supplierId (UUID del proveedor)</label>
            <input
              type="text"
              value={form.supplierId}
              onChange={(e) => handleChange("supplierId", e.target.value)}
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Fecha de vencimiento (ISO)</label>
            <input
              type="text"
              placeholder="2025-12-30T00:00:00.000Z"
              value={form.expirationDate}
              onChange={(e) =>
                handleChange("expirationDate", e.target.value)
              }
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Ubicación</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              style={{ padding: "0.4rem", borderRadius: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Notas</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
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
              {creating ? "Creando..." : "Crear artículo"}
            </button>
          </div>
        </form>
      </section>

      {/* RESUMEN DE VALOR DEL INVENTARIO */}
      <section
        style={{
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #334155",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>
            Valor total del inventario
          </h2>
          {valueSummary ? (
            <>
              <p style={{ fontSize: "0.95rem" }}>
                <strong>Total:</strong>{" "}
                {valueSummary.totalValue.toLocaleString("es-AR", {
                  style: "currency",
                  currency: valueSummary.currency || "USD",
                })}
              </p>
              {typeof valueSummary.itemCount === "number" && (
                <p style={{ fontSize: "0.85rem", color: "#cbd5f5" }}>
                  Ítems: {valueSummary.itemCount}
                </p>
              )}
              {typeof valueSummary.averageValuePerItem === "number" && (
                <p style={{ fontSize: "0.85rem", color: "#cbd5f5" }}>
                  Promedio por ítem:{" "}
                  {valueSummary.averageValuePerItem.toLocaleString("es-AR", {
                    style: "currency",
                    currency: valueSummary.currency || "USD",
                  })}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
              Hacé clic en "Calcular valor" para ver el resumen.
            </p>
          )}
        </div>

        <button
          onClick={handleFetchValue}
          disabled={loadingValue}
          style={{
            padding: "0.7rem 1.4rem",
            background: "#eab308",
            color: "#022c22",
            borderRadius: "0.6rem",
            fontWeight: 700,
            border: "none",
            cursor: loadingValue ? "default" : "pointer",
            minWidth: "180px",
          }}
        >
          {loadingValue ? "Calculando..." : "Calcular valor"}
        </button>
      </section>

      {/* CONTROLES DE LISTADO */}
      <div
        style={{
          background: "#1e293b",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => setLowStock(e.target.checked)}
          />
          Mostrar SOLO artículos con stock bajo (lowStock=true)
        </label>

        <button
          onClick={handleFetch}
          style={{
            padding: "0.7rem 1.2rem",
            background: "#3b82f6",
            borderRadius: "0.6rem",
            fontWeight: "bold",
          }}
        >
          {loading ? "Buscando..." : "Buscar inventario"}
        </button>
      </div>

      {/* LISTADO DE INVENTARIO */}
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          marginBottom: "2rem",
        }}
      >
        {items.map((it, idx) => (
          <div
            key={`${it.id ?? "no-id"}-${idx}`}
            style={{
              background: "#1e293b",
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "1px solid #334155",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>
              {it.itemName} {it.sku ? `(${it.sku})` : ""}
            </h3>
            <p>
              <strong>Stock actual:</strong> {it.currentStock} {it.unit}
            </p>
            <p>
              <strong>Mínimo:</strong> {it.minimumStock} |{" "}
              <strong>Máximo:</strong> {it.maximumStock}
            </p>
            <p>
              <strong>Costo/unidad:</strong> ${it.costPerUnit}
            </p>
            <p>
              <strong>Proveedor:</strong> {it.supplierId}
            </p>
            <p>
              <strong>Ubicación:</strong> {it.location}
            </p>
            {it.lastStockUpdate && (
              <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Última actualización:{" "}
                {new Date(it.lastStockUpdate).toLocaleString()}
              </p>
            )}

            {/* 👉 botón para ver movimientos del ítem */}
            <button
              onClick={() => {
                setItemIdFilter(it.id); // sincroniza el select
                handleFetchMovements(it.id); // busca movimientos
              }}
              style={{
                marginTop: "0.75rem",
                padding: "0.5rem 0.9rem",
                background: "#0ea5e9",
                borderRadius: "0.5rem",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Ver movimientos
            </button>
          </div>
        ))}
      </div>

      {/* NUEVO: BUSCAR ARTÍCULO POR ID (GET /inventory/{id}) */}
      <section
        style={{
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #334155",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
          Buscar artículo por ID
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          {/* INPUT MANUAL */}
          <input
            type="text"
            placeholder="bb3226f3-615e-4b59-9695-aeee361fdee5"
            value={detailId}
            onChange={(e) => setDetailId(e.target.value)}
            style={{
              flex: "2 1 260px",
              padding: "0.5rem 0.7rem",
              borderRadius: "0.5rem",
              border: "1px solid #334155",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: "0.9rem",
            }}
          />

          {/* 👇 SELECT CON LOS ARTÍCULOS PARA ELEGIR EL ID */}
          <select
            value={detailId}
            onChange={(e) => {
              const val = e.target.value;
              setDetailId(val);
              if (val) {
                // buscamos automáticamente al elegir el ítem
                handleFetchById(val);
              }
            }}
            style={{
              flex: "2 1 260px",
              padding: "0.5rem 0.7rem",
              borderRadius: "0.5rem",
              border: "1px solid #334155",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: "0.9rem",
            }}
          >
            <option value="">Seleccioná un artículo...</option>
            {items.map((it, idx) => (
              <option key={`${it.id ?? "no-id"}-detail-${idx}`} value={it.id}>
                {it.itemName} {it.sku ? `(${it.sku})` : ""} – {it.id}
              </option>
            ))}
          </select>

          <button
            onClick={() => handleFetchById()}
            disabled={loadingDetail || !detailId.trim()}
            style={{
              padding: "0.6rem 1.2rem",
              background: "#3b82f6",
              borderRadius: "0.6rem",
              border: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor:
                loadingDetail || !detailId.trim() ? "default" : "pointer",
              opacity: !detailId.trim() ? 0.7 : 1,
            }}
          >
            {loadingDetail ? "Buscando..." : "Buscar por ID"}
          </button>
        </div>

        {detailItem && (
          <div
            style={{
              background: "#0b1120",
              borderRadius: "0.75rem",
              border: "1px solid #1f2937",
              padding: "1rem",
            }}
          >
            <h3 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>
              {detailItem.itemName}{" "}
              {detailItem.sku ? `(${detailItem.sku})` : ""}
            </h3>
            <p>
              <strong>ID:</strong> {detailItem.id}
            </p>
            <p>
              <strong>productId:</strong> {detailItem.productId}
            </p>
            <p>
              <strong>Stock actual:</strong> {detailItem.currentStock}{" "}
              {detailItem.unit}
            </p>
            <p>
              <strong>Mínimo:</strong> {detailItem.minimumStock} |{" "}
              <strong>Máximo:</strong> {detailItem.maximumStock}
            </p>
            <p>
              <strong>Costo/unidad:</strong> {detailItem.costPerUnit}
            </p>
            <p>
              <strong>Proveedor:</strong> {detailItem.supplierId}
            </p>
            <p>
              <strong>Ubicación:</strong> {detailItem.location}
            </p>
            {detailItem.expirationDate && (
              <p>
                <strong>Vencimiento:</strong>{" "}
                {new Date(detailItem.expirationDate).toLocaleString()}
              </p>
            )}
            {detailItem.notes && (
              <p>
                <strong>Notas:</strong> {detailItem.notes}
              </p>
            )}
            {detailItem.createdAt && (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                Creado: {new Date(detailItem.createdAt).toLocaleString()}
              </p>
            )}
            {detailItem.updatedAt && (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                Actualizado: {new Date(detailItem.updatedAt).toLocaleString()}
              </p>
            )}

            {/* 🔧 FORMULARIO DE EDICIÓN */}
            {editForm && (
              <>
                <hr
                  style={{
                    borderColor: "#1f2937",
                    margin: "0.75rem 0 0.5rem",
                  }}
                />
                <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                  Editar artículo
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "0.8rem" }}>Stock actual</label>
                    <input
                      type="number"
                      value={editForm.currentStock ?? ""}
                      onChange={(e) =>
                        handleEditChange(
                          "currentStock",
                          Number(e.target.value)
                        )
                      }
                      style={{
                        padding: "0.4rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #334155",
                        background: "#020617",
                        color: "#e5e7eb",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "0.8rem" }}>Stock mínimo</label>
                    <input
                      type="number"
                      value={editForm.minimumStock ?? ""}
                      onChange={(e) =>
                        handleEditChange(
                          "minimumStock",
                          Number(e.target.value)
                        )
                      }
                      style={{
                        padding: "0.4rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #334155",
                        background: "#020617",
                        color: "#e5e7eb",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "0.8rem" }}>Stock máximo</label>
                    <input
                      type="number"
                      value={editForm.maximumStock ?? ""}
                      onChange={(e) =>
                        handleEditChange(
                          "maximumStock",
                          Number(e.target.value)
                        )
                      }
                      style={{
                        padding: "0.4rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #334155",
                        background: "#020617",
                        color: "#e5e7eb",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "0.8rem" }}>
                      Costo por unidad
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.costPerUnit ?? ""}
                      onChange={(e) =>
                        handleEditChange(
                          "costPerUnit",
                          Number(e.target.value)
                        )
                      }
                      style={{
                        padding: "0.4rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #334155",
                        background: "#020617",
                        color: "#e5e7eb",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "0.8rem" }}>Ubicación</label>
                    <input
                      type="text"
                      value={editForm.location ?? ""}
                      onChange={(e) =>
                        handleEditChange("location", e.target.value)
                      }
                      style={{
                        padding: "0.4rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #334155",
                        background: "#020617",
                        color: "#e5e7eb",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "0.8rem" }}>Notas</label>
                    <input
                      type="text"
                      value={editForm.notes ?? ""}
                      onChange={(e) =>
                        handleEditChange("notes", e.target.value)
                      }
                      style={{
                        padding: "0.4rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #334155",
                        background: "#020617",
                        color: "#e5e7eb",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    marginTop: "0.25rem",
                  }}
                >
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    style={{
                      padding: "0.55rem 1.4rem",
                      background: "#22c55e",
                      borderRadius: "0.6rem",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: savingEdit ? "default" : "pointer",
                    }}
                  >
                    {savingEdit ? "Guardando..." : "Guardar cambios"}
                  </button>

                  <button
                    onClick={handleDeleteItem}
                    disabled={deleting}
                    style={{
                      padding: "0.55rem 1.4rem",
                      background: "#ef4444",
                      borderRadius: "0.6rem",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: deleting ? "default" : "pointer",
                    }}
                  >
                    {deleting ? "Eliminando..." : "Eliminar artículo"}
                  </button>
                </div>

                {/* ⚙️ Ajuste manual de stock */}
                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid #1f2937",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Ajustar stock manualmente
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: "0.75rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <label style={{ fontSize: "0.8rem" }}>
                        Cantidad a ajustar
                      </label>
                      <input
                        type="number"
                        value={adjustQuantity}
                        onChange={(e) =>
                          setAdjustQuantity(Number(e.target.value))
                        }
                        placeholder="10 (positivo o negativo)"
                        style={{
                          padding: "0.4rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #334155",
                          background: "#020617",
                          color: "#e5e7eb",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <label style={{ fontSize: "0.8rem" }}>Motivo</label>
                      <input
                        type="text"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        style={{
                          padding: "0.4rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #334155",
                          background: "#020617",
                          color: "#e5e7eb",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <label style={{ fontSize: "0.8rem" }}>Notas</label>
                      <input
                        type="text"
                        value={adjustNotes}
                        onChange={(e) => setAdjustNotes(e.target.value)}
                        style={{
                          padding: "0.4rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #334155",
                          background: "#020617",
                          color: "#e5e7eb",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAdjustStock}
                    disabled={adjusting || adjustQuantity === 0}
                    style={{
                      padding: "0.5rem 1.4rem",
                      background: "#0ea5e9",
                      borderRadius: "0.6rem",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor:
                        adjusting || adjustQuantity === 0
                          ? "default"
                          : "pointer",
                      opacity: adjustQuantity === 0 ? 0.7 : 1,
                    }}
                  >
                    {adjusting ? "Ajustando..." : "Ajustar stock"}
                  </button>
                </div>

                {/* 🆕 Registrar consumo de stock (venta / preparación) */}
                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid #1f2937",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Registrar consumo de stock (venta / preparación)
                  </h4>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: "0.75rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <label style={{ fontSize: "0.8rem" }}>
                        Cantidad a consumir
                      </label>
                      <input
                        type="number"
                        value={consumeQuantity}
                        onChange={(e) =>
                          setConsumeQuantity(Number(e.target.value))
                        }
                        placeholder="5"
                        style={{
                          padding: "0.4rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #334155",
                          background: "#020617",
                          color: "#e5e7eb",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <label style={{ fontSize: "0.8rem" }}>
                        Referencia (opcional)
                      </label>
                      <input
                        type="text"
                        value={consumeReference}
                        onChange={(e) => setConsumeReference(e.target.value)}
                        placeholder="order-123"
                        style={{
                          padding: "0.4rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #334155",
                          background: "#020617",
                          color: "#e5e7eb",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleConsumeStock}
                    disabled={consuming || consumeQuantity <= 0}
                    style={{
                      padding: "0.5rem 1.4rem",
                      background: "#f97316",
                      borderRadius: "0.6rem",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor:
                        consuming || consumeQuantity <= 0
                          ? "default"
                          : "pointer",
                      opacity: consumeQuantity <= 0 ? 0.7 : 1,
                    }}
                  >
                    {consuming ? "Registrando..." : "Registrar consumo"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* HISTORIAL DE MOVIMIENTOS */}
      <section
        style={{
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          border: "1px solid #334155",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "0.75rem",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
            Movimientos de inventario
            {selectedItemIdForMovs && (
              <span style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
                {" "}
                · Ítem: {selectedItemIdForMovs}
              </span>
            )}
          </h2>

          {/* 👇 SELECTOR DE ÍTEM PARA VER MOVIMIENTOS */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <select
              value={itemIdFilter}
              onChange={(e) => setItemIdFilter(e.target.value)}
              style={{
                padding: "0.4rem 0.6rem",
                borderRadius: "0.5rem",
                background: "#020617",
                color: "#e5e7eb",
                border: "1px solid #334155",
                fontSize: "0.85rem",
              }}
            >
              <option value="">Todos los artículos</option>
              {items.map((it, idx) => (
                <option
                  key={`${it.id ?? "no-id"}-movs-${idx}`}
                  value={it.id}
                >
                  {it.itemName} {it.sku ? `(${it.sku})` : ""} – {it.id}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleFetchMovements(itemIdFilter || undefined)}
              style={{
                padding: "0.45rem 0.9rem",
                background: "#3b82f6",
                borderRadius: "0.5rem",
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Ver movimientos
            </button>
          </div>
        </div>

        {loadingMovements && (
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Cargando movimientos...
          </p>
        )}

        {!loadingMovements && movements.length === 0 && (
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            {itemIdFilter
              ? "No hay movimientos para el artículo seleccionado."
              : "Seleccioná un artículo o elegí 'Todos los artículos' y hacé clic en 'Ver movimientos'."}
          </p>
        )}

        {!loadingMovements && movements.length > 0 && (
          <div
            style={{
              maxHeight: "320px",
              overflowY: "auto",
              borderRadius: "0.5rem",
              border: "1px solid #1e293b",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr style={{ background: "#111827" }}>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>
                    Fecha
                  </th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>
                    Cantidad
                  </th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>
                    Tipo
                  </th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>
                    Motivo
                  </th>
                  <th style={{ padding: "0.5rem", textAlign: "left" }}>
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mv) => (
                  <tr key={mv.id} style={{ borderTop: "1px solid #1f2937" }}>
                    <td style={{ padding: "0.45rem" }}>
                      {new Date(mv.movementDate).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.45rem" }}>{mv.quantity}</td>
                    <td style={{ padding: "0.45rem" }}>{mv.type}</td>
                    <td style={{ padding: "0.45rem" }}>{mv.reason}</td>
                    <td style={{ padding: "0.45rem" }}>{mv.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
