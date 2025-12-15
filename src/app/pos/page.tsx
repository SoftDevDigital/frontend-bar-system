// src/app/pos/page.tsx - Punto de Venta Simplificado
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
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
  createBill,
  type PaymentMethod,
  createDirectSaleBill,
  type CreateDirectSalePayload,
  getBillTicket,
  type BillTicket,
} from "../lib/api";

type UserRole = "admin" | "employee" | "customer" | string | null;

type CartItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
};

// Helper para imprimir ticket
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
          h1, h2, h3, p { margin: 0; padding: 0; }
          .center { text-align: center; }
          .mt-4 { margin-top: 4px; }
          .mt-8 { margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; }
          .total-row td { border-top: 1px dashed #000; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2>Ticket</h2>
          <p>${ticket.billNumber}</p>
        </div>
        <p class="mt-8">Fecha: ${new Date(ticket.fecha).toLocaleString()}</p>
        <p>Tipo venta: ${ticket.tipoVenta}${ticket.mesa ? " (Mesa " + ticket.mesa + ")" : ""}</p>
        <p>Cliente: ${ticket.cliente}</p>
        <h3 class="mt-8">Productos</h3>
        <table class="mt-4">
          <tbody>${productosHtml}</tbody>
        </table>
        <table class="mt-8">
          <tbody>
            <tr><td>Subtotal</td><td style="text-align:right;">$${ticket.subtotal.toFixed(
              2
            )}</td></tr>
            <tr><td>Impuestos</td><td style="text-align:right;">$${ticket.impuestos.toFixed(
              2
            )}</td></tr>
            <tr class="total-row"><td><strong>Total</strong></td><td style="text-align:right;"><strong>$${ticket.total.toFixed(
              2
            )}</strong></td></tr>
            <tr><td>Pago (${ticket.metodoPago})</td><td style="text-align:right;">$${ticket.montoPagado.toFixed(
              2
            )}</td></tr>
            <tr><td>Cambio</td><td style="text-align:right;">$${ticket.cambio.toFixed(
              2
            )}</td></tr>
          </tbody>
        </table>
        <p class="center mt-8">¡Gracias por su visita!</p>
        <script>window.onload = function() { window.print(); window.close(); };</script>
      </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export default function POSPage() {
  // Permisos
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

  // Modo: "quick" (venta rápida/directa) o "table" (mesa)
  const [mode, setMode] = useState<"quick" | "table">("quick");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Datos
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrito
  const [cart, setCart] = useState<CartItem[]>([]);

  // Facturación
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ===== Helpers UI para Ordenes (AGREGADO) =====
  const getTableLabelFromOrder = (order: Order) => {
    const tableId = (order as any).tableId ?? (order as any).table?.id ?? order.tableId;

    const tableNumber =
      (order as any).tableNumber ??
      (order as any).table?.number ??
      tables.find((t) => t.id === tableId)?.number;

    const tableLocation =
      (order as any).table?.location ??
      tables.find((t) => t.id === tableId)?.location;

    if (!tableNumber) return "Mesa —";
    return `Mesa #${tableNumber}${tableLocation ? ` — ${tableLocation}` : ""}`;
  };

  const getOrderItemsLabel = (order: Order) => {
    const items = (order as any).items ?? [];
    if (!Array.isArray(items) || items.length === 0) return "Sin productos";

    return items
      .map((it: any) => {
        const name = it.productName ?? it.product?.name ?? "Producto";
        const qty = it.quantity ?? 0;
        return `${qty}x ${name}`;
      })
      .join(", ");
  };

  const getOrderTotal = (order: Order) => {
    const total = (order as any).totalAmount ?? (order as any).total ?? (order as any).subtotal ?? 0;
    return Number(total) || 0;
  };

  // Cargar datos
  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, tablesRes] = await Promise.all([
          getProducts({ available: true }),
          getTables(),
        ]);
        if (productsRes.success && productsRes.data) setProducts(productsRes.data);
        if (tablesRes.success && tablesRes.data) setTables(tablesRes.data);
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    }
    fetchData();
  }, []);

  // ============================
  // ✅ Cargar órdenes activas para mesas SIN parpadeo
  // ============================
  const didInitialOrdersLoad = useRef(false);

  useEffect(() => {
    if (mode !== "table") return;

    let alive = true;

    const fetchOrders = async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;

      // Solo mostramos loading la primera vez
      if (!silent && !didInitialOrdersLoad.current) setLoading(true);

      try {
        const res = await getOrders({ status: "pending", limit: 100 });
        if (!alive) return;

        if (res.success && res.data) {
          const next = res.data ?? [];

          setOrders((prev) => {
            // Evitar re-render si es igual
            const same =
              prev.length === next.length &&
              prev.every((p, i) => {
                const n = next[i] as any;
                return (
                  (p as any).id === n.id &&
                  (p as any).status === n.status &&
                  ((p as any).totalAmount ?? (p as any).total ?? 0) ===
                    (n.totalAmount ?? n.total ?? 0) &&
                  ((p as any).items?.length ?? 0) === ((n.items?.length ?? 0) as number) &&
                  (p as any).updatedAt === n.updatedAt
                );
              });

            return same ? prev : next;
          });

          didInitialOrdersLoad.current = true;
        }
      } catch (err) {
        console.error("Error cargando órdenes:", err);
      } finally {
        // Si ya cargó al menos una vez, dejamos loading apagado siempre
        if (!silent && !didInitialOrdersLoad.current) setLoading(false);
        if (didInitialOrdersLoad.current) setLoading(false);
      }
    };

    // Primera carga (con loading)
    fetchOrders({ silent: false });

    // Polling silencioso
    const interval = setInterval(() => fetchOrders({ silent: true }), 5000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [mode]);

  // Helpers carrito
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        { productId: product.id, productName: product.name, price: product.price, quantity: 1 },
      ];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
      );
    }
  };

  const clearCart = () => {
    setCart([]);
    setPaidAmount("");
    setError("");
    setSuccess("");
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  // Venta rápida (directa)
  const handleQuickSale = async () => {
    if (cart.length === 0) {
      setError("Agregá al menos un producto");
      return;
    }

    if (!paidAmount.trim()) {
      setError("Ingresá el monto pagado");
      return;
    }

    const paid = parseFloat(paidAmount.replace(",", "."));
    const total = calculateTotal();

    if (Number.isNaN(paid) || paid < total) {
      setError(`El monto pagado debe ser mayor o igual a $${total.toFixed(2)}`);
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const payload: CreateDirectSalePayload = {
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        paymentMethod,
        paidAmount: paid,
        ...(userId ? { cashierId: userId } : {}),
      };

      const res = await createDirectSaleBill(payload);
      if (res.success && res.data) {
        setSuccess(`✅ Venta creada: ${res.data.billNumber}`);
        try {
          const ticketRes = await getBillTicket(res.data.id);
          if (ticketRes.success && ticketRes.data) printBillTicket(ticketRes.data);
        } catch (e) {
          console.error("Error al imprimir:", e);
        }
        clearCart();
      } else {
        setError(res.message || "Error al crear la venta");
      }
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setProcessing(false);
    }
  };

  // Crear orden de mesa
  const handleCreateTableOrder = async () => {
    if (!selectedTableId) {
      setError("Seleccioná una mesa");
      return;
    }

    if (cart.length === 0) {
      setError("Agregá al menos un producto");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const payload: CreateOrderPayload = {
        orderType: "dine_in",
        tableId: selectedTableId,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      };

      const res = await createOrder(payload);
      if (res.success && res.data) {
        setSuccess(`✅ Orden creada: ${res.data.orderNumber}`);
        clearCart();
        setSelectedTableId("");
        // Recargar órdenes (silencioso)
        const ordersRes = await getOrders({ status: "pending", limit: 100 });
        if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data);
      } else {
        setError(res.message || "Error al crear la orden");
      }
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setProcessing(false);
    }
  };

  // Agregar items a orden existente
  const handleAddToOrder = async () => {
    if (!selectedOrderId || cart.length === 0) {
      setError("Seleccioná una orden y agregá productos");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const currentOrder = orders.find((o) => o.id === selectedOrderId);
      if (!currentOrder) {
        setError("Orden no encontrada");
        return;
      }

      // Combinar items actuales con nuevos
      const existingItems = currentOrder.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const newItems = cart.map((item) => {
        const existing = existingItems.find((ei) => ei.productId === item.productId);
        return {
          productId: item.productId,
          quantity: existing ? existing.quantity + item.quantity : item.quantity,
        };
      });

      // Actualizar orden
      const res = await updateOrderItems(selectedOrderId, {
        items: [
          ...existingItems.filter((ei) => !cart.some((c) => c.productId === ei.productId)),
          ...newItems,
        ],
      });

      if (res.success && res.data) {
        setSuccess("✅ Productos agregados a la orden");
        clearCart();
        setSelectedOrderId(null);
        const ordersRes = await getOrders({ status: "pending", limit: 100 });
        if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data);
      } else {
        setError(res.message || "Error al agregar productos");
      }
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setProcessing(false);
    }
  };

  // Facturar orden
  const handleBillOrder = async () => {
    if (!selectedOrderId) {
      setError("Seleccioná una orden para facturar");
      return;
    }

    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) {
      setError("Orden no encontrada");
      return;
    }

    const total = getOrderTotal(order);

    if (!paidAmount.trim()) {
      setError("Ingresá el monto pagado");
      return;
    }

    const paid = parseFloat(paidAmount.replace(",", "."));
    if (Number.isNaN(paid) || paid < total) {
      setError(`El monto pagado debe ser mayor o igual a $${total.toFixed(2)}`);
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        orderId: selectedOrderId,
        paymentMethod,
        paidAmount: paid,
        ...(userId ? { cashierId: userId } : {}),
      };

      const res = await createBill(payload);
      if (res.success && res.data) {
        setSuccess(`✅ Factura creada: ${res.data.billNumber}`);
        try {
          const ticketRes = await getBillTicket(res.data.id);
          if (ticketRes.success && ticketRes.data) printBillTicket(ticketRes.data);
        } catch (e) {
          console.error("Error al imprimir:", e);
        }
        setSelectedOrderId(null);
        setPaidAmount("");
        const ordersRes = await getOrders({ status: "pending", limit: 100 });
        if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data);
      } else {
        setError(res.message || "Error al crear la factura");
      }
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setProcessing(false);
    }
  };

  // Reset cuando cambia el modo
  useEffect(() => {
    clearCart();
    setSelectedOrderId(null);
    setSelectedTableId("");
  }, [mode]);

  // Render
  if (checkingRole) {
    return (
      <div
        style={{
          background: "#020617",
          minHeight: "100vh",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div style={{ background: "#020617", minHeight: "100vh", color: "white", padding: "2rem" }}>
        <h1>Punto de Venta</h1>
        <p style={{ color: "#f87171" }}>No tenés permisos para acceder.</p>
      </div>
    );
  }

  const total = calculateTotal();
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const orderTotal = selectedOrder ? getOrderTotal(selectedOrder) : 0;

  return (
    <div
      style={{
        background: "#020617",
        minHeight: "100vh",
        color: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER SIMPLE */}
      <div style={{ padding: "1rem 2rem", borderBottom: "1px solid #334155", background: "#0f172a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>💳 Punto de Venta</h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="button"
              onClick={() => setMode("quick")}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: mode === "quick" ? "#f59e0b" : "#1e293b",
                color: "white",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🛒 Venta Rápida
            </button>
            <button
              type="button"
              onClick={() => setMode("table")}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: mode === "table" ? "#3b82f6" : "#1e293b",
                color: "white",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🏠 Mesa
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* PANEL IZQUIERDO: Productos */}
        <div
          style={{
            width: "60%",
            borderRight: "1px solid #334155",
            background: "#0f172a",
            overflowY: "auto",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", fontWeight: 600 }}>Productos</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                style={{
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #334155",
                  background: "#1e293b",
                  color: "white",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#334155";
                  e.currentTarget.style.borderColor = "#475569";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#1e293b";
                  e.currentTarget.style.borderColor = "#334155";
                }}
              >
                <p style={{ fontWeight: 600, margin: "0 0 0.25rem 0", fontSize: "0.95rem" }}>{product.name}</p>
                <p style={{ color: "#22c55e", fontSize: "0.9rem", margin: 0 }}>${product.price.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO: Carrito / Acciones */}
        <div style={{ width: "40%", background: "#020617", overflowY: "auto", padding: "1.5rem" }}>
          {/* Carrito */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Carrito</h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #f97316",
                    background: "transparent",
                    color: "#fed7aa",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Limpiar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem" }}>El carrito está vacío</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500 }}>{item.productName}</p>
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#9ca3af" }}>
                        ${item.price.toFixed(2)} c/u
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "0.25rem",
                          border: "1px solid #475569",
                          background: "#0f172a",
                          color: "white",
                          cursor: "pointer",
                          fontSize: "1rem",
                        }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: "30px", textAlign: "center", fontSize: "0.9rem" }}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "0.25rem",
                          border: "1px solid #475569",
                          background: "#0f172a",
                          color: "white",
                          cursor: "pointer",
                          fontSize: "1rem",
                        }}
                      >
                        +
                      </button>
                    </div>
                    <p style={{ margin: 0, minWidth: "60px", textAlign: "right", fontWeight: 600, fontSize: "0.9rem" }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "#1e293b",
                border: "1px solid #334155",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>Total:</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22c55e" }}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "#7f1d1d",
                border: "1px solid #dc2626",
                color: "#fecaca",
                marginBottom: "1rem",
                fontSize: "0.9rem",
              }}
            >
              ❌ {error}
            </div>
          )}
          {success && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "#14532d",
                border: "1px solid #22c55e",
                color: "#bbf7d0",
                marginBottom: "1rem",
                fontSize: "0.9rem",
              }}
            >
              {success}
            </div>
          )}

          {/* VENTA RÁPIDA */}
          {mode === "quick" && (
            <div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                  Método de pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "white",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="cash">💵 Efectivo</option>
                  <option value="credit_card">💳 Tarjeta crédito</option>
                  <option value="debit_card">💳 Tarjeta débito</option>
                  <option value="transfer">🏦 Transferencia</option>
                  <option value="digital_wallet">📱 Billetera digital</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                  Monto pagado
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={total.toFixed(2)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "white",
                    fontSize: "1rem",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleQuickSale}
                disabled={processing || cart.length === 0}
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: processing || cart.length === 0 ? "#f59e0b55" : "#f59e0b",
                  color: "#022c22",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  cursor: processing || cart.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                {processing ? "⏳ Procesando..." : "✅ Vender e Imprimir"}
              </button>
            </div>
          )}

          {/* MESA */}
          {mode === "table" && (
            <div>
              {!selectedOrderId ? (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                      Seleccionar Mesa
                    </label>
                    <select
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #475569",
                        background: "#0f172a",
                        color: "white",
                        fontSize: "0.95rem",
                      }}
                    >
                      <option value="">Seleccionar mesa...</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          Mesa #{table.number} — {table.location}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTableId && cart.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCreateTableOrder}
                      disabled={processing}
                      style={{
                        width: "100%",
                        padding: "1rem",
                        borderRadius: "0.5rem",
                        border: "none",
                        background: processing ? "#3b82f655" : "#3b82f6",
                        color: "white",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        cursor: processing ? "not-allowed" : "pointer",
                        marginBottom: "1rem",
                      }}
                    >
                      {processing ? "⏳ Creando..." : "➕ Crear Orden"}
                    </button>
                  )}

                  {/* Órdenes activas */}
                  <div style={{ marginTop: "1.5rem" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Órdenes Activas</h3>
                    {loading ? (
                      <p style={{ color: "#9ca3af", textAlign: "center" }}>Cargando...</p>
                    ) : orders.length === 0 ? (
                      <p style={{ color: "#9ca3af", fontSize: "0.9rem", textAlign: "center" }}>No hay órdenes activas</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {orders.map((order) => {
                          const tableLabel = getTableLabelFromOrder(order);
                          const itemsLabel = getOrderItemsLabel(order);
                          const thisTotal = getOrderTotal(order);

                          return (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setPaidAmount(String(thisTotal));
                              }}
                              style={{
                                padding: "0.75rem",
                                borderRadius: "0.5rem",
                                border: "1px solid #334155",
                                background: "#1e293b",
                                color: "white",
                                textAlign: "left",
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>
                                    {(order as any).orderNumber ?? order.id.slice(0, 8)}
                                  </p>

                                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#9ca3af" }}>
                                    {tableLabel}
                                  </p>

                                  <p
                                    style={{
                                      margin: "0.25rem 0 0 0",
                                      fontSize: "0.85rem",
                                      color: "#cbd5e1",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {itemsLabel}
                                  </p>
                                </div>

                                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#22c55e", whiteSpace: "nowrap" }}>
                                  ${thisTotal.toFixed(2)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "0.5rem",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 600 }}>
                        Orden #{(selectedOrder as any)?.orderNumber ?? selectedOrder?.id.slice(0, 8)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(null);
                          clearCart();
                        }}
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.25rem",
                          border: "1px solid #475569",
                          background: "transparent",
                          color: "#9ca3af",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        Cambiar
                      </button>
                    </div>

                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#9ca3af" }}>
                      {selectedOrder ? `${getTableLabelFromOrder(selectedOrder)} • Total: $${orderTotal.toFixed(2)}` : `Total: $${orderTotal.toFixed(2)}`}
                    </p>
                  </div>

                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddToOrder}
                      disabled={processing}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        border: "none",
                        background: processing ? "#3b82f655" : "#3b82f6",
                        color: "white",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        cursor: processing ? "not-allowed" : "pointer",
                        marginBottom: "1rem",
                      }}
                    >
                      {processing ? "⏳ Agregando..." : "➕ Agregar a Orden"}
                    </button>
                  )}

                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                      Método de pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #475569",
                        background: "#0f172a",
                        color: "white",
                        fontSize: "0.95rem",
                      }}
                    >
                      <option value="cash">💵 Efectivo</option>
                      <option value="credit_card">💳 Tarjeta crédito</option>
                      <option value="debit_card">💳 Tarjeta débito</option>
                      <option value="transfer">🏦 Transferencia</option>
                      <option value="digital_wallet">📱 Billetera digital</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                      Monto pagado
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder={orderTotal.toFixed(2)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #475569",
                        background: "#0f172a",
                        color: "white",
                        fontSize: "1rem",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleBillOrder}
                    disabled={processing}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: processing ? "#22c55e55" : "#22c55e",
                      color: "#022c22",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      cursor: processing ? "not-allowed" : "pointer",
                    }}
                  >
                    {processing ? "⏳ Facturando..." : "✅ Facturar e Imprimir"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
