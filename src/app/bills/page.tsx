// src/app/bills/page.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  getBills,
  type Bill,
  getProducts,
  type Product,
  createDirectSaleBill,
  type CreateDirectSalePayload,
  type PaymentMethod,
  getBillTicket,
  type BillTicket,
} from "../lib/api";

type UserRole = "admin" | "employee" | "customer" | string | null;

type DirectSaleItemInput = {
  productId: string;
  quantity: number;
};

export default function BillsPage() {
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
  const [activeTab, setActiveTab] = useState<"direct-sale" | "list">("direct-sale");

  // 👉 productos del menú (para Venta Directa)
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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

  // 👉 VENTA DIRECTA (sin mesa)
  const [dsItems, setDsItems] = useState<DirectSaleItemInput[]>([
    { productId: "", quantity: 1 },
  ]);
  const [dsPaymentMethod, setDsPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [dsPaidAmount, setDsPaidAmount] = useState("");
  const [dsDiscountAmount, setDsDiscountAmount] = useState("");
  const [dsCustomerId, setDsCustomerId] = useState("");
  const [dsCashierId, setDsCashierId] = useState("");
  const [dsNotes, setDsNotes] = useState("");
  const [dsLoading, setDsLoading] = useState(false);
  const [dsError, setDsError] = useState("");
  const [dsSuccess, setDsSuccess] = useState("");

  // 👉 estado para impresión de ticket
  const [printingTicketId, setPrintingTicketId] = useState<string | null>(
    null
  );

  // Prefill cashierId con el userId (si existe)
  useEffect(() => {
    if (userId && !dsCashierId) {
      setDsCashierId(userId);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 👉 LISTADO DE FACTURAS
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ================== IMPRESIÓN DE TICKET ==================

  const openPrintWindowWithTicket = (ticket: BillTicket) => {
    const itemsRows = (ticket.productos || [])
      .map(
        (p) => `
        <tr>
          <td>${p.nombre}</td>
          <td style="text-align:right;">${p.cantidad}</td>
          <td style="text-align:right;">$${Number(
            p.precioUnitario
          ).toFixed(2)}</td>
          <td style="text-align:right;">$${Number(p.total).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Ticket ${ticket.billNumber}</title>
<style>
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 8px;
    margin: 0;
  }
  h1 {
    font-size: 16px;
    text-align: center;
    margin: 0 0 4px 0;
  }
  h2 {
    font-size: 13px;
    text-align: center;
    margin: 0 0 8px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-top: 8px;
  }
  th, td {
    padding: 2px 0;
  }
  th {
    border-bottom: 1px solid #000;
    text-align: left;
  }
  .totals {
    margin-top: 8px;
    font-size: 12px;
  }
  .totals div {
    display: flex;
    justify-content: space-between;
  }
  .footer {
    margin-top: 12px;
    text-align: center;
    font-size: 11px;
  }
</style>
</head>
<body>
  <h1>Ticket de consumo</h1>
  <h2>${ticket.billNumber}</h2>
  <div style="font-size: 11px; margin-top: 4px;">
    <div><strong>Fecha:</strong> ${new Date(
      ticket.fecha
    ).toLocaleString()}</div>
    <div><strong>Cliente:</strong> ${ticket.cliente}</div>
    <div><strong>Tipo:</strong> ${ticket.tipoVenta}</div>
    ${
      typeof ticket.mesa === "number"
        ? `<div><strong>Mesa:</strong> ${ticket.mesa}</div>`
        : ""
    }
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th style="text-align:right;">Cant</th>
        <th style="text-align:right;">P. Unit</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>$${Number(
      ticket.subtotal
    ).toFixed(2)}</span></div>
    <div><span>Impuestos</span><span>$${Number(
      ticket.impuestos
    ).toFixed(2)}</span></div>
    <div><strong>Total</strong><strong>$${Number(
      ticket.total
    ).toFixed(2)}</strong></div>
    <div><span>Pagado</span><span>$${Number(
      ticket.montoPagado
    ).toFixed(2)}</span></div>
    <div><span>Cambio</span><span>$${Number(
      ticket.cambio
    ).toFixed(2)}</span></div>
    <div><span>Método</span><span>${ticket.metodoPago}</span></div>
  </div>

  <div class="footer">
    ¡Gracias por su visita!
  </div>

  <script>
    window.onload = function() {
      try {
        window.print();
      } catch (e) {}
      window.close();
    };
  </script>
</body>
</html>
`;

    const win = window.open("", "_blank", "width=350,height=600");
    if (!win) {
      alert("No se pudo abrir la ventana de impresión.");
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const handlePrintTicket = async (billId: string) => {
    try {
      setPrintingTicketId(billId);
      const res = await getBillTicket(billId);
      if (!res.success || !res.data) {
        alert(res.message || "No se pudo obtener la información del ticket.");
        return;
      }
      openPrintWindowWithTicket(res.data);
    } catch (err: any) {
      alert(err?.message || "Error inesperado al obtener el ticket.");
    } finally {
      setPrintingTicketId(null);
    }
  };

  // ================== CREAR VENTA DIRECTA ==================

  const handleChangeDirectSaleItem = (
    index: number,
    field: keyof DirectSaleItemInput,
    value: string
  ) => {
    setDsItems((prev) =>
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

  const handleAddDirectSaleItemRow = () => {
    setDsItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  };

  const handleRemoveDirectSaleItemRow = (index: number) => {
    setDsItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateDirectSaleTotal = () => {
    return dsItems.reduce((sum, item) => {
      if (!item.productId || item.quantity <= 0) return sum;
      const p = products.find((prod) => prod.id === item.productId);
      if (!p) return sum;
      return sum + p.price * item.quantity;
    }, 0);
  };

  const handleCreateDirectSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setDsError("");
    setDsSuccess("");

    const filteredItems = dsItems
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
      }));

    if (!filteredItems.length) {
      setDsError(
        "Agregá al menos un producto a la venta con cantidad mayor a 0."
      );
      return;
    }

    if (!dsPaidAmount.trim()) {
      setDsError("Ingresá el monto pagado (paidAmount).");
      return;
    }

    const paid = parseFloat(dsPaidAmount.replace(",", "."));
    if (Number.isNaN(paid) || paid <= 0) {
      setDsError("Ingresá un monto pagado válido mayor a 0.");
      return;
    }

    const total = calculateDirectSaleTotal();
    if (paid < total) {
      setDsError(
        `El monto pagado ($${paid.toFixed(
          2
        )}) no puede ser menor al total estimado de la venta ($${total.toFixed(
          2
        )}).`
      );
      return;
    }

    const discount = dsDiscountAmount.trim()
      ? parseFloat(dsDiscountAmount.replace(",", "."))
      : 0;

    const payload: CreateDirectSalePayload = {
      items: filteredItems,
      paymentMethod: dsPaymentMethod,
      paidAmount: paid,
      ...(dsCustomerId.trim() ? { customerId: dsCustomerId.trim() } : {}),
      ...(dsCashierId.trim() ? { cashierId: dsCashierId.trim() } : {}),
      ...(discount > 0 ? { discountAmount: discount } : {}),
      ...(dsNotes.trim() ? { notes: dsNotes.trim() } : {}),
    };

    try {
      setDsLoading(true);
      const res = await createDirectSaleBill(payload);

      if (!res.success || !res.data) {
        setDsError(res.message || "No se pudo crear la venta directa.");
        return;
      }

      const bill = res.data;

      setDsSuccess(
        `✅ Venta directa creada. Factura N° ${bill.billNumber}. Total: $${bill.totalAmount.toFixed(
          2
        )}. Estado: ${bill.status}.`
      );
      setDsError("");

      // 👉 Imprimir ticket automáticamente de esta factura
      if (bill.id) {
        await handlePrintTicket(bill.id);
      }

      // Reseteo campos principales
      setDsItems([{ productId: "", quantity: 1 }]);
      setDsPaidAmount("");
      setDsDiscountAmount("");
      setDsCustomerId("");
      setDsNotes("");

      // refresco listado de facturas y cambio a tab de listado
      await handleFetch();
      setActiveTab("list");
    } catch (err: any) {
      setDsError(
        err?.message || "Error inesperado al crear la venta directa."
      );
    } finally {
      setDsLoading(false);
    }
  };

  const handleFetch = async () => {
    setLoading(true);
    setErrorMsg("");
    setBills([]);

    try {
      const res = await getBills({
        date: date || undefined,
        paymentMethod: paymentMethod || undefined,
        status: status || undefined,
        limit,
        page,
      });

      if (res.success && res.data) {
        setBills(res.data);
      } else {
        setErrorMsg(res.message || "Error desconocido");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado");
    }

    setLoading(false);
  };

  // ================== PERMISOS ==================
  if (checkingRole) {
    return (
      <div style={{ background: "#020617", minHeight: "100vh", color: "white" }}>
        <main
          style={{
            padding: "2rem",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            💳 Facturación
          </h1>
          <p style={{ color: "#9ca3af" }}>Cargando permisos...</p>
        </main>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div style={{ background: "#020617", minHeight: "100vh", color: "white" }}>
        <main
          style={{
            padding: "2rem",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            💳 Facturación
          </h1>
          <p style={{ color: "#f87171", maxWidth: "520px" }}>
            No tenés permisos para ver esta página.
          </p>
        </main>
      </div>
    );
  }

  // ================== VISTA STAFF ==================
  const directSaleTotal = calculateDirectSaleTotal();

  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "white" }}>
      <main
        style={{
          padding: "2rem",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "0.5rem", fontWeight: 700 }}>
            💳 Facturación
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "1rem" }}>
            Gestioná ventas directas y consultá el historial de facturas
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
            onClick={() => setActiveTab("direct-sale")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "direct-sale" ? "3px solid #22c55e" : "3px solid transparent",
              color: activeTab === "direct-sale" ? "#22c55e" : "#9ca3af",
              fontWeight: activeTab === "direct-sale" ? 600 : 400,
              cursor: "pointer",
              fontSize: "0.95rem",
              transition: "all 0.2s",
            }}
          >
            🛒 Venta Directa
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("list");
              handleFetch();
            }}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "list" ? "3px solid #3b82f6" : "3px solid transparent",
              color: activeTab === "list" ? "#3b82f6" : "#9ca3af",
              fontWeight: activeTab === "list" ? 600 : 400,
              cursor: "pointer",
              fontSize: "0.95rem",
              transition: "all 0.2s",
            }}
          >
            📋 Historial de Facturas
          </button>
        </div>

        {/* TAB CONTENT: VENTA DIRECTA */}
        {activeTab === "direct-sale" && (
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
                Nueva Venta Directa
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                Creá una factura rápida para ventas sin mesa (takeaway, delivery, etc.)
              </p>
            </div>

            {dsError && (
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
                ❌ {dsError}
              </div>
            )}
            {dsSuccess && (
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
                {dsSuccess}
              </div>
            )}

            <form
              onSubmit={handleCreateDirectSale}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {/* PRODUCTOS */}
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
                  {dsItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr minmax(100px,0.8fr) auto",
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
                          handleChangeDirectSaleItem(
                            index,
                            "productId",
                            e.target.value
                          )
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
                          handleChangeDirectSaleItem(
                            index,
                            "quantity",
                            e.target.value
                          )
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

                      <button
                        type="button"
                        onClick={() => handleRemoveDirectSaleItemRow(index)}
                        disabled={dsItems.length === 1}
                        style={{
                          padding: "0.6rem 1rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #f97316",
                          background: dsItems.length === 1 ? "#7c2d1233" : "#7c2d1266",
                          color: "#fed7aa",
                          fontSize: "0.85rem",
                          cursor: dsItems.length === 1 ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                          opacity: dsItems.length === 1 ? 0.5 : 1,
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddDirectSaleItemRow}
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

                {/* TOTAL ESTIMADO */}
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "#1e293b",
                    borderRadius: "0.5rem",
                    border: "1px solid #334155",
                  }}
                >
                  <p
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "#e5e7eb",
                    }}
                  >
                    Total estimado: <span style={{ color: "#22c55e" }}>${directSaleTotal.toFixed(2)}</span>
                  </p>
                </div>
              </div>

              {/* DATOS DE PAGO Y CLIENTE */}
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
                    Método de pago *
                  </label>
                  <select
                    value={dsPaymentMethod}
                    onChange={(e) =>
                      setDsPaymentMethod(e.target.value as PaymentMethod)
                    }
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
                    <option value="cash">💵 Efectivo</option>
                    <option value="credit_card">💳 Tarjeta de crédito</option>
                    <option value="debit_card">💳 Tarjeta de débito</option>
                    <option value="transfer">🏦 Transferencia</option>
                    <option value="digital_wallet">📱 Billetera digital</option>
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
                    Monto pagado *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={dsPaidAmount}
                    onChange={(e) => setDsPaidAmount(e.target.value)}
                    placeholder="Ej: 50.00"
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
                    Descuento (opcional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={dsDiscountAmount}
                    onChange={(e) => setDsDiscountAmount(e.target.value)}
                    placeholder="Ej: 0.00"
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
                    value={dsCustomerId}
                    onChange={(e) => setDsCustomerId(e.target.value)}
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
                    Cashier ID (opcional)
                  </label>
                  <input
                    type="text"
                    value={dsCashierId}
                    onChange={(e) => setDsCashierId(e.target.value)}
                    placeholder="Por defecto: tu userId"
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
                    Notas (opcional)
                  </label>
                  <input
                    type="text"
                    value={dsNotes}
                    onChange={(e) => setDsNotes(e.target.value)}
                    placeholder='Ej: "Para llevar"'
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

              <button
                type="submit"
                disabled={dsLoading}
                style={{
                  padding: "0.875rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: dsLoading ? "#22c55e55" : "#22c55e",
                  color: "#022c22",
                  fontWeight: 600,
                  cursor: dsLoading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                  boxShadow: dsLoading ? "none" : "0 4px 12px rgba(34, 197, 94, 0.3)",
                }}
              >
                {dsLoading ? "⏳ Creando venta..." : "✅ Crear Venta Directa"}
              </button>
            </form>
          </section>
        )}

        {/* TAB CONTENT: LISTADO DE FACTURAS */}
        {activeTab === "list" && (
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
                    Método de pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
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
                    <option value="cash">Efectivo</option>
                    <option value="credit_card">Tarjeta de crédito</option>
                    <option value="debit_card">Tarjeta de débito</option>
                    <option value="transfer">Transferencia</option>
                    <option value="digital_wallet">Billetera digital</option>
                  </select>
                </div>

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
                    <option value="paid">Pagado</option>
                    <option value="pending">Pendiente</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
                    Límite
                  </label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    min={1}
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
                    Página
                  </label>
                  <input
                    type="number"
                    value={page}
                    onChange={(e) => setPage(Number(e.target.value))}
                    min={1}
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

            {/* LISTADO DE FACTURAS */}
            {loading ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem" }}>
                Cargando facturas...
              </p>
            ) : bills.length === 0 ? (
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
                  📭 No se encontraron facturas
                </p>
                <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                  Ajustá los filtros o creá una nueva venta directa
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {bills.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                      padding: "1.5rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #334155",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "1rem",
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                          Factura #{b.id.slice(0, 8)}
                        </h3>
                        <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                          {new Date(b.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div
                        style={{
                          padding: "0.375rem 0.75rem",
                          borderRadius: "999px",
                          background:
                            b.status === "paid"
                              ? "#14532d"
                              : b.status === "pending"
                              ? "#7c2d12"
                              : "#7f1d1d",
                          color:
                            b.status === "paid"
                              ? "#86efac"
                              : b.status === "pending"
                              ? "#fed7aa"
                              : "#fecaca",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                        }}
                      >
                        {b.status === "paid" ? "✅ Pagado" : b.status === "pending" ? "⏳ Pendiente" : "❌ Cancelado"}
                      </div>
                    </div>

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
                          Orden ID
                        </p>
                        <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                          {b.orderId.slice(0, 8)}...
                        </p>
                      </div>
                      <div>
                        <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                          Mesa
                        </p>
                        <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                          #{b.tableNumber}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                          Método de pago
                        </p>
                        <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                          {b.paymentMethod}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "1rem",
                        background: "#1e293b",
                        borderRadius: "0.5rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                        <div>
                          <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                            Subtotal
                          </p>
                          <p style={{ fontSize: "1rem", fontWeight: 500 }}>${b.subtotal.toFixed(2)}</p>
                        </div>
                        <div>
                          <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                            Impuestos
                          </p>
                          <p style={{ fontSize: "1rem", fontWeight: 500 }}>${b.tax.toFixed(2)}</p>
                        </div>
                        <div>
                          <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                            Propina
                          </p>
                          <p style={{ fontSize: "1rem", fontWeight: 500 }}>${b.tip.toFixed(2)}</p>
                        </div>
                      </div>
                      <div>
                        <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                          Total
                        </p>
                        <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22c55e" }}>
                          ${b.total.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePrintTicket(b.id)}
                      disabled={printingTicketId === b.id}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #3b82f6",
                        background: printingTicketId === b.id ? "#1d4ed855" : "#1d4ed833",
                        color: "#bfdbfe",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        cursor: printingTicketId === b.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {printingTicketId === b.id ? "⏳ Imprimiendo..." : "🖨️ Imprimir Ticket"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
