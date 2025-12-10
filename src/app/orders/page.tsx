"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  getOrders,
  type Order,
  getTables,
  type Table,
  getProducts,
  type Product,
  createOrder,
  type CreateOrderPayload,
  updateOrderItems,
  deleteOrderItem,
  getOrderById,
  createBill,
  type PaymentMethod,
  getBillTicket, // 👈 NUEVO
  type BillTicket, // 👈 NUEVO
} from "../lib/api";

// mismo tipo que en TopNav
type UserRole = "admin" | "employee" | "customer" | string | null;

type OrderType = "dine_in" | "takeaway" | "delivery";

type OrderItemInput = {
  productId: string;
  quantity: number;
  specialInstructions: string;
};

/* ============================
   HELPER: IMPRIMIR TICKET
   ============================ */
function printBillTicket(ticket: BillTicket) {
  if (typeof window === "undefined") return;

  const productosHtml = ticket.productos
    .map(
      (p) => `
      <tr>
        <td>${p.cantidad} x ${p.nombre}</td>
        <td style="text-align:right;">$${p.total.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Ticket ${ticket.billNumber}</title>
        <style>
          body {
            font-family: monospace;
            font-size: 12px;
            padding: 8px;
          }
          h1, h2, h3, p {
            margin: 0;
            padding: 0;
          }
          .center {
            text-align: center;
          }
          .mt-4 { margin-top: 4px; }
          .mt-8 { margin-top: 8px; }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            padding: 2px 0;
          }
          .total-row td {
            border-top: 1px dashed #000;
            padding-top: 4px;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="center">
          <h2>Ticket</h2>
          <p>${ticket.billNumber}</p>
        </div>

        <p class="mt-8">Fecha: ${new Date(ticket.fecha).toLocaleString()}</p>
        <p>Tipo venta: ${ticket.tipoVenta}${
          ticket.mesa ? " (Mesa " + ticket.mesa + ")" : ""
        }</p>
        <p>Cliente: ${ticket.cliente}</p>

        <h3 class="mt-8">Productos</h3>
        <table class="mt-4">
          <tbody>
            ${productosHtml}
          </tbody>
        </table>

        <table class="mt-8">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td style="text-align:right;">$${ticket.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Impuestos</td>
              <td style="text-align:right;">$${ticket.impuestos.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td style="text-align:right;">
                <strong>$${ticket.total.toFixed(2)}</strong>
              </td>
            </tr>
            <tr>
              <td>Pago (${ticket.metodoPago})</td>
              <td style="text-align:right;">$${ticket.montoPagado.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Cambio</td>
              <td style="text-align:right;">$${ticket.cambio.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <p class="center mt-8">¡Gracias por su visita!</p>

        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export default function OrdersPage() {
  // 👉 control de permisos
  const [role, setRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("festgo_user");
    if (!raw) {
      setCheckingRole(false);
      return;
    }
    try {
      const user = JSON.parse(raw) as { role?: string; userId?: string };
      setRole(user.role ?? null);
      setUserId(user.userId ?? null);
    } catch {
      setRole(null);
    } finally {
      setCheckingRole(false);
    }
  }, []);

  const isStaff = role === "admin" || role === "employee";

  // 🔹 Helper para formatear el total de una orden sin romper si viene undefined
  const formatOrderTotal = (o: Order) =>
    typeof o.total === "number" && !Number.isNaN(o.total)
      ? o.total.toFixed(2)
      : "0.00";

  /* ====================================================
     VISTA CLIENTE: MIS PEDIDOS (customer)
     ==================================================== */
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);
  const [customerOrdersError, setCustomerOrdersError] = useState("");

  const handleFetchCustomerOrders = async () => {
    if (!userId) return;
    setCustomerOrdersLoading(true);
    setCustomerOrdersError("");

    try {
      const res = await getOrders({
        customerId: userId,
        limit: 50,
        page: 1,
      });

      if (res.success && res.data) {
        setCustomerOrders(res.data);
      } else {
        setCustomerOrdersError(
          res.message || "No se pudieron obtener tus pedidos."
        );
      }
    } catch (err: any) {
      setCustomerOrdersError(
        err?.message || "Error inesperado al obtener tus pedidos."
      );
    } finally {
      setCustomerOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (role === "customer" && userId) {
      handleFetchCustomerOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId]);

  /* ====================================================
     ESTADOS DE FILTROS (vista staff)
     ==================================================== */
  const [status, setStatus] = useState("");
  const [tableId, setTableId] = useState("");
  const [date, setDate] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  // 👉 NUEVOS FILTROS: tipo de orden y customerId
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | "">("");
  const [customerIdFilter, setCustomerIdFilter] = useState("");

  // 👉 tablas cargadas para el select
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // 👉 productos del menú
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // 👉 carga de mesas
  useEffect(() => {
    async function fetchTables() {
      setLoadingTables(true);
      try {
        const res = await getTables();
        if (res.success && res.data) {
          setTables(res.data);
        }
      } catch {
        console.error("Error cargando mesas");
      }
      setLoadingTables(false);
    }
    fetchTables();
  }, []);

  // 👉 carga de productos del menú (para armar items de la orden)
  useEffect(() => {
    async function fetchProducts() {
      setLoadingProducts(true);
      try {
        const res = await getProducts({ available: true });
        if (res.success && res.data) {
          setProducts(res.data);
        }
      } catch {
        console.error("Error cargando productos");
      }
      setLoadingProducts(false);
    }
    fetchProducts();
  }, []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFetch = async () => {
    setLoading(true);
    setErrorMsg("");
    setOrders([]);

    try {
      const res = await getOrders({
        status: status || undefined,
        tableId: tableId || undefined,
        date: date || undefined,
        limit,
        page,
        // nuevos filtros
        orderType: orderTypeFilter || undefined,
        customerId: customerIdFilter.trim() || undefined,
      });

      if (res.success && res.data) {
        setOrders(res.data);
      } else {
        setErrorMsg(res.message || "Error desconocido");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado");
    }

    setLoading(false);
  };

  // ======================
  //   CREAR NUEVA ORDEN
  // ======================
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [createOrderType, setCreateOrderType] = useState<OrderType>("dine_in");
  const [createOrderTableId, setCreateOrderTableId] = useState("");
  const [createCustomerId, setCreateCustomerId] = useState("");

  const [createItems, setCreateItems] = useState<OrderItemInput[]>([
    { productId: "", quantity: 1, specialInstructions: "" },
  ]);

  const handleChangeItem = (
    index: number,
    field: keyof OrderItemInput,
    value: string
  ) => {
    setCreateItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              [field]: field === "quantity" ? Number(value) || 1 : value,
            }
          : it
      )
    );
  };

  const handleAddItemRow = () => {
    setCreateItems((prev) => [
      ...prev,
      { productId: "", quantity: 1, specialInstructions: "" },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setCreateItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    // Validaciones básicas
    if (createOrderType === "dine_in" && !createOrderTableId) {
      setCreateError(
        "Seleccioná una mesa para órdenes dentro del local (dine_in)."
      );
      return;
    }

    const filteredItems = createItems
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        specialInstructions: it.specialInstructions.trim()
          ? it.specialInstructions.trim()
          : undefined,
      }));

    if (!filteredItems.length) {
      setCreateError(
        "Agregá al menos un producto a la orden con cantidad mayor a 0."
      );
      return;
    }

    const payload: CreateOrderPayload = {
      orderType: createOrderType,
      items: filteredItems,
      ...(createOrderType === "dine_in" && createOrderTableId
        ? { tableId: createOrderTableId }
        : {}),
      ...(createCustomerId.trim() ? { customerId: createCustomerId.trim() } : {}),
      // Podrías agregar notes, discountAmount, tipAmount, waiterId si los necesitás
    };

    try {
      setCreating(true);
      const res = await createOrder(payload);

      if (res.success && res.data) {
        setCreateSuccess(
          `Orden creada correctamente. N° de orden: ${
            res.data.orderNumber ?? res.data.id
          }`
        );
        setCreateError("");

        // Limpio algunos campos del form (no todo para que sea cómodo)
        setCreateOrderType("dine_in");
        setCreateOrderTableId("");
        setCreateCustomerId("");
        setCreateItems([{ productId: "", quantity: 1, specialInstructions: "" }]);

        // Refresco el listado de pedidos
        handleFetch();
      } else {
        setCreateError(
          res.message || "No se pudo crear la orden. Revisá los datos."
        );
      }
    } catch (err: any) {
      setCreateError(err?.message || "Error inesperado al crear la orden.");
    } finally {
      setCreating(false);
    }
  };

  // ======================
  //   EDITAR ITEMS ORDEN (PATCH /orders/:id/items)
  // ======================
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<OrderItemInput[]>([
    { productId: "", quantity: 1, specialInstructions: "" },
  ]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const handleChangeEditItem = (
    index: number,
    field: keyof OrderItemInput,
    value: string
  ) => {
    setEditItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              [field]: field === "quantity" ? Number(value) || 1 : value,
            }
          : it
      )
    );
  };

  const handleAddEditItemRow = () => {
    setEditItems((prev) => [
      ...prev,
      { productId: "", quantity: 1, specialInstructions: "" },
    ]);
  };

  const handleRemoveEditItemRow = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartEditOrderItems = (orderId: string) => {
    setEditOrderId(orderId);
    setEditItems([{ productId: "", quantity: 1, specialInstructions: "" }]);
    setEditError("");
    setEditSuccess("");
  };

  const handleUpdateOrderItems = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!editOrderId) return;

    setEditError("");
    setEditSuccess("");

    const filteredItems = editItems
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: it.quantity, // 👈 cantidad FINAL
      }));

    if (!filteredItems.length) {
      setEditError(
        "Agregá al menos un producto con cantidad mayor a 0 para actualizar la orden."
      );
      return;
    }

    try {
      setEditLoading(true);

      const res = await updateOrderItems(editOrderId, {
        items: filteredItems,
      });

      if (res.success && res.data) {
        setEditSuccess("Items actualizados correctamente.");
        setEditError("");
        await handleFetch();
      } else {
        setEditError(
          res.message || "No se pudieron actualizar los items de la orden."
        );
      }
    } catch (err: any) {
      setEditError(err?.message || "Error inesperado al actualizar los items.");
    } finally {
      setEditLoading(false);
    }
  };

  // ======================
  //   QUITAR ITEM (DELETE /orders/:id/items/:itemId)
  // ======================
  const [removeItemLoadingId, setRemoveItemLoadingId] = useState<string | null>(
    null
  );
  const [removeItemError, setRemoveItemError] = useState("");

  const handleRemoveItemFromOrder = async (orderId: string, itemId: string) => {
    setRemoveItemError("");
    setRemoveItemLoadingId(itemId);

    try {
      const res = await deleteOrderItem(orderId, itemId);
      if (!res.success) {
        setRemoveItemError(
          res.message || "No se pudo quitar el item de la orden."
        );
      } else {
        await handleFetch();
      }
    } catch (err: any) {
      setRemoveItemError(
        err?.message || "Error inesperado al quitar el item de la orden."
      );
    } finally {
      setRemoveItemLoadingId(null);
    }
  };

  // ======================
  //   VER ORDEN (GET /orders/:id)
  // ======================
  const [viewOrderId, setViewOrderId] = useState("");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

  const handleViewOrder = async () => {
    setViewError("");
    setViewOrder(null);

    const id = viewOrderId.trim();
    if (!id) {
      setViewError("Seleccioná una orden del listado.");
      return;
    }

    try {
      setViewLoading(true);
      const res = await getOrderById(id);

      if (res.success && res.data) {
        setViewOrder(res.data);
      } else {
        setViewError(res.message || "No se encontró la orden.");
      }
    } catch (err: any) {
      setViewError(err?.message || "Error inesperado al obtener la orden.");
    } finally {
      setViewLoading(false);
    }
  };

  // ======================
  //   CERRAR CUENTA / CREAR FACTURA (POST /bills)
  // ======================
  const [billOrderId, setBillOrderId] = useState("");
  const [billPaymentMethod, setBillPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [billPaidAmount, setBillPaidAmount] = useState<string>("");
  const [billDiscountAmount, setBillDiscountAmount] = useState<string>("");
  const [billTipAmount, setBillTipAmount] = useState<string>("");
  const [billCashierId, setBillCashierId] = useState("");
  const [billLoading, setBillLoading] = useState(false);
  const [billError, setBillError] = useState("");
  const [billSuccess, setBillSuccess] = useState("");

  // Prefill cashierId con el userId (si existe)
  useEffect(() => {
    if (userId && !billCashierId) {
      setBillCashierId(userId);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateBill = async () => {
    setBillError("");
    setBillSuccess("");

    const id = billOrderId.trim();
    if (!id) {
      setBillError("Seleccioná una orden para cerrar la cuenta.");
      return;
    }

    const order = orders.find((o) => o.id === id);
    if (!order) {
      setBillError(
        "No se encontró la orden en el listado actual. Volvé a buscar y probá de nuevo."
      );
      return;
    }

    // 👇 total seguro, por si viene undefined
    const orderTotal =
      typeof order.total === "number" && !Number.isNaN(order.total)
        ? order.total
        : 0;

    if (!billPaidAmount.trim()) {
      setBillError("Ingresá el monto pagado.");
      return;
    }

    const paid = parseFloat(billPaidAmount.replace(",", "."));
    if (Number.isNaN(paid) || paid <= 0) {
      setBillError("Ingresá un monto pagado válido mayor a 0.");
      return;
    }

    // Validación: paidAmount >= totalAmount (usamos orderTotal)
    if (paid < orderTotal) {
      setBillError(
        `El monto pagado ($${paid.toFixed(
          2
        )}) no puede ser menor al total de la orden ($${orderTotal.toFixed(
          2
        )}).`
      );
      return;
    }

    const discount = billDiscountAmount.trim()
      ? parseFloat(billDiscountAmount.replace(",", "."))
      : 0;
    const tip = billTipAmount.trim()
      ? parseFloat(billTipAmount.replace(",", "."))
      : 0;

    const payload = {
      orderId: id,
      paymentMethod: billPaymentMethod,
      paidAmount: paid,
      ...(billCashierId.trim() ? { cashierId: billCashierId.trim() } : {}),
      ...(discount > 0 ? { discountAmount: discount } : {}),
      ...(tip > 0 ? { tipAmount: tip } : {}),
    };

    try {
      setBillLoading(true);
      const res = await createBill(payload);

      if (!res.success || !res.data) {
        setBillError(res.message || "No se pudo crear la factura.");
        return;
      }

      const bill = res.data;

      setBillSuccess(
        `Factura creada (N° ${bill.billNumber}). Total: $${bill.totalAmount.toFixed(
          2
        )}. Pagado: $${bill.paidAmount.toFixed(
          2
        )}. Vuelto: $${bill.changeAmount.toFixed(2)}.`
      );

      // 👉 NUEVO: obtener ticket e imprimir
      try {
        const ticketRes = await getBillTicket(bill.id);
        if (ticketRes.success && ticketRes.data) {
          printBillTicket(ticketRes.data);
        } else {
          console.error(
            "No se pudo obtener el ticket para imprimir:",
            ticketRes.message
          );
        }
      } catch (e) {
        console.error("Error al obtener/imprimir ticket:", e);
      }

      // Efecto automático en frontend: sacamos la orden cerrada del listado
      setOrders((prev) => prev.filter((o) => o.id !== id));

      // Si justo la estábamos viendo, limpiamos
      if (viewOrderId === id) {
        setViewOrderId("");
        setViewOrder(null);
      }

      // Reseteo algunos campos
      setBillPaidAmount("");
      setBillDiscountAmount("");
      setBillTipAmount("");
    } catch (err: any) {
      setBillError(err?.message || "Error inesperado al crear la factura.");
    } finally {
      setBillLoading(false);
    }
  };

  // LOADING PERMISOS
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
        <h1 style={{ fontSize: "2rem" }}>🧾 Pedidos (Orders)</h1>
        <p style={{ color: "#9ca3af" }}>Cargando permisos...</p>
      </main>
    );
  }

  // 👇 VISTA CLIENTE (customer): MIS PEDIDOS
  if (role === "customer") {
    return (
      <main
        style={{
          padding: "1.5rem",
          color: "white",
          background: "#0f172a",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>
          🧾 Mis pedidos
        </h1>
        <p
          style={{
            color: "#9ca3af",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          Aquí podés ver el historial de tus pedidos realizados en el bar.
        </p>

        <button
          type="button"
          onClick={handleFetchCustomerOrders}
          disabled={customerOrdersLoading}
          style={{
            padding: "0.6rem 1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: customerOrdersLoading ? "#3b82f655" : "#3b82f6",
            color: "white",
            fontWeight: 600,
            cursor: customerOrdersLoading ? "default" : "pointer",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {customerOrdersLoading ? "Actualizando..." : "Actualizar lista"}
        </button>

        {customerOrdersError && (
          <p
            style={{
              color: "#f87171",
              fontSize: "0.85rem",
              marginBottom: "0.75rem",
            }}
          >
            {customerOrdersError}
          </p>
        )}

        {!customerOrdersLoading && customerOrders.length === 0 && !customerOrdersError && (
          <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
            Todavía no tenés pedidos registrados.
          </p>
        )}

        <div style={{ display: "grid", gap: "1rem" }}>
          {customerOrders.map((o) => (
            <div
              key={o.id}
              style={{
                background: "#020617",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "1px solid #1f2937",
              }}
            >
              <h3 style={{ marginBottom: "0.25rem" }}>
                Pedido #{o.orderNumber ?? o.id}
              </h3>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#9ca3af",
                  marginBottom: "0.5rem",
                }}
              >
                Realizado el{" "}
                {o.createdAt
                  ? new Date(o.createdAt).toLocaleString()
                  : "—"}
              </p>

              <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
                <strong>Estado:</strong> {o.status}
              </p>
              <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
                <strong>Tipo:</strong>{" "}
                {o.orderType === "dine_in"
                  ? "Dentro del local"
                  : o.orderType === "takeaway"
                  ? "Para llevar"
                  : o.orderType === "delivery"
                  ? "Delivery"
                  : o.orderType ?? "—"}
              </p>
              <p style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
                <strong>Mesa:</strong>{" "}
                {o.tableNumber ? `#${o.tableNumber}` : "—"}
              </p>
              <p style={{ fontSize: "0.9rem", marginBottom: "0.4rem" }}>
                <strong>Total:</strong> ${formatOrderTotal(o)}
              </p>

              <div>
                <p
                  style={{
                    fontSize: "0.9rem",
                    marginBottom: "0.25rem",
                    fontWeight: 600,
                  }}
                >
                  Items:
                </p>
                <ul
                  style={{
                    paddingLeft: "1.1rem",
                    fontSize: "0.85rem",
                    color: "#e5e7eb",
                  }}
                >
                  {o.items.map((it, idx) => (
                    <li key={idx}>
                      {it.productName} x{it.quantity} — ${it.subtotal}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // NO STAFF (y no es customer)
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
        <h1 style={{ fontSize: "2rem" }}>🧾 Pedidos (Orders)</h1>
        <p style={{ color: "#f87171", maxWidth: "520px" }}>
          No tenés permisos para ver esta página.
        </p>
      </main>
    );
  }

  // ✅ STAFF VIEW
  return (
    <main
      style={{
        padding: "2rem",
        color: "white",
        background: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        🧾 Pedidos (Orders)
      </h1>

      {/* =========================
          CREAR NUEVA ORDEN
      ========================== */}
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
          Crear nueva orden
        </h2>

        {createError && (
          <p
            style={{
              color: "#f87171",
              marginBottom: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            {createError}
          </p>
        )}
        {createSuccess && (
          <p
            style={{
              color: "#4ade80",
              marginBottom: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            {createSuccess}
          </p>
        )}

        <form
          onSubmit={handleCreateOrder}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {/* Tipo de orden */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              Tipo de orden
            </label>
            <select
              value={createOrderType}
              onChange={(e) => setCreateOrderType(e.target.value as OrderType)}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#020617",
                color: "white",
              }}
            >
              <option value="dine_in">Dentro del local (dine_in)</option>
              <option value="takeaway">Para llevar (takeaway)</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          {/* Mesa */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              Mesa
              {createOrderType === "dine_in" && " (requerido)"}
            </label>
            <select
              value={createOrderTableId}
              onChange={(e) => setCreateOrderTableId(e.target.value)}
              disabled={loadingTables || createOrderType !== "dine_in"}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background:
                  createOrderType === "dine_in" ? "#020617" : "#02061766",
                color: "white",
              }}
            >
              <option value="">
                {createOrderType === "dine_in"
                  ? "(Seleccioná una mesa)"
                  : "(No aplica)"}
              </option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Mesa #{t.number} — {t.location}
                </option>
              ))}
            </select>
          </div>

          {/* CustomerId opcional */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              ID Cliente (opcional)
            </label>
            <input
              type="text"
              value={createCustomerId}
              onChange={(e) => setCreateCustomerId(e.target.value)}
              placeholder="customer-uuid"
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#020617",
                color: "white",
              }}
            />
          </div>

          {/* Botón submit */}
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
                background: "#22c55e",
                borderRadius: "0.6rem",
                border: "none",
                fontWeight: "bold",
                cursor: creating ? "default" : "pointer",
              }}
            >
              {creating ? "Creando..." : "Crear orden"}
            </button>
          </div>
        </form>

        {/* Items de la orden */}
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              marginBottom: "0.4rem",
              fontWeight: 600,
            }}
          >
            Items de la orden
          </h3>
          {loadingProducts && (
            <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
              Cargando productos del menú...
            </p>
          )}

          {createItems.map((item, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr minmax(80px,0.8fr) 2fr auto",
                gap: "0.5rem",
                marginBottom: "0.5rem",
                alignItems: "center",
              }}
            >
              {/* Producto */}
              <select
                value={item.productId}
                onChange={(e) =>
                  handleChangeItem(index, "productId", e.target.value)
                }
                style={{
                  padding: "0.45rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #475569",
                  background: "#020617",
                  color: "white",
                  fontSize: "0.85rem",
                }}
              >
                <option value="">Seleccionar producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${p.price.toFixed(2)}
                  </option>
                ))}
              </select>

              {/* Cantidad */}
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  handleChangeItem(index, "quantity", e.target.value)
                }
                style={{
                  padding: "0.45rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #475569",
                  background: "#020617",
                  color: "white",
                  fontSize: "0.85rem",
                  width: "100%",
                }}
              />

              {/* Instrucciones especiales */}
              <input
                type="text"
                value={item.specialInstructions}
                onChange={(e) =>
                  handleChangeItem(
                    index,
                    "specialInstructions",
                    e.target.value
                  )
                }
                placeholder="Instrucciones (ej: sin cebolla)"
                style={{
                  padding: "0.45rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #475569",
                  background: "#020617",
                  color: "white",
                  fontSize: "0.85rem",
                  width: "100%",
                }}
              />

              {/* Borrar fila */}
              <button
                type="button"
                onClick={() => handleRemoveItemRow(index)}
                disabled={createItems.length === 1}
                style={{
                  padding: "0.35rem 0.7rem",
                  borderRadius: "999px",
                  border: "1px solid #f97316",
                  background: "#7c2d1233",
                  color: "#fed7aa",
                  fontSize: "0.8rem",
                  cursor: createItems.length === 1 ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Eliminar
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItemRow}
            style={{
              marginTop: "0.5rem",
              padding: "0.4rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid #3b82f6",
              background: "#1d4ed833",
              color: "#bfdbfe",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            + Agregar otro producto
          </button>
        </div>
      </section>

      {/* FILTROS */}
      <div
        style={{
          background: "#1e293b",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        }}
      >
        {/* STATUS */}
        <div>
          <label>Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: "100%", padding: "0.4rem" }}
          >
            <option value="">(Todos)</option>
            <option value="pending">pending</option>
            <option value="preparing">preparing</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>

        {/* SELECT DE MESAS */}
        <div>
          <label>ID Mesa (tableId)</label>
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            style={{ width: "100%", padding: "0.4rem" }}
            disabled={loadingTables}
          >
            <option value="">(Todas)</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Mesa #{t.number} — {t.location}
              </option>
            ))}
          </select>
        </div>

        {/* NUEVO: TIPO DE ORDEN */}
        <div>
          <label>Tipo de orden</label>
          <select
            value={orderTypeFilter}
            onChange={(e) =>
              setOrderTypeFilter(e.target.value as OrderType | "")
            }
            style={{ width: "100%", padding: "0.4rem" }}
          >
            <option value="">(Todas)</option>
            <option value="dine_in">Dentro del local (dine_in)</option>
            <option value="takeaway">Para llevar (takeaway)</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>

        {/* NUEVO: FILTRO POR CUSTOMER ID */}
        <div>
          <label>Customer ID</label>
          <input
            type="text"
            value={customerIdFilter}
            onChange={(e) => setCustomerIdFilter(e.target.value)}
            placeholder="Filtrar por cliente"
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </div>

        {/* FECHA DATEPICKER */}
        <div>
          <label>Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </div>

        {/* LIMIT */}
        <div>
          <label>Limit</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </div>

        {/* PAGE */}
        <div>
          <label>Page</label>
          <input
            type="number"
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </div>

        {/* BOTÓN */}
        <button
          onClick={handleFetch}
          style={{
            padding: "0.8rem",
            background: "#3b82f6",
            borderRadius: "0.6rem",
            fontWeight: "bold",
          }}
        >
          {loading ? "Buscando..." : "Buscar pedidos"}
        </button>
      </div>

      {/* =========================
          VER ORDEN POR ID (GET /orders/:id) - SELECT
      ========================== */}
      <section
        style={{
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #334155",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
          Ver orden (GET /orders/:id)
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <div style={{ flex: "1 1 260px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
              }}
            >
              Orden
            </label>
            <select
              value={viewOrderId}
              onChange={(e) => setViewOrderId(e.target.value)}
              disabled={orders.length === 0}
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
                fontSize: "0.9rem",
              }}
            >
              <option value="">
                {orders.length === 0
                  ? "No hay pedidos. Usá los filtros de arriba."
                  : "Seleccionar orden..."}
              </option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  Pedido #{o.orderNumber ?? o.id} —{" "}
                  {o.tableNumber ? `Mesa #${o.tableNumber}` : "Sin mesa"} —{" "}
                  {o.status}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleViewOrder}
            disabled={viewLoading || orders.length === 0}
            style={{
              padding: "0.7rem 1.1rem",
              borderRadius: "0.6rem",
              border: "none",
              background:
                viewLoading || orders.length === 0 ? "#1d4ed8aa" : "#3b82f6",
              color: "white",
              fontWeight: 600,
              cursor:
                viewLoading || orders.length === 0 ? "default" : "pointer",
              fontSize: "0.9rem",
            }}
          >
            {viewLoading ? "Buscando..." : "Ver orden"}
          </button>
        </div>

        {viewError && (
          <p
            style={{
              color: "#f87171",
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
            }}
          >
            {viewError}
          </p>
        )}

        {orders.length === 0 && (
          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.8rem",
              marginBottom: "0.5rem",
            }}
          >
            Tip: primero buscá pedidos con los filtros de arriba para cargar el
            listado en este select.
          </p>
        )}

        {viewOrder && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              background: "#020617",
              border: "1px solid #475569",
              overflowX: "auto",
            }}
          >
            <p
              style={{
                fontSize: "0.9rem",
                marginBottom: "0.4rem",
                color: "#e5e7eb",
              }}
            >
              Respuesta cruda del endpoint:
              <code style={{ fontSize: "0.8rem", color: "#93c5fd" }}>
                {" "}
                GET /api/v1/orders/{viewOrderId}
              </code>
            </p>
            <pre
              style={{
                fontSize: "0.8rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#020617",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #334155",
                maxHeight: "320px",
                overflow: "auto",
              }}
            >
              {JSON.stringify(viewOrder, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* =========================
          CERRAR CUENTA / CREAR FACTURA (POST /bills)
      ========================== */}
      <section
        style={{
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #334155",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
          Cerrar cuenta / Crear factura (POST /bills)
        </h2>

        {billError && (
          <p
            style={{
              color: "#f87171",
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
            }}
          >
            {billError}
          </p>
        )}

        {billSuccess && (
          <p
            style={{
              color: "#4ade80",
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
            }}
          >
            {billSuccess}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          {/* Orden */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
              }}
            >
              Orden a facturar
            </label>
            <select
              value={billOrderId}
              onChange={(e) => setBillOrderId(e.target.value)}
              disabled={orders.length === 0}
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
                fontSize: "0.9rem",
              }}
            >
              <option value="">
                {orders.length === 0
                  ? "No hay pedidos abiertos para facturar."
                  : "Seleccionar orden..."}
              </option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  Pedido #{o.orderNumber ?? o.id} —{" "}
                  {o.tableNumber ? `Mesa #${o.tableNumber}` : "Sin mesa"} — total $
                  {formatOrderTotal(o)}
                </option>
              ))}
            </select>
          </div>

          {/* Medio de pago */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
              }}
            >
              Medio de pago
            </label>
            <select
              value={billPaymentMethod}
              onChange={(e) =>
                setBillPaymentMethod(e.target.value as PaymentMethod)
              }
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
                fontSize: "0.9rem",
              }}
            >
              <option value="cash">Efectivo</option>
              <option value="credit_card">Tarjeta de crédito</option>
              <option value="debit_card">Tarjeta de débito</option>
              <option value="transfer">Transferencia</option>
              <option value="digital_wallet">
                Billetera digital (MercadoPago, etc.)
              </option>
            </select>
          </div>

          {/* Monto pagado */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
              }}
            >
              Monto pagado (paidAmount) *
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={billPaidAmount}
              onChange={(e) => setBillPaidAmount(e.target.value)}
              placeholder="Ej: 50.00"
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
                fontSize: "0.9rem",
              }}
            />
          </div>

          {/* Descuento */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
              }}
            >
              Descuento (discountAmount) opcional
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={billDiscountAmount}
              onChange={(e) => setBillDiscountAmount(e.target.value)}
              placeholder="Ej: 0.00"
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
                fontSize: "0.9rem",
              }}
            />
          </div>

          {/* Propina */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
              }}
            >
              Propina (tipAmount) opcional
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={billTipAmount}
              onChange={(e) => setBillTipAmount(e.target.value)}
              placeholder="Ej: 5.00"
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
                fontSize: "0.9rem",
              }}
            />
          </div>

          {/* CashierId opcional */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
              }}
            >
              Cashier ID (opcional)
            </label>
            <input
              type="text"
              value={billCashierId}
              onChange={(e) => setBillCashierId(e.target.value)}
              placeholder="cashier-uuid (por defecto tu userId)"
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateBill}
          disabled={billLoading || orders.length === 0}
          style={{
            padding: "0.7rem 1.1rem",
            borderRadius: "0.6rem",
            border: "none",
            background:
              billLoading || orders.length === 0 ? "#22c55e55" : "#22c55e",
            color: "#022c22",
            fontWeight: 600,
            cursor:
              billLoading || orders.length === 0 ? "default" : "pointer",
            fontSize: "0.9rem",
          }}
        >
          {billLoading ? "Creando factura..." : "Cerrar cuenta"}
        </button>

        {orders.length === 0 && (
          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.8rem",
              marginTop: "0.5rem",
            }}
          >
            No hay pedidos activos para facturar. Primero generá o buscá pedidos
            con los filtros de arriba.
          </p>
        )}
      </section>

      {errorMsg && <p style={{ color: "#f87171" }}>{errorMsg}</p>}
      {removeItemError && (
        <p style={{ color: "#f97316", marginBottom: "0.75rem" }}>
          {removeItemError}
        </p>
      )}

      {/* LISTA DE PEDIDOS */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {orders.map((o) => (
          <div
            key={o.id}
            style={{
              background: "#1e293b",
              padding: "1rem",
              borderRadius: "0.75rem",
            }}
          >
            <h3>Pedido #{o.orderNumber ?? o.id}</h3>
            <p>
              <strong>Tipo:</strong> {o.orderType ? o.orderType : "—"}
            </p>
            <p>
              <strong>Cliente:</strong>{" "}
              {(o as any).customerId ?? "—"}
            </p>
            <p>
              <strong>Mesa:</strong>{" "}
              {o.tableNumber ? `#${o.tableNumber}` : "—"}
            </p>
            <p>
              <strong>Estado:</strong> {o.status}
            </p>
            <p>
              <strong>Total:</strong> ${formatOrderTotal(o)}
            </p>
            <p>
              <strong>Creado:</strong>{" "}
              {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
            </p>

            <h4>Items:</h4>
            <ul>
              {o.items.map((it, idx) => {
                const itemIdentifier = (it as any).itemId ?? (it as any).id;

                return (
                  <li key={idx}>
                    {it.productName} x{it.quantity} — ${it.subtotal}{" "}
                    {itemIdentifier && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveItemFromOrder(o.id, itemIdentifier)
                        }
                        disabled={removeItemLoadingId === itemIdentifier}
                        style={{
                          marginLeft: "0.5rem",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          border: "1px solid #f97316",
                          background: "#7c2d1233",
                          color: "#fed7aa",
                          fontSize: "0.75rem",
                          cursor:
                            removeItemLoadingId === itemIdentifier
                              ? "default"
                              : "pointer",
                        }}
                      >
                        {removeItemLoadingId === itemIdentifier
                          ? "Quitando..."
                          : "Quitar"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Agregar/actualizar items */}
            {editOrderId !== o.id ? (
              <button
                type="button"
                onClick={() => handleStartEditOrderItems(o.id)}
                style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem 0.9rem",
                  borderRadius: "999px",
                  border: "1px solid #3b82f6",
                  background: "#1d4ed833",
                  color: "#bfdbfe",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                + Agregar/actualizar items
              </button>
            ) : (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #334155",
                  background: "#020617",
                }}
              >
                <h4
                  style={{
                    fontSize: "0.9rem",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Editar items de esta orden
                </h4>

                {editError && (
                  <p
                    style={{
                      color: "#f87171",
                      marginBottom: "0.4rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    {editError}
                  </p>
                )}
                {editSuccess && (
                  <p
                    style={{
                      color: "#4ade80",
                      marginBottom: "0.4rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    {editSuccess}
                  </p>
                )}

                <form
                  onSubmit={handleUpdateOrderItems}
                  style={{
                    display: "grid",
                    gap: "0.5rem",
                  }}
                >
                  {editItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr minmax(80px,0.8fr) auto",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      {/* Producto */}
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          handleChangeEditItem(
                            index,
                            "productId",
                            e.target.value
                          )
                        }
                        style={{
                          padding: "0.45rem 0.6rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #475569",
                          background: "#020617",
                          color: "white",
                          fontSize: "0.85rem",
                        }}
                      >
                        <option value="">Seleccionar producto...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — ${p.price.toFixed(2)}
                          </option>
                        ))}
                      </select>

                      {/* Cantidad FINAL */}
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          handleChangeEditItem(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                        style={{
                          padding: "0.45rem 0.6rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #475569",
                          background: "#020617",
                          color: "white",
                          fontSize: "0.85rem",
                          width: "100%",
                        }}
                      />

                      {/* Eliminar fila */}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditItemRow(index)}
                        disabled={editItems.length === 1}
                        style={{
                          padding: "0.35rem 0.7rem",
                          borderRadius: "999px",
                          border: "1px solid #f97316",
                          background: "#7c2d1233",
                          color: "#fed7aa",
                          fontSize: "0.8rem",
                          cursor:
                            editItems.length === 1 ? "default" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}

                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleAddEditItemRow}
                      style={{
                        padding: "0.4rem 0.9rem",
                        borderRadius: "999px",
                        border: "1px solid #3b82f6",
                        background: "#1d4ed833",
                        color: "#bfdbfe",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      + Agregar otro producto
                    </button>

                    <button
                      type="submit"
                      disabled={editLoading}
                      style={{
                        padding: "0.4rem 0.9rem",
                        borderRadius: "999px",
                        border: "none",
                        background: "#22c55e",
                        color: "#022c22",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: editLoading ? "default" : "pointer",
                      }}
                    >
                      {editLoading ? "Actualizando..." : "Guardar cambios"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditOrderId(null);
                        setEditItems([
                          {
                            productId: "",
                            quantity: 1,
                            specialInstructions: "",
                          },
                        ]);
                        setEditError("");
                        setEditSuccess("");
                      }}
                      style={{
                        padding: "0.4rem 0.9rem",
                        borderRadius: "999px",
                        border: "1px solid #64748b",
                        background: "transparent",
                        color: "#e5e7eb",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
