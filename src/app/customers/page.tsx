"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerReservationsById,
  getCustomerByPhone,        // 👈 ya estaba
  manageCustomer,            // 👈 NUEVO
  type Customer,
  type Reservation,
} from "../lib/api";
import TopNav from "../components/TopNav";


const DEFAULT_LIMIT = 20;

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"" | "vip" | "top">("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Para mostrar cuántos resultados hay
  const [totalResults, setTotalResults] = useState<number | null>(null);

  // ---- estado para crear cliente ----
  const [creating, setCreating] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // ---- estado para ver perfil completo ----
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ✅ NUEVO: estado para historial de reservas del cliente
  const [customerReservations, setCustomerReservations] = useState<
    Reservation[]
  >([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(
    null
  );

  // ---- estado para EDITAR cliente (PATCH) ----
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editVip, setEditVip] = useState(false);

  const [editSms, setEditSms] = useState(false);
  const [editWhatsapp, setEditWhatsapp] = useState(false);
  const [editPhonePref, setEditPhonePref] = useState(false);
  const [editEmailPref, setEditEmailPref] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // ---- estado para ELIMINAR cliente ----
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await getCustomers({
        q: q.trim() || undefined,
        filter: filter || undefined,
        page,
        limit: DEFAULT_LIMIT,
      });

      // Estructura real de la respuesta:
      // res.data = {
      //   success: true,
      //   message: "Customers retrieved",
      //   data: {
      //     data: [ ...clientes... ],
      //     meta: { ... }
      //   }
      // }

      const envelope: any = res.data; // { success, message, data: { data, meta } }
      const paginated = envelope?.data; // { data: [..], meta: {...} }

      const list: Customer[] = Array.isArray(paginated?.data)
        ? (paginated.data as Customer[])
        : [];

      const meta = paginated?.meta;

      setCustomers(list);
      setTotalResults(
        typeof meta?.totalItems === "number" ? meta.totalItems : list.length
      );

      if (!res.success) {
        setErrorMsg(res.message || "No se pudieron cargar los clientes");
      }
    } catch (err: any) {
      setCustomers([]);
      setTotalResults(0);
      setErrorMsg(
        err?.message || "Error inesperado al cargar la lista de clientes"
      );
    } finally {
      setLoading(false);
    }
  };

  // Primera carga
  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambie page, recargar
  useEffect(() => {
    if (page <= 0) return;
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setPage(1); // siempre volvemos a la página 1 cuando se busca
    setErrorMsg(null);

    const term = q.trim();

    // Si no hay término, usamos la búsqueda normal (lista paginada)
    if (!term) {
      loadCustomers();
      return;
    }

    // Detectar si el término "parece" un teléfono:
    //  - empieza con + o dígito
    //  - contiene solo dígitos, espacios, -, (, ) y +
    //  - longitud mínima razonable (ej: 6)
    const isPhoneLike =
      /^[+\d][\d\s\-()+]{5,}$/.test(term);

    // 🔍 Si parece teléfono, usamos el endpoint rápido /customers/phone/{phone}
    if (isPhoneLike) {
      setLoading(true);

      try {
        const res = await getCustomerByPhone(term);

        if (res.success && res.data?.data) {
          const c = res.data.data;
          setCustomers([c]);
          setTotalResults(1);
        } else {
          setCustomers([]);
          setTotalResults(0);
          setErrorMsg(
            res.message || "No se encontró cliente con ese teléfono."
          );
        }
      } catch (err: any) {
        setCustomers([]);
        setTotalResults(0);
        setErrorMsg(
          err?.message || "Error inesperado al buscar por teléfono."
        );
      } finally {
        setLoading(false);
      }

      return; // ✅ no seguimos con la búsqueda normal
    }

    // Si NO parece teléfono → usamos el listado normal con /customers?q=...
    loadCustomers();
  };

  const handleClear = () => {
    setQ("");
    setFilter("");
    setPage(1);
    loadCustomers();
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const firstName = newFirstName.trim();
    const lastName = newLastName.trim();
    const email = newEmail.trim();
    const phone = newPhone.trim();

    if (!firstName || !lastName || !phone) {
      setCreateError("Nombre, apellido y teléfono son obligatorios.");
      return;
    }

    setCreating(true);

    try {
      const res = await createCustomer({
        firstName,
        lastName,
        email: email || undefined,
        phone,
      });

      if (res.success && res.data?.data) {
        const created = res.data.data;

        // Agregamos el nuevo cliente al inicio de la lista
        setCustomers((prev) => [created, ...prev]);
        setTotalResults((prev) => (prev ?? 0) + 1);

        setCreateSuccess("Cliente creado correctamente ✅");
        setNewFirstName("");
        setNewLastName("");
        setNewEmail("");
        setNewPhone("");
      } else {
        setCreateError(res.message || "No se pudo crear el cliente");
      }
    } catch (err: any) {
      setCreateError(
        err?.message || "Error inesperado al crear el cliente"
      );
    } finally {
      setCreating(false);
    }
  };

  // Ver perfil completo + historial de reservas
  const handleViewProfile = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedCustomer(null);
    setSaveError(null);
    setSaveSuccess(null);

    // ✅ limpiamos historial anterior
    setCustomerReservations([]);
    setReservationsError(null);
    setReservationsLoading(true);

    try {
      // Traemos en paralelo: datos del cliente + historial de reservas
      const [customerRes, reservationsRes] = await Promise.all([
        getCustomerById(id),
        getCustomerReservationsById(id),
      ]);

      // ---- Cliente ----
      if (customerRes.success && customerRes.data?.data) {
        const c = customerRes.data.data;
        setSelectedCustomer(c);

        // Inicializamos los campos de edición con los valores actuales
        setEditFirstName(c.firstName || "");
        setEditLastName(c.lastName || "");
        setEditEmail(c.email || "");
        setEditPhone(c.phone || "");
        setEditVip(c.vipStatus ?? false);

        setEditSms(c.communicationPreferences?.sms ?? false);
        setEditWhatsapp(c.communicationPreferences?.whatsapp ?? false);
        setEditPhonePref(c.communicationPreferences?.phone ?? false);
        setEditEmailPref(c.communicationPreferences?.email ?? false);
      } else {
        setDetailError(
          customerRes.message || "No se pudo obtener el perfil"
        );
      }

      // ---- Historial de reservas ----
      if (
        reservationsRes.success &&
        Array.isArray(reservationsRes.data)
      ) {
        setCustomerReservations(reservationsRes.data);
      } else {
        setReservationsError(
          reservationsRes.message ||
            "No se pudo obtener el historial de reservas"
        );
      }
    } catch (err: any) {
      const msg =
        err?.message || "Error inesperado al obtener el perfil del cliente";
      setDetailError(msg);
      setReservationsError(msg);
    } finally {
      setDetailLoading(false);
      setReservationsLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedCustomer(null);
    setDetailError(null);
    setSaveError(null);
    setSaveSuccess(null);
    setCustomerReservations([]); // ✅ limpiamos historial de reservas
    setReservationsError(null);
  };

  // Guardar cambios (PATCH /customers/{id})
  const handleSaveCustomer = async () => {
  if (!selectedCustomer) return;

  setSaving(true);
  setSaveError(null);
  setSaveSuccess(null);

  try {
    // Comparamos valores anteriores con los editados
    const prevVip = selectedCustomer.vipStatus;
    const prevPrefs = selectedCustomer.communicationPreferences;

    const vipChanged = editVip !== prevVip;
    const prefsChanged =
      editSms !== prevPrefs.sms ||
      editWhatsapp !== prevPrefs.whatsapp ||
      editPhonePref !== prevPrefs.phone ||
      editEmailPref !== prevPrefs.email;

    // 1) Actualizar datos básicos con PATCH /customers/{id}
    const payload = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      // vipStatus lo manejamos con /manage para usar el flujo nuevo
    };

    const res = await updateCustomer(selectedCustomer.customerId, payload);

    if (!res.success || !res.data?.data) {
      throw new Error(res.message || "No se pudo actualizar el cliente");
    }

    // Cliente actualizado con datos básicos
    let current = res.data.data as Customer;

    // 2) Si cambió VIP -> usamos /customers/{id}/manage?action=promote-vip/remove-vip
    if (vipChanged) {
      const action = editVip ? "promote-vip" : "remove-vip";

      const vipRes = await manageCustomer(
        selectedCustomer.customerId,
        action
      );

      if (!vipRes.success || !vipRes.data?.data) {
        throw new Error(
          vipRes.message || "No se pudo actualizar el estado VIP"
        );
      }

      current = vipRes.data.data as Customer;
    }

    // 3) Si cambiaron preferencias -> /customers/{id}/manage?action=update-preferences
    if (prefsChanged) {
      const prefsBody = {
        sms: editSms,
        whatsapp: editWhatsapp,
        phone: editPhonePref,
        email: editEmailPref,
      };

      const prefsRes = await manageCustomer(
        selectedCustomer.customerId,
        "update-preferences",
        prefsBody
      );

      if (!prefsRes.success || !prefsRes.data?.data) {
        throw new Error(
          prefsRes.message ||
            "No se pudieron actualizar las preferencias de comunicación"
        );
      }

      current = prefsRes.data.data as Customer;
    }

    // 4) Actualizamos estado en frontend con la versión final del cliente
    setSelectedCustomer(current);
    setCustomers((prev) =>
      prev.map((c) =>
        c.customerId === current.customerId ? current : c
      )
    );

    setSaveSuccess("Cliente actualizado correctamente ✅");
  } catch (err: any) {
    setSaveError(
      err?.message || "Error inesperado al actualizar el cliente"
    );
  } finally {
    setSaving(false);
  }
};


  // Eliminar cliente (DELETE /customers/{id})
  const handleDeleteCustomer = async (id: string) => {
    const confirmDelete = window.confirm(
      "¿Seguro que querés eliminar este cliente? Esta acción no se puede deshacer."
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    setErrorMsg(null);

    try {
      const res = await deleteCustomer(id);

      if (!res.success) {
        alert(res.message || "No se pudo eliminar el cliente");
        return;
      }

      // Sacamos al cliente de la lista
      setCustomers((prev) => prev.filter((c) => c.customerId !== id));
      setTotalResults((prev) =>
        prev === null ? prev : Math.max(0, prev - 1)
      );

      // Si estaba abierto en el modal, lo cerramos
      if (selectedCustomer && selectedCustomer.customerId === id) {
        closeDetail();
      }
    } catch (err: any) {
      alert(
        err?.message || "Error inesperado al eliminar el cliente"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        padding: "1.5rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "1100px" }}>
        <header
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.6rem",
                fontWeight: 600,
                marginBottom: "0.3rem",
              }}
            >
              Clientes
            </h1>
            <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
              Listado, búsqueda y creación de clientes.
            </p>
          </div>
        </header>

        {/* Filtros / búsqueda */}
        <section
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            borderRadius: "0.9rem",
            border: "1px solid #1f2937",
            background:
              "radial-gradient(circle at top left, #0b1120, #020617 55%)",
          }}
        >
             <TopNav />
          <form
            onSubmit={handleSearch}
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 2fr) minmax(0, 1fr) auto auto",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  color: "#9ca3af",
                }}
              >
                Búsqueda (nombre, email, teléfono)
              </label>
              <input
                type="text"
                placeholder="Ej: Juan"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  color: "#9ca3af",
                }}
              >
                Filtro especial
              </label>
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as "vip" | "top" | "")
                }
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                  fontSize: "0.9rem",
                }}
              >
                <option value="">Todos</option>
                <option value="vip">Solo VIP</option>
                <option value="top">Top por gasto</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "0.7rem",
                border: "none",
                background: loading ? "#6ee7b7" : "#22c55e",
                color: "#022c22",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: loading ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              style={{
                padding: "0.6rem 0.9rem",
                borderRadius: "0.7rem",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.85rem",
                cursor: loading ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Limpiar
            </button>
          </form>
        </section>

        {/* Crear nuevo cliente */}
        <section
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            borderRadius: "0.9rem",
            border: "1px solid #1f2937",
            background: "#020617",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 500,
              marginBottom: "0.75rem",
            }}
          >
            Crear nuevo cliente
          </h2>

          <form
            onSubmit={handleCreate}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr)) auto",
              gap: "0.75rem",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  color: "#9ca3af",
                }}
              >
                Nombre
              </label>
              <input
                type="text"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                placeholder="Juan"
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  color: "#9ca3af",
                }}
              >
                Apellido
              </label>
              <input
                type="text"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                placeholder="Pérez"
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  color: "#9ca3af",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="juan.perez@example.com"
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: "0.25rem",
                  color: "#9ca3af",
                }}
              >
                Teléfono
              </label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+34612345678"
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "0.7rem",
                border: "none",
                background: creating ? "#6ee7b7" : "#22c55e",
                color: "#022c22",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: creating ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {creating ? "Creando..." : "Crear cliente"}
            </button>
          </form>

          {createError && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.6rem 0.8rem",
                borderRadius: "0.7rem",
                background: "#450a0a",
                border: "1px solid #b91c1c",
                fontSize: "0.85rem",
              }}
            >
              {createError}
            </div>
          )}

          {createSuccess && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.6rem 0.8rem",
                borderRadius: "0.7rem",
                background: "#022c22",
                border: "1px solid #16a34a",
                fontSize: "0.85rem",
                color: "#bbf7d0",
              }}
            >
              {createSuccess}
            </div>
          )}
        </section>

        {/* Mensajes de estado del listado */}
        {errorMsg && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.7rem",
              background: "#450a0a",
              border: "1px solid #b91c1c",
              fontSize: "0.9rem",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Tabla de clientes */}
        <section
          style={{
            borderRadius: "0.9rem",
            border: "1px solid #1f2937",
            overflow: "hidden",
            background: "#020617",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #111827",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.85rem",
              color: "#9ca3af",
            }}
          >
            <span>
              Resultados{totalResults !== null ? `: ${totalResults}` : ""}
            </span>
            <span>Página {page}</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#020617",
                    borderBottom: "1px solid #111827",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "0.6rem 1rem" }}>Nombre</th>
                  <th style={{ padding: "0.6rem 1rem" }}>Email</th>
                  <th style={{ padding: "0.6rem 1rem" }}>Teléfono</th>
                  <th style={{ padding: "0.6rem 1rem" }}>VIP</th>
                  <th style={{ padding: "0.6rem 1rem" }}>Gasto total</th>
                  <th style={{ padding: "0.6rem 1rem" }}>Visitas</th>
                  <th style={{ padding: "0.6rem 1rem" }}>Creado</th>
                  <th style={{ padding: "0.6rem 1rem" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No se encontraron clientes.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr
                      key={c.customerId}
                      style={{
                        borderBottom: "1px solid #111827",
                        background: "transparent",
                      }}
                    >
                      <td style={{ padding: "0.6rem 1rem" }}>
                        {c.firstName} {c.lastName}
                      </td>
                      <td style={{ padding: "0.6rem 1rem" }}>{c.email}</td>
                      <td style={{ padding: "0.6rem 1rem" }}>{c.phone}</td>
                      <td style={{ padding: "0.6rem 1rem" }}>
                        {c.vipStatus ? "Sí" : "No"}
                      </td>
                      <td style={{ padding: "0.6rem 1rem" }}>
                        ${c.totalSpent.toFixed(2)}
                      </td>
                      <td style={{ padding: "0.6rem 1rem" }}>
                        {c.totalVisits}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem 1rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.6rem 1rem" }}>
                        <button
                          type="button"
                          onClick={() =>
                            handleViewProfile(c.customerId)
                          }
                          style={{
                            padding: "0.3rem 0.7rem",
                            borderRadius: "0.6rem",
                            border: "1px solid #4b5563",
                            background: "#020617",
                            color: "#e5e7eb",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            marginRight: "0.4rem",
                          }}
                        >
                          Ver perfil
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteCustomer(c.customerId)
                          }
                          disabled={deletingId === c.customerId}
                          style={{
                            padding: "0.3rem 0.7rem",
                            borderRadius: "0.6rem",
                            border: "1px solid #b91c1c",
                            background: "#020617",
                            color:
                              deletingId === c.customerId
                                ? "#fca5a5"
                                : "#fecaca",
                            fontSize: "0.8rem",
                            cursor:
                              deletingId === c.customerId
                                ? "default"
                                : ("pointer" as const),
                          }}
                        >
                          {deletingId === c.customerId
                            ? "Eliminando..."
                            : "Eliminar"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación simple */}
          <div
            style={{
              padding: "0.6rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              borderTop: "1px solid #111827",
            }}
          >
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "0.7rem",
                border: "1px solid #4b5563",
                background: "#020617",
                color:
                  page <= 1 || loading ? "#4b5563" : "#e5e7eb",
                fontSize: "0.85rem",
                cursor:
                  page <= 1 || loading ? "default" : ("pointer" as const),
              }}
            >
              Anterior
            </button>

            <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
              Página {page}
            </span>

            <button
              type="button"
              disabled={loading || customers.length < DEFAULT_LIMIT}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "0.7rem",
                border: "1px solid #4b5563",
                background: "#020617",
                color:
                  loading || customers.length < DEFAULT_LIMIT
                    ? "#4b5563"
                    : "#e5e7eb",
                fontSize: "0.85rem",
                cursor:
                  loading || customers.length < DEFAULT_LIMIT
                    ? "default"
                    : ("pointer" as const),
              }}
            >
              Siguiente
            </button>
          </div>
        </section>
      </div>

      {/* Modal de detalle de cliente */}
      {(selectedCustomer || detailLoading || detailError) && (
        <div
          onClick={closeDetail}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#020617",
              borderRadius: "0.9rem",
              border: "1px solid #1f2937",
              padding: "1rem 1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 500,
                }}
              >
                Perfil del cliente
              </h2>
              <button
                type="button"
                onClick={closeDetail}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#9ca3af",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {detailLoading && (
              <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
                Cargando perfil...
              </p>
            )}

            {detailError && (
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  borderRadius: "0.7rem",
                  background: "#450a0a",
                  border: "1px solid #b91c1c",
                  fontSize: "0.85rem",
                }}
              >
                {detailError}
              </div>
            )}

            {selectedCustomer && !detailLoading && !detailError && (
              <div style={{ fontSize: "0.9rem", color: "#e5e7eb" }}>
                {/* Datos actuales (solo lectura) */}
                <p style={{ marginBottom: "0.25rem" }}>
                  <strong>Nombre:</strong>{" "}
                  {selectedCustomer.firstName}{" "}
                  {selectedCustomer.lastName}
                </p>
                <p style={{ marginBottom: "0.25rem" }}>
                  <strong>Email:</strong> {selectedCustomer.email}
                </p>
                <p style={{ marginBottom: "0.25rem" }}>
                  <strong>Teléfono:</strong> {selectedCustomer.phone}
                </p>
                <p style={{ marginBottom: "0.25rem" }}>
                  <strong>VIP:</strong>{" "}
                  {selectedCustomer.vipStatus ? "Sí" : "No"}
                </p>
                <p style={{ marginBottom: "0.25rem" }}>
                  <strong>Gasto total:</strong>{" "}
                  ${selectedCustomer.totalSpent.toFixed(2)}
                </p>
                <p style={{ marginBottom: "0.25rem" }}>
                  <strong>Gasto promedio:</strong>{" "}
                  ${selectedCustomer.averageSpent.toFixed(2)}
                </p>
                <p style={{ marginBottom: "0.25rem" }}>
                  <strong>Visitas:</strong>{" "}
                  {selectedCustomer.totalVisits}
                </p>

                <p style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                  <strong>ID cliente:</strong>{" "}
                  {selectedCustomer.customerId}
                </p>
                <p style={{ fontSize: "0.8rem" }}>
                  <strong>Creado:</strong>{" "}
                  {new Date(
                    selectedCustomer.createdAt
                  ).toLocaleString()}
                </p>
                <p style={{ fontSize: "0.8rem" }}>
                  <strong>Actualizado:</strong>{" "}
                  {new Date(
                    selectedCustomer.updatedAt
                  ).toLocaleString()}
                </p>

                {/* Preferencias actuales */}
                <div style={{ marginTop: "0.75rem" }}>
                  <p
                    style={{ fontSize: "0.8rem", color: "#9ca3af" }}
                  >
                    Preferencias de comunicación (actuales):
                  </p>
                  <ul
                    style={{
                      marginTop: "0.25rem",
                      paddingLeft: "1.1rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <li>
                      SMS:{" "}
                      {selectedCustomer.communicationPreferences.sms
                        ? "Sí"
                        : "No"}
                    </li>
                    <li>
                      WhatsApp:{" "}
                      {selectedCustomer.communicationPreferences
                        .whatsapp
                        ? "Sí"
                        : "No"}
                    </li>
                    <li>
                      Teléfono:{" "}
                      {selectedCustomer.communicationPreferences.phone
                        ? "Sí"
                        : "No"}
                    </li>
                    <li>
                      Email:{" "}
                      {selectedCustomer.communicationPreferences.email
                        ? "Sí"
                        : "No"}
                    </li>
                  </ul>
                </div>

                {/* ✅ NUEVO BLOQUE: historial de reservas */}
                <div
                  style={{
                    marginTop: "0.9rem",
                    paddingTop: "0.7rem",
                    borderTop: "1px solid #111827",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      marginBottom: "0.4rem",
                    }}
                  >
                    Historial de reservas
                  </h3>

                  {reservationsLoading && (
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#9ca3af",
                      }}
                    >
                      Cargando reservas...
                    </p>
                  )}

                  {reservationsError && (
                    <div
                      style={{
                        marginTop: "0.3rem",
                        padding: "0.5rem 0.7rem",
                        borderRadius: "0.6rem",
                        background: "#450a0a",
                        border: "1px solid #b91c1c",
                        fontSize: "0.8rem",
                      }}
                    >
                      {reservationsError}
                    </div>
                  )}

                  {!reservationsLoading &&
                    !reservationsError &&
                    customerReservations.length === 0 && (
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                        }}
                      >
                        Este cliente no tiene reservas registradas.
                      </p>
                    )}

                  {customerReservations.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.4rem",
                        borderRadius: "0.6rem",
                        border: "1px solid #1f2937",
                        overflow: "hidden",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.8rem",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "#020617",
                              borderBottom: "1px solid #111827",
                              textAlign: "left",
                            }}
                          >
                            <th
                              style={{
                                padding: "0.4rem 0.6rem",
                              }}
                            >
                              Fecha / hora
                            </th>
                            <th
                              style={{
                                padding: "0.4rem 0.6rem",
                              }}
                            >
                              Estado
                            </th>
                            <th
                              style={{
                                padding: "0.4rem 0.6rem",
                              }}
                            >
                              Mesa
                            </th>
                            <th
                              style={{
                                padding: "0.4rem 0.6rem",
                              }}
                            >
                              Personas
                            </th>
                            <th
                              style={{
                                padding: "0.4rem 0.6rem",
                              }}
                            >
                              Notas
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerReservations.map((r) => {
                            const dt = new Date(r.date);
                            const fecha = dt.toLocaleDateString();
                            const hora = dt.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                            return (
                              <tr
                                key={r.id}
                                style={{
                                  borderBottom:
                                    "1px solid #111827",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "0.4rem 0.6rem",
                                  }}
                                >
                                  {fecha} {hora}
                                </td>
                                <td
                                  style={{
                                    padding: "0.4rem 0.6rem",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {r.status}
                                </td>
                                <td
                                  style={{
                                    padding: "0.4rem 0.6rem",
                                  }}
                                >
                                  {r.tableNumber ?? "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "0.4rem 0.6rem",
                                  }}
                                >
                                  {r.guests}
                                </td>
                                <td
                                  style={{
                                    padding: "0.4rem 0.6rem",
                                  }}
                                >
                                  {r.notes || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Formulario de edición */}
                <hr
                  style={{
                    borderColor: "#111827",
                    margin: "0.75rem 0",
                  }}
                />

                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    marginBottom: "0.5rem",
                  }}
                >
                  Editar datos básicos
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        marginBottom: "0.15rem",
                        color: "#9ca3af",
                      }}
                    >
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) =>
                        setEditFirstName(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #374151",
                        background: "#020617",
                        color: "#e5e7eb",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        marginBottom: "0.15rem",
                        color: "#9ca3af",
                      }}
                    >
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) =>
                        setEditLastName(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #374151",
                        background: "#020617",
                        color: "#e5e7eb",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        marginBottom: "0.15rem",
                        color: "#9ca3af",
                      }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) =>
                        setEditEmail(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #374151",
                        background: "#020617",
                        color: "#e5e7eb",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        marginBottom: "0.15rem",
                        color: "#9ca3af",
                      }}
                    >
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) =>
                        setEditPhone(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #374151",
                        background: "#020617",
                        color: "#e5e7eb",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <input
                    id="vip-edit"
                    type="checkbox"
                    checked={editVip}
                    onChange={(e) => setEditVip(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <label
                    htmlFor="vip-edit"
                    style={{
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Marcar como cliente VIP
                  </label>
                </div>

                <div style={{ marginBottom: "0.75rem" }}>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                      marginBottom: "0.3rem",
                    }}
                  >
                    Preferencias de comunicación (editar):
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.4rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <label
                      style={{ display: "flex", gap: "0.35rem" }}
                    >
                      <input
                        type="checkbox"
                        checked={editSms}
                        onChange={(e) =>
                          setEditSms(e.target.checked)
                        }
                      />
                      SMS
                    </label>
                    <label
                      style={{ display: "flex", gap: "0.35rem" }}
                    >
                      <input
                        type="checkbox"
                        checked={editWhatsapp}
                        onChange={(e) =>
                          setEditWhatsapp(e.target.checked)
                        }
                      />
                      WhatsApp
                    </label>
                    <label
                      style={{ display: "flex", gap: "0.35rem" }}
                    >
                      <input
                        type="checkbox"
                        checked={editPhonePref}
                        onChange={(e) =>
                          setEditPhonePref(e.target.checked)
                        }
                      />
                      Teléfono
                    </label>
                    <label
                      style={{ display: "flex", gap: "0.35rem" }}
                    >
                      <input
                        type="checkbox"
                        checked={editEmailPref}
                        onChange={(e) =>
                          setEditEmailPref(e.target.checked)
                        }
                      />
                      Email
                    </label>
                  </div>
                </div>

                {saveError && (
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      padding: "0.5rem 0.7rem",
                      borderRadius: "0.6rem",
                      background: "#450a0a",
                      border: "1px solid #b91c1c",
                      fontSize: "0.85rem",
                    }}
                  >
                    {saveError}
                  </div>
                )}

                {saveSuccess && (
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      padding: "0.5rem 0.7rem",
                      borderRadius: "0.6rem",
                      background: "#022c22",
                      border: "1px solid #16a34a",
                      fontSize: "0.85rem",
                      color: "#bbf7d0",
                    }}
                  >
                    {saveSuccess}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "0.5rem",
                    marginTop: "0.25rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      selectedCustomer &&
                      handleDeleteCustomer(
                        selectedCustomer.customerId
                      )
                    }
                    disabled={
                      !selectedCustomer ||
                      (selectedCustomer &&
                        deletingId ===
                          selectedCustomer.customerId)
                    }
                    style={{
                      padding: "0.5rem 0.9rem",
                      borderRadius: "0.7rem",
                      border: "1px solid #b91c1c",
                      background: "#020617",
                      color:
                        selectedCustomer &&
                        deletingId ===
                          selectedCustomer.customerId
                          ? "#fca5a5"
                          : "#fecaca",
                      fontSize: "0.8rem",
                      cursor:
                        !selectedCustomer ||
                        (selectedCustomer &&
                          deletingId ===
                            selectedCustomer.customerId)
                          ? "default"
                          : "pointer",
                    }}
                  >
                    {selectedCustomer &&
                    deletingId === selectedCustomer.customerId
                      ? "Eliminando..."
                      : "Eliminar cliente"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCustomer}
                    disabled={saving}
                    style={{
                      padding: "0.5rem 0.9rem",
                      borderRadius: "0.7rem",
                      border: "none",
                      background: saving ? "#6ee7b7" : "#22c55e",
                      color: "#022c22",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: saving ? "default" : "pointer",
                    }}
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
