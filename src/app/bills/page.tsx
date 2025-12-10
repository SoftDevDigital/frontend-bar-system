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

// mismo tipo que en otras páginas
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

  // 👉 filtros listado de facturas
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
        `Venta directa creada. Factura N° ${bill.billNumber}. Total: $${bill.totalAmount.toFixed(
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

      // refresco listado de facturas
      await handleFetch();
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
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            💳 Facturas (Bills)
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
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            💳 Facturas (Bills)
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
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          💳 Facturas (Bills)
        </h1>

        {/* =========================
            VENTA DIRECTA (SIN MESA)
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
            Venta directa (sin mesa)
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#9ca3af",
              marginBottom: "0.75rem",
            }}
          >
            Crea una factura directa para ventas rápidas / takeaway. No requiere
            orden ni mesa previa.
          </p>

          {dsError && (
            <p
              style={{
                color: "#f87171",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
              }}
            >
              {dsError}
            </p>
          )}
          {dsSuccess && (
            <p
              style={{
                color: "#4ade80",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
              }}
            >
              {dsSuccess}
            </p>
          )}

          <form
            onSubmit={handleCreateDirectSale}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {/* Items */}
            <div>
              <h3
                style={{
                  fontSize: "0.95rem",
                  marginBottom: "0.4rem",
                  fontWeight: 600,
                }}
              >
                Productos
              </h3>

              {loadingProducts && (
                <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                  Cargando productos del menú...
                </p>
              )}

              {dsItems.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr minmax(80px,0.8fr) auto",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  {/* Producto */}
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
                      handleChangeDirectSaleItem(
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
                    onClick={() => handleRemoveDirectSaleItemRow(index)}
                    disabled={dsItems.length === 1}
                    style={{
                      padding: "0.35rem 0.7rem",
                      borderRadius: "999px",
                      border: "1px solid #f97316",
                      background: "#7c2d1233",
                      color: "#fed7aa",
                      fontSize: "0.8rem",
                      cursor:
                        dsItems.length === 1 ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddDirectSaleItemRow}
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

            {/* Total estimado */}
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "0.9rem",
                color: "#e5e7eb",
              }}
            >
              <strong>Total estimado:</strong> $
              {directSaleTotal.toFixed(2)}
            </p>

            {/* Datos de pago y cliente */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.75rem",
                marginTop: "0.75rem",
              }}
            >
              {/* Método de pago */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.85rem",
                  }}
                >
                  Método de pago
                </label>
                <select
                  value={dsPaymentMethod}
                  onChange={(e) =>
                    setDsPaymentMethod(e.target.value as PaymentMethod)
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
                  value={dsPaidAmount}
                  onChange={(e) => setDsPaidAmount(e.target.value)}
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
                  value={dsDiscountAmount}
                  onChange={(e) =>
                    setDsDiscountAmount(e.target.value)
                  }
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

              {/* CustomerId opcional */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.85rem",
                  }}
                >
                  ID Cliente (opcional)
                </label>
                <input
                  type="text"
                  value={dsCustomerId}
                  onChange={(e) =>
                    setDsCustomerId(e.target.value)
                  }
                  placeholder="customer-uuid"
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
                  value={dsCashierId}
                  onChange={(e) =>
                    setDsCashierId(e.target.value)
                  }
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

              {/* Notas opcionales */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.85rem",
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

            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <button
                type="submit"
                disabled={dsLoading}
                style={{
                  padding: "0.7rem 1.1rem",
                  borderRadius: "0.6rem",
                  border: "none",
                  background: dsLoading ? "#22c55e55" : "#22c55e",
                  color: "#022c22",
                  fontWeight: 600,
                  cursor: dsLoading ? "default" : "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {dsLoading
                  ? "Creando venta directa..."
                  : "Crear venta directa"}
              </button>
            </div>
          </form>
        </section>

        {/* ========================
            CONTROLES LISTADO BILLS
        ========================= */}
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
          <div>
            <label htmlFor="date-input">Fecha</label>
            <input
              id="date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.4rem",
                background: "white",
                color: "black",
              }}
            />
          </div>

          <div>
            <label>Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: "100%", padding: "0.4rem" }}
            >
              <option value="">(Todos)</option>
              <option value="cash">cash</option>
              <option value="card">card</option>
            </select>
          </div>

          <div>
            <label>Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%", padding: "0.4rem" }}
            >
              <option value="">(Todos)</option>
              <option value="paid">paid</option>
              <option value="pending">pending</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div>
            <label>Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ width: "100%", padding: "0.4rem" }}
            />
          </div>

          <div>
            <label>Page</label>
            <input
              type="number"
              value={page}
              onChange={(e) => setPage(Number(e.target.value))}
              style={{ width: "100%", padding: "0.4rem" }}
            />
          </div>

          <button
            onClick={handleFetch}
            style={{
              padding: "0.8rem",
              background: "#22c55e",
              borderRadius: "0.6rem",
              fontWeight: "bold",
            }}
          >
            {loading ? "Buscando..." : "Buscar facturas"}
          </button>
        </div>

        {errorMsg && <p style={{ color: "#f87171" }}>{errorMsg}</p>}

        {/* LISTADO DE BILLS */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {bills.map((b) => (
            <div
              key={b.id}
              style={{
                background: "#1e293b",
                padding: "1rem",
                borderRadius: "0.75rem",
              }}
            >
              <h3>Factura #{b.id}</h3>
              <p>
                <strong>Pedido:</strong> {b.orderId}
              </p>
              <p>
                <strong>Mesa:</strong> #{b.tableNumber}
              </p>
              <p>
                <strong>Subtotal:</strong> ${b.subtotal}
              </p>
              <p>
                <strong>Impuesto (tax):</strong> ${b.tax}
              </p>
              <p>
                <strong>Propina (tip):</strong> ${b.tip}
              </p>
              <p>
                <strong>Total:</strong> ${b.total}
              </p>
              <p>
                <strong>Método de pago:</strong> {b.paymentMethod}
              </p>
              <p>
                <strong>Estado:</strong> {b.status}
              </p>
              <p>
                <strong>Creada:</strong>{" "}
                {new Date(b.createdAt).toLocaleString()}
              </p>

              <button
                type="button"
                onClick={() => handlePrintTicket(b.id)}
                disabled={printingTicketId === b.id}
                style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem 0.9rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                  background:
                    printingTicketId === b.id ? "#4b556355" : "#111827",
                  color: "#f9fafb",
                  fontSize: "0.85rem",
                  cursor:
                    printingTicketId === b.id ? "default" : "pointer",
                }}
              >
                {printingTicketId === b.id
                  ? "Imprimiendo..."
                  : "Imprimir ticket"}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
