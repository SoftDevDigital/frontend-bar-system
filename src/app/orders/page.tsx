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
  getBillTicket,
  type BillTicket,
} from "../lib/api";

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

  // 👉 Estado para tabs/secciones
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");

  // 🔹 Helper para formatear el total de una orden
  const formatOrderTotal = (o: Order) => {
    const total = (o as any).totalAmount ?? (o as any).total ?? 0;
    return typeof total === "number" && !Number.isNaN(total)
      ? total.toFixed(2)
      : "0.00";
  };

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
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | "">("");
  const [customerIdFilter, setCustomerIdFilter] = useState("");

  // 👉 tablas y productos cargados
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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
    };

    try {
      setCreating(true);
      const res = await createOrder(payload);

      if (res.success && res.data) {
        setCreateSuccess(
          `✅ Orden creada correctamente. N° de orden: ${
            res.data.orderNumber ?? res.data.id
          }`
        );
        setCreateError("");

        setCreateOrderType("dine_in");
        setCreateOrderTableId("");
        setCreateCustomerId("");
        setCreateItems([{ productId: "", quantity: 1, specialInstructions: "" }]);

        handleFetch();
        setActiveTab("manage");
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
  //   EDITAR ITEMS ORDEN
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

  const handleUpdateOrderItems = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editOrderId) return;

    setEditError("");
    setEditSuccess("");

    const filteredItems = editItems
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
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
        setEditSuccess("✅ Items actualizados correctamente.");
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
  //   QUITAR ITEM
  // ======================
  const [removeItemLoadingId, setRemoveItemLoadingId] = useState<string | null>(null);
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
  //   CERRAR CUENTA / CREAR FACTURA
  // ======================
  const [billOrderId, setBillOrderId] = useState("");
  const [billPaymentMethod, setBillPaymentMethod] = useState<PaymentMethod>("cash");
  const [billPaidAmount, setBillPaidAmount] = useState<string>("");
  const [billDiscountAmount, setBillDiscountAmount] = useState<string>("");
  const [billTipAmount, setBillTipAmount] = useState<string>("");
  const [billCashierId, setBillCashierId] = useState("");
  const [billLoading, setBillLoading] = useState(false);
  const [billError, setBillError] = useState("");
  const [billSuccess, setBillSuccess] = useState("");

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

    const orderTotal =
      typeof (order as any).totalAmount === "number" && !Number.isNaN((order as any).totalAmount)
        ? (order as any).totalAmount
        : typeof (order as any).total === "number" && !Number.isNaN((order as any).total)
        ? (order as any).total
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

    if (paid < orderTotal) {
      setBillError(
        `El monto pagado ($${paid.toFixed(
          2
        )}) no puede ser menor al total de la orden ($${orderTotal.toFixed(2)}).`
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
        `✅ Factura creada (N° ${bill.billNumber}). Total: $${bill.totalAmount.toFixed(
          2
        )}. Pagado: $${bill.paidAmount.toFixed(
          2
        )}. Vuelto: $${bill.changeAmount?.toFixed(2) ?? "0.00"}.`
      );

      try {
        const ticketRes = await getBillTicket(bill.id);
        if (ticketRes.success && ticketRes.data) {
          printBillTicket(ticketRes.data);
        }
      } catch (e) {
        console.error("Error al obtener/imprimir ticket:", e);
      }

      setOrders((prev) => prev.filter((o) => o.id !== id));
      setBillOrderId("");
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
          background: "#020617",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ fontSize: "2rem" }}>🧾 Pedidos</h1>
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
          background: "#020617",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
                  background: "#1e293b",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #334155",
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
                  {(o as any).tableNumber ? `#${(o as any).tableNumber}` : "—"}
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
          background: "#020617",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ fontSize: "2rem" }}>🧾 Pedidos</h1>
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
        background: "#020617",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* HEADER */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "0.5rem", fontWeight: 700 }}>
            🧾 Gestión de Pedidos
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "1rem" }}>
            Creá y gestioná órdenes, luego cerrá la cuenta para facturar
          </p>
        </div>

        {/* TABS */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "2rem",
            borderBottom: "2px solid #334155",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "create" ? "3px solid #22c55e" : "3px solid transparent",
              color: activeTab === "create" ? "#22c55e" : "#9ca3af",
              fontWeight: activeTab === "create" ? 600 : 400,
              cursor: "pointer",
              fontSize: "0.95rem",
              transition: "all 0.2s",
            }}
          >
            ➕ Crear Orden
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("manage");
              handleFetch();
            }}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "manage" ? "3px solid #3b82f6" : "3px solid transparent",
              color: activeTab === "manage" ? "#3b82f6" : "#9ca3af",
              fontWeight: activeTab === "manage" ? 600 : 400,
              cursor: "pointer",
              fontSize: "0.95rem",
              transition: "all 0.2s",
            }}
          >
            📋 Gestionar Órdenes
          </button>
        </div>

        {/* TAB CONTENT: CREAR ORDEN */}
        {activeTab === "create" && (
          <section
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              padding: "2rem",
              borderRadius: "1rem",
              border: "1px solid #334155",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", fontWeight: 600 }}>
                Nueva Orden
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                Creá una orden para una mesa o para llevar
              </p>
            </div>

            {createError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  background: "#7f1d1d",
                  border: "1px solid #dc2626",
                  color: "#fecaca",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                ❌ {createError}
              </div>
            )}
            {createSuccess && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  background: "#14532d",
                  border: "1px solid #22c55e",
                  color: "#bbf7d0",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                {createSuccess}
              </div>
            )}

            <form
              onSubmit={handleCreateOrder}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {/* Datos básicos */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#e5e7eb",
                    }}
                  >
                    Tipo de orden *
                  </label>
                  <select
                    value={createOrderType}
                    onChange={(e) => setCreateOrderType(e.target.value as OrderType)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #475569",
                      background: "#0f172a",
                      color: "white",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="dine_in">🏠 Dentro del local</option>
                    <option value="takeaway">📦 Para llevar</option>
                    <option value="delivery">🚚 Delivery</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#e5e7eb",
                    }}
                  >
                    Mesa {createOrderType === "dine_in" && "*"}
                  </label>
                  <select
                    value={createOrderTableId}
                    onChange={(e) => setCreateOrderTableId(e.target.value)}
                    disabled={loadingTables || createOrderType !== "dine_in"}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #475569",
                      background:
                        createOrderType === "dine_in" ? "#0f172a" : "#0f172a66",
                      color: "white",
                      fontSize: "0.9rem",
                      opacity: createOrderType === "dine_in" ? 1 : 0.5,
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

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#e5e7eb",
                    }}
                  >
                    ID Cliente (opcional)
                  </label>
                  <input
                    type="text"
                    value={createCustomerId}
                    onChange={(e) => setCreateCustomerId(e.target.value)}
                    placeholder="customer-uuid"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #475569",
                      background: "#0f172a",
                      color: "white",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <h3
                  style={{
                    fontSize: "1rem",
                    marginBottom: "0.75rem",
                    fontWeight: 600,
                    color: "#e5e7eb",
                  }}
                >
                  Productos
                </h3>

                {loadingProducts && (
                  <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                    Cargando productos del menú...
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {createItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr minmax(100px,0.8fr) 2fr auto",
                        gap: "0.75rem",
                        alignItems: "center",
                        padding: "0.75rem",
                        background: "#020617",
                        borderRadius: "0.5rem",
                        border: "1px solid #334155",
                      }}
                    >
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          handleChangeItem(index, "productId", e.target.value)
                        }
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #475569",
                          background: "#0f172a",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        <option value="">Seleccionar producto...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — ${p.price.toFixed(2)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          handleChangeItem(index, "quantity", e.target.value)
                        }
                        placeholder="Cantidad"
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #475569",
                          background: "#0f172a",
                          color: "white",
                          fontSize: "0.9rem",
                          width: "100%",
                        }}
                      />

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
                          padding: "0.6rem 0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #475569",
                          background: "#0f172a",
                          color: "white",
                          fontSize: "0.9rem",
                          width: "100%",
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        disabled={createItems.length === 1}
                        style={{
                          padding: "0.6rem 1rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #f97316",
                          background: createItems.length === 1 ? "#7c2d1233" : "#7c2d1266",
                          color: "#fed7aa",
                          fontSize: "0.85rem",
                          cursor: createItems.length === 1 ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                          opacity: createItems.length === 1 ? 0.5 : 1,
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.6rem 1.2rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #3b82f6",
                    background: "#1d4ed833",
                    color: "#bfdbfe",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  + Agregar producto
                </button>
              </div>

              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: "0.875rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: creating ? "#22c55e55" : "#22c55e",
                  color: "#022c22",
                  fontWeight: 600,
                  cursor: creating ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                  boxShadow: creating ? "none" : "0 4px 12px rgba(34, 197, 94, 0.3)",
                }}
              >
                {creating ? "⏳ Creando orden..." : "✅ Crear Orden"}
              </button>
            </form>
          </section>
        )}

        {/* TAB CONTENT: GESTIONAR ÓRDENES */}
        {activeTab === "manage" && (
          <div>
            {/* FILTROS */}
            <div
              style={{
                background: "#1e293b",
                padding: "1.5rem",
                borderRadius: "0.75rem",
                marginBottom: "1.5rem",
                border: "1px solid #334155",
              }}
            >
              <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", fontWeight: 600 }}>
                🔍 Filtros de búsqueda
              </h3>
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                }}
              >
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                    Estado
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #475569",
                      background: "#0f172a",
                      color: "white",
                    }}
                  >
                    <option value="">(Todos)</option>
                    <option value="pending">Pendiente</option>
                    <option value="preparing">Preparando</option>
                    <option value="delivered">Entregado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                    Mesa
                  </label>
                  <select
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #475569",
                      background: "#0f172a",
                      color: "white",
                    }}
                    disabled={loadingTables}
                  >
                    <option value="">(Todas)</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Mesa #{t.number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                    Tipo de orden
                  </label>
                  <select
                    value={orderTypeFilter}
                    onChange={(e) => setOrderTypeFilter(e.target.value as OrderType | "")}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #475569",
                      background: "#0f172a",
                      color: "white",
                    }}
                  >
                    <option value="">(Todas)</option>
                    <option value="dine_in">Dentro del local</option>
                    <option value="takeaway">Para llevar</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #475569",
                      background: "#0f172a",
                      color: "white",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                    Customer ID
                  </label>
                  <input
                    type="text"
                    value={customerIdFilter}
                    onChange={(e) => setCustomerIdFilter(e.target.value)}
                    placeholder="Filtrar por cliente"
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #475569",
                      background: "#0f172a",
                      color: "white",
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleFetch}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "0.625rem 1.25rem",
                      background: loading ? "#3b82f655" : "#3b82f6",
                      borderRadius: "0.5rem",
                      fontWeight: 600,
                      border: "none",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    {loading ? "Buscando..." : "🔍 Buscar"}
                  </button>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  background: "#7f1d1d",
                  border: "1px solid #dc2626",
                  color: "#fecaca",
                  marginBottom: "1rem",
                }}
              >
                ❌ {errorMsg}
              </div>
            )}

            {removeItemError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  background: "#7f1d1d",
                  border: "1px solid #dc2626",
                  color: "#fecaca",
                  marginBottom: "1rem",
                }}
              >
                ❌ {removeItemError}
              </div>
            )}

            {/* LISTADO DE ÓRDENES */}
            {loading ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem" }}>
                Cargando órdenes...
              </p>
            ) : orders.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  background: "#1e293b",
                  borderRadius: "0.75rem",
                  border: "1px solid #334155",
                }}
              >
                <p style={{ color: "#9ca3af", fontSize: "1rem", marginBottom: "0.5rem" }}>
                  📭 No se encontraron órdenes
                </p>
                <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                  Ajustá los filtros o creá una nueva orden
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1.5rem" }}>
                {orders.map((o) => {
                  const orderTotal = formatOrderTotal(o);
                  const isEditing = editOrderId === o.id;

                  return (
                    <div
                      key={o.id}
                      style={{
                        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                        padding: "1.5rem",
                        borderRadius: "0.75rem",
                        border: "1px solid #334155",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      {/* HEADER */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "1rem",
                          flexWrap: "wrap",
                          gap: "1rem",
                        }}
                      >
                        <div>
                          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                            Pedido #{(o as any).orderNumber ?? o.id.slice(0, 8)}
                          </h3>
                          <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                            {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                          </p>
                        </div>
                        <div
                          style={{
                            padding: "0.375rem 0.75rem",
                            borderRadius: "999px",
                            background: "#1e293b",
                            color: "#e5e7eb",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                          }}
                        >
                          {o.status}
                        </div>
                      </div>

                      {/* INFO */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "1rem",
                          marginBottom: "1rem",
                          padding: "1rem",
                          background: "#020617",
                          borderRadius: "0.5rem",
                        }}
                      >
                        <div>
                          <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                            Tipo
                          </p>
                          <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                            {o.orderType === "dine_in"
                              ? "🏠 Dentro del local"
                              : o.orderType === "takeaway"
                              ? "📦 Para llevar"
                              : o.orderType === "delivery"
                              ? "🚚 Delivery"
                              : o.orderType ?? "—"}
                          </p>
                        </div>
                        {(o as any).tableNumber && (
                          <div>
                            <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                              Mesa
                            </p>
                            <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                              #{(o as any).tableNumber}
                            </p>
                          </div>
                        )}
                        <div>
                          <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                            Total
                          </p>
                          <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#22c55e" }}>
                            ${orderTotal}
                          </p>
                        </div>
                      </div>

                      {/* ITEMS */}
                      <div style={{ marginBottom: "1rem" }}>
                        <p style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem", color: "#e5e7eb" }}>
                          Items:
                        </p>
                        <ul
                          style={{
                            paddingLeft: "1.1rem",
                            fontSize: "0.9rem",
                            color: "#e5e7eb",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          {o.items.map((it, idx) => {
                            const itemIdentifier = (it as any).itemId ?? (it as any).id;
                            return (
                              <li key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>
                                  {it.productName} x{it.quantity} — ${it.subtotal}
                                </span>
                                {itemIdentifier && !isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemFromOrder(o.id, itemIdentifier)}
                                    disabled={removeItemLoadingId === itemIdentifier}
                                    style={{
                                      marginLeft: "0.5rem",
                                      padding: "0.25rem 0.5rem",
                                      borderRadius: "0.25rem",
                                      border: "1px solid #f97316",
                                      background: "#7c2d1233",
                                      color: "#fed7aa",
                                      fontSize: "0.75rem",
                                      cursor: removeItemLoadingId === itemIdentifier ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    {removeItemLoadingId === itemIdentifier ? "Quitando..." : "Quitar"}
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* EDITAR ITEMS */}
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleStartEditOrderItems(o.id)}
                          style={{
                            marginBottom: "1rem",
                            padding: "0.6rem 1rem",
                            borderRadius: "0.5rem",
                            border: "1px solid #3b82f6",
                            background: "#1d4ed833",
                            color: "#bfdbfe",
                            fontSize: "0.9rem",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          ✏️ Agregar/actualizar items
                        </button>
                      ) : (
                        <div
                          style={{
                            marginBottom: "1rem",
                            padding: "1rem",
                            borderRadius: "0.5rem",
                            border: "1px solid #334155",
                            background: "#020617",
                          }}
                        >
                          <h4 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", fontWeight: 600 }}>
                            Editar items
                          </h4>

                          {editError && (
                            <p style={{ color: "#f87171", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                              {editError}
                            </p>
                          )}
                          {editSuccess && (
                            <p style={{ color: "#4ade80", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                              {editSuccess}
                            </p>
                          )}

                          <form onSubmit={handleUpdateOrderItems} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {editItems.map((item, index) => (
                              <div
                                key={index}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "2fr minmax(100px,0.8fr) auto",
                                  gap: "0.75rem",
                                  alignItems: "center",
                                }}
                              >
                                <select
                                  value={item.productId}
                                  onChange={(e) =>
                                    handleChangeEditItem(index, "productId", e.target.value)
                                  }
                                  style={{
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "0.5rem",
                                    border: "1px solid #475569",
                                    background: "#0f172a",
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

                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleChangeEditItem(index, "quantity", e.target.value)
                                  }
                                  style={{
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "0.5rem",
                                    border: "1px solid #475569",
                                    background: "#0f172a",
                                    color: "white",
                                    fontSize: "0.85rem",
                                    width: "100%",
                                  }}
                                />

                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditItemRow(index)}
                                  disabled={editItems.length === 1}
                                  style={{
                                    padding: "0.5rem 1rem",
                                    borderRadius: "0.5rem",
                                    border: "1px solid #f97316",
                                    background: "#7c2d1233",
                                    color: "#fed7aa",
                                    fontSize: "0.85rem",
                                    cursor: editItems.length === 1 ? "not-allowed" : "pointer",
                                  }}
                                >
                                  Eliminar
                                </button>
                              </div>
                            ))}

                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                              <button
                                type="button"
                                onClick={handleAddEditItemRow}
                                style={{
                                  padding: "0.5rem 1rem",
                                  borderRadius: "0.5rem",
                                  border: "1px solid #3b82f6",
                                  background: "#1d4ed833",
                                  color: "#bfdbfe",
                                  fontSize: "0.85rem",
                                  cursor: "pointer",
                                }}
                              >
                                + Agregar producto
                              </button>

                              <button
                                type="submit"
                                disabled={editLoading}
                                style={{
                                  padding: "0.5rem 1rem",
                                  borderRadius: "0.5rem",
                                  border: "none",
                                  background: "#22c55e",
                                  color: "#022c22",
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  cursor: editLoading ? "not-allowed" : "pointer",
                                }}
                              >
                                {editLoading ? "Actualizando..." : "Guardar"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditOrderId(null);
                                  setEditItems([{ productId: "", quantity: 1, specialInstructions: "" }]);
                                  setEditError("");
                                  setEditSuccess("");
                                }}
                                style={{
                                  padding: "0.5rem 1rem",
                                  borderRadius: "0.5rem",
                                  border: "1px solid #64748b",
                                  background: "transparent",
                                  color: "#e5e7eb",
                                  fontSize: "0.85rem",
                                  cursor: "pointer",
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* CERRAR CUENTA / FACTURAR */}
                      <div
                        style={{
                          padding: "1rem",
                          background: "#1e293b",
                          borderRadius: "0.5rem",
                          border: "1px solid #334155",
                        }}
                      >
                        <h4 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", fontWeight: 600, color: "#e5e7eb" }}>
                          💳 Cerrar Cuenta / Facturar
                        </h4>

                        {billOrderId === o.id && billError && (
                          <p style={{ color: "#f87171", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                            {billError}
                          </p>
                        )}

                        {billOrderId === o.id && billSuccess && (
                          <p style={{ color: "#4ade80", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                            {billSuccess}
                          </p>
                        )}

                        {billOrderId !== o.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBillOrderId(o.id);
                              setBillPaidAmount(orderTotal);
                            }}
                            style={{
                              width: "100%",
                              padding: "0.75rem 1rem",
                              borderRadius: "0.5rem",
                              border: "1px solid #22c55e",
                              background: "#14532d33",
                              color: "#86efac",
                              fontSize: "0.9rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            💰 Cerrar Cuenta
                          </button>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "0.75rem",
                              }}
                            >
                              <div>
                                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                                  Método de pago
                                </label>
                                <select
                                  value={billPaymentMethod}
                                  onChange={(e) =>
                                    setBillPaymentMethod(e.target.value as PaymentMethod)
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    borderRadius: "0.5rem",
                                    border: "1px solid #475569",
                                    background: "#0f172a",
                                    color: "white",
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  <option value="cash">Efectivo</option>
                                  <option value="credit_card">Tarjeta de crédito</option>
                                  <option value="debit_card">Tarjeta de débito</option>
                                  <option value="transfer">Transferencia</option>
                                  <option value="digital_wallet">Billetera digital</option>
                                </select>
                              </div>

                              <div>
                                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                                  Monto pagado *
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={billPaidAmount}
                                  onChange={(e) => setBillPaidAmount(e.target.value)}
                                  placeholder={orderTotal}
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    borderRadius: "0.5rem",
                                    border: "1px solid #475569",
                                    background: "#0f172a",
                                    color: "white",
                                    fontSize: "0.85rem",
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                                  Descuento (opcional)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={billDiscountAmount}
                                  onChange={(e) => setBillDiscountAmount(e.target.value)}
                                  placeholder="0.00"
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    borderRadius: "0.5rem",
                                    border: "1px solid #475569",
                                    background: "#0f172a",
                                    color: "white",
                                    fontSize: "0.85rem",
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                                  Propina (opcional)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={billTipAmount}
                                  onChange={(e) => setBillTipAmount(e.target.value)}
                                  placeholder="0.00"
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    borderRadius: "0.5rem",
                                    border: "1px solid #475569",
                                    background: "#0f172a",
                                    color: "white",
                                    fontSize: "0.85rem",
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                type="button"
                                onClick={handleCreateBill}
                                disabled={billLoading}
                                style={{
                                  flex: 1,
                                  padding: "0.75rem 1rem",
                                  borderRadius: "0.5rem",
                                  border: "none",
                                  background: billLoading ? "#22c55e55" : "#22c55e",
                                  color: "#022c22",
                                  fontSize: "0.9rem",
                                  fontWeight: 600,
                                  cursor: billLoading ? "not-allowed" : "pointer",
                                }}
                              >
                                {billLoading ? "Creando factura..." : "✅ Crear Factura"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setBillOrderId("");
                                  setBillPaidAmount("");
                                  setBillDiscountAmount("");
                                  setBillTipAmount("");
                                  setBillError("");
                                  setBillSuccess("");
                                }}
                                style={{
                                  padding: "0.75rem 1rem",
                                  borderRadius: "0.5rem",
                                  border: "1px solid #64748b",
                                  background: "transparent",
                                  color: "#e5e7eb",
                                  fontSize: "0.9rem",
                                  cursor: "pointer",
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
