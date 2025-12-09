"use client";

import { useEffect, useState, useRef } from "react";
import {
  getReservations,
  getReservationById,
  updateReservationStatus, // 👈 USAMOS ESTE
  deleteReservation,
  getReservationByCode,
  type Reservation,
  type ReservationsMeta,
  createReservation,
  type CreateReservationPayload,
  type ReservationStatus,
  type ReservationStatusAction,
} from "@/app/lib/api";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "seated", label: "Sentado" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "no-show", label: "No-show" },
];

// opciones sin "Todos" para selects editables
const STATUS_OPTIONS_NO_ALL = STATUS_OPTIONS.filter((opt) => opt.value);

// 👇 NUEVO: tipo para el rol del usuario
type UserRole = "admin" | "employee" | "customer" | string | null;

// tipo para la vista de detalle
type ReservationDetailView = {
  id: string;
  status: ReservationStatus;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  confirmationCode: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  specialRequests: string[];
  dietaryRestrictions: string[];
  allergies: string[];
  internalNotes: string[];
  tags: string[];
  actualSpend: number;
  createdAt: string;
  updatedAt: string;
  tableId?: string;
  tableNumber?: number;
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [meta, setMeta] = useState<ReservationsMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 👇 NUEVO: rol + flag de que ya chequeamos auth
  const [role, setRole] = useState<UserRole>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // filtros
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>(""); // YYYY-MM-DD

  // paginación
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);

  // crear reserva
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState<string>("");
  const [createForm, setCreateForm] = useState<CreateReservationPayload>({
    partySize: 2,
    reservationDate: "",
    reservationTime: "",
    notes: "",
  });

  const createDateRef = useRef<HTMLInputElement | null>(null);
  const filterDateRef = useRef<HTMLInputElement | null>(null);

  // estado para detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>("");
  const [detailData, setDetailData] = useState<ReservationDetailView | null>(
    null
  );

  // edición y PATCH
  const [editStatus, setEditStatus] = useState<ReservationStatus | "">("");
  const [editActualSpend, setEditActualSpend] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");

  // delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // búsqueda por código
  const [searchCode, setSearchCode] = useState("");
  const [searchCodeLoading, setSearchCodeLoading] = useState(false);

  // 👇 NUEVO: leer el usuario de localStorage y detectar rol
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("festgo_user");
    if (!raw) {
      setRole(null);
      setAuthChecked(true);
      return;
    }

    try {
      const user = JSON.parse(raw) as { role?: string };
      setRole(user.role ?? null);
    } catch {
      setRole(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const isStaff = role === "admin" || role === "employee";

  const openNativePicker = (
    e: React.MouseEvent<HTMLInputElement, MouseEvent>
  ) => {
    try {
      const input = e.currentTarget as HTMLInputElement & {
        showPicker?: () => void;
      };
      input.showPicker?.();
    } catch {
      // ignore
    }
  };

  const fetchReservations = async (pageToLoad?: number) => {
    setLoading(true);
    setErrorMsg("");

    const targetPage = pageToLoad ?? page;

    try {
      const params: {
        status?: string;
        date?: string;
        page?: number;
        limit?: number;
      } = {};

      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (targetPage && targetPage > 1) {
        params.page = targetPage;
      }

      const res = await getReservations(params);

      if (res.success && res.data) {
        const listData = res.data.data;

        const apiItems = (listData.data || []) as any[];

        const mapped: Reservation[] = apiItems.map((item) => {
          const combinedDateTime =
            item.reservationDate && item.reservationTime
              ? `${item.reservationDate}T${item.reservationTime}:00`
              : item.createdAt;

          const customerDetails = item.customerDetails || {};

          return {
            id: item.reservationId,
            customerId: customerDetails.email || "",
            customerName:
              customerDetails.firstName || customerDetails.lastName
                ? `${customerDetails.firstName ?? ""} ${
                    customerDetails.lastName ?? ""
                  }`.trim()
                : undefined,
            customerPhone: customerDetails.phone,
            tableId: item.tableId,
            tableNumber: item.tableNumber,
            status: item.status as ReservationStatus,
            date: combinedDateTime,
            guests: item.partySize,
            notes:
              Array.isArray(item.specialRequests) &&
              item.specialRequests.length > 0
                ? item.specialRequests.join(", ")
                : undefined,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
        });

        setReservations(mapped);
        setMeta(listData.meta);
        setPage(listData.meta.page);
      } else {
        setReservations([]);
        setMeta(null);
        setErrorMsg(res.message || "No se pudieron obtener las reservas");
      }
    } catch (err: any) {
      setReservations([]);
      setMeta(null);
      setErrorMsg(err.message || "Error inesperado al obtener reservas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReservations(1);
  };

  // buscar reserva por código
  const handleSearchByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = searchCode.trim();
    if (!code) return;

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetailData(null);
    setUpdateError("");
    setUpdateSuccess("");
    setUpdating(false);
    setSearchCodeLoading(true);

    try {
      const res = await getReservationByCode(code);

      if (res.success && res.data) {
        const raw = res.data.data as any;
        const customerDetails = raw.customerDetails || {};

        const view: ReservationDetailView = {
          id: raw.reservationId,
          status: raw.status as ReservationStatus,
          reservationDate: raw.reservationDate,
          reservationTime: raw.reservationTime,
          partySize: raw.partySize,
          confirmationCode: raw.confirmationCode,
          customerName:
            customerDetails.firstName || customerDetails.lastName
              ? `${customerDetails.firstName ?? ""} ${
                  customerDetails.lastName ?? ""
                }`.trim()
              : undefined,
          customerEmail: customerDetails.email,
          customerPhone: customerDetails.phone,
          specialRequests: Array.isArray(raw.specialRequests)
            ? raw.specialRequests
            : [],
          dietaryRestrictions: Array.isArray(raw.dietaryRestrictions)
            ? raw.dietaryRestrictions
            : [],
          allergies: Array.isArray(raw.allergies) ? raw.allergies : [],
          internalNotes: Array.isArray(raw.internalNotes)
            ? raw.internalNotes
            : [],
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          actualSpend: typeof raw.actualSpend === "number" ? raw.actualSpend : 0,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          tableId: raw.tableId,
          tableNumber: raw.tableNumber,
        };

        setDetailData(view);
        setEditStatus(view.status);
        setEditActualSpend(
          view.actualSpend && view.actualSpend > 0
            ? String(view.actualSpend)
            : ""
        );
        setCancelReason("");
      } else {
        setDetailError(
          res.message || "No se encontró ninguna reserva con ese código."
        );
      }
    } catch (err: any) {
      setDetailError(
        err?.message || "Error inesperado al buscar por código de confirmación."
      );
    } finally {
      setDetailLoading(false);
      setSearchCodeLoading(false);
    }
  };

  const handlePrevPage = () => {
    if (!meta || !meta.hasPreviousPage) return;
    fetchReservations(meta.page - 1);
  };

  const handleNextPage = () => {
    if (!meta || !meta.hasNextPage) return;
    fetchReservations(meta.page + 1);
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      const payload: CreateReservationPayload = {
        partySize: Number(createForm.partySize),
        reservationDate: createForm.reservationDate,
        reservationTime: createForm.reservationTime,
        notes: createForm.notes?.trim() || undefined,
      };

      const res = await createReservation(payload);

      if (res.success && res.data) {
        const created = res.data.data;
        setCreateSuccess(
          `Reserva creada. Código de confirmación: ${created.confirmationCode}`
        );

        if (!dateFilter) {
          setDateFilter(created.reservationDate);
        }

        fetchReservations(1);

        setCreateForm((prev) => ({
          partySize: 2,
          reservationDate: prev.reservationDate,
          reservationTime: "",
          notes: "",
        }));
      } else {
        setCreateError(
          res.message || "No se pudo crear la reserva. Revisá los datos."
        );
      }
    } catch (err: any) {
      setCreateError(err.message || "Error inesperado al crear la reserva");
    } finally {
      setCreating(false);
    }
  };

  // abrir modal y traer detalle
  const handleViewDetails = async (reservationId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetailData(null);
    setUpdateError("");
    setUpdateSuccess("");
    setUpdating(false);

    try {
      const res = await getReservationById(reservationId);

      if (res.success && res.data) {
        const raw = res.data.data as any;
        const customerDetails = raw.customerDetails || {};

        const view: ReservationDetailView = {
          id: raw.reservationId,
          status: raw.status as ReservationStatus,
          reservationDate: raw.reservationDate,
          reservationTime: raw.reservationTime,
          partySize: raw.partySize,
          confirmationCode: raw.confirmationCode,
          customerName:
            customerDetails.firstName || customerDetails.lastName
              ? `${customerDetails.firstName ?? ""} ${
                  customerDetails.lastName ?? ""
                }`.trim()
              : undefined,
          customerEmail: customerDetails.email,
          customerPhone: customerDetails.phone,
          specialRequests: Array.isArray(raw.specialRequests)
            ? raw.specialRequests
            : [],
          dietaryRestrictions: Array.isArray(raw.dietaryRestrictions)
            ? raw.dietaryRestrictions
            : [],
          allergies: Array.isArray(raw.allergies) ? raw.allergies : [],
          internalNotes: Array.isArray(raw.internalNotes)
            ? raw.internalNotes
            : [],
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          actualSpend: typeof raw.actualSpend === "number" ? raw.actualSpend : 0,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          tableId: raw.tableId,
          tableNumber: raw.tableNumber,
        };

        setDetailData(view);
        setEditStatus(view.status);
        setEditActualSpend(
          view.actualSpend && view.actualSpend > 0
            ? String(view.actualSpend)
            : ""
        );
        setCancelReason("");
      } else {
        setDetailError(
          res.message || "No se pudo obtener el detalle de la reserva."
        );
      }
    } catch (err: any) {
      setDetailError(
        err?.message || "Error inesperado al obtener el detalle."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // mapea status -> action del endpoint
  const mapStatusToAction = (
    status: ReservationStatus
  ): ReservationStatusAction | null => {
    switch (status) {
      case "confirmed":
        return "confirm";
      case "seated":
        return "seat";
      case "completed":
        return "complete";
      case "cancelled":
        return "cancel";
      case "no-show":
        return "no-show";
      default:
        return null;
    }
  };

  // PATCH /reservations/{id}/status?action=...
  const handleUpdateReservation = async () => {
    if (!detailData) return;

    if (!editStatus) {
      setUpdateError("Seleccioná un nuevo estado para la reserva.");
      return;
    }

    const action = mapStatusToAction(editStatus as ReservationStatus);
    if (!action) {
      setUpdateError("Ese estado no se puede actualizar desde acá.");
      return;
    }

    setUpdating(true);
    setUpdateError("");
    setUpdateSuccess("");

    try {
      const params: any = { action };

      if (action === "seat") {
        if (!detailData.tableId) {
          setUpdateError(
            "Para marcar como 'Sentado' la reserva debe tener una mesa asignada."
          );
          setUpdating(false);
          return;
        }
        params.tableId = detailData.tableId;
      }

      if (action === "complete") {
        if (editActualSpend.trim()) {
          const n = Number(editActualSpend.trim());
          if (Number.isNaN(n)) {
            setUpdateError("El gasto real debe ser un número válido.");
            setUpdating(false);
            return;
          }
          params.actualSpend = n;
        }
      }

      if (action === "cancel" && cancelReason.trim()) {
        params.reason = cancelReason.trim();
      }

      const res = await updateReservationStatus(detailData.id, params);

      if (res.success && res.data) {
        const raw = res.data.data as any;
        const customerDetails = raw.customerDetails || {};

        const view: ReservationDetailView = {
          id: raw.reservationId,
          status: raw.status as ReservationStatus,
          reservationDate: raw.reservationDate,
          reservationTime: raw.reservationTime,
          partySize: raw.partySize,
          confirmationCode: raw.confirmationCode,
          customerName:
            customerDetails.firstName || customerDetails.lastName
              ? `${customerDetails.firstName ?? ""} ${
                  customerDetails.lastName ?? ""
                }`.trim()
              : undefined,
          customerEmail: customerDetails.email,
          customerPhone: customerDetails.phone,
          specialRequests: Array.isArray(raw.specialRequests)
            ? raw.specialRequests
            : [],
          dietaryRestrictions: Array.isArray(raw.dietaryRestrictions)
            ? raw.dietaryRestrictions
            : [],
          allergies: Array.isArray(raw.allergies) ? raw.allergies : [],
          internalNotes: Array.isArray(raw.internalNotes)
            ? raw.internalNotes
            : [],
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          actualSpend:
            typeof raw.actualSpend === "number" ? raw.actualSpend : 0,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          tableId: raw.tableId,
          tableNumber: raw.tableNumber,
        };

        setDetailData(view);
        setEditStatus(view.status);
        setEditActualSpend(
          view.actualSpend && view.actualSpend > 0
            ? String(view.actualSpend)
            : ""
        );
        setCancelReason("");
        setUpdateSuccess("Reserva actualizada correctamente.");
        fetchReservations(page);
      } else {
        setUpdateError(
          res.message || "No se pudo actualizar la reserva. Intentalo nuevamente."
        );
      }
    } catch (err: any) {
      setUpdateError(
        err?.message || "Error inesperado al actualizar la reserva."
      );
    } finally {
      setUpdating(false);
    }
  };

  // DELETE /reservations/{id}
  const handleDeleteReservation = async (reservationId: string) => {
    if (typeof window !== "undefined") {
      const confirmDelete = window.confirm(
        "¿Seguro que querés eliminar esta reserva? Esta acción no se puede deshacer."
      );
      if (!confirmDelete) return;
    }

    setDeletingId(reservationId);
    setDeleteError("");

    try {
      const res = await deleteReservation(reservationId);

      if (res.success) {
        setReservations((prev) =>
          prev.filter((r) => r.id !== reservationId)
        );

        setMeta((prev) =>
          prev
            ? {
                ...prev,
                totalItems:
                  prev.totalItems > 0 ? prev.totalItems - 1 : prev.totalItems,
              }
            : prev
        );

        if (detailData && detailData.id === reservationId) {
          setDetailOpen(false);
          setDetailData(null);
          setEditStatus("");
          setUpdateError("");
          setUpdateSuccess("");
        }
      } else {
        setDeleteError(
          res.message || "No se pudo eliminar la reserva. Intentalo nuevamente."
        );
      }
    } catch (err: any) {
      setDeleteError(
        err?.message || "Error inesperado al eliminar la reserva."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailData(null);
    setDetailError("");
    setUpdateError("");
    setUpdateSuccess("");
    setEditStatus("");
    setEditActualSpend("");
    setCancelReason("");
  };

  // 👇 NUEVO: guard de acceso según rol

  if (!authChecked) {
    return (
      <main
        style={{
          padding: "2rem",
          color: "white",
          background: "#0f172a",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>📅 Reservas</h1>
        <p style={{ color: "#9ca3af" }}>Verificando permisos…</p>
      </main>
    );
  }

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
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>📅 Reservas</h1>
        <p style={{ color: "#f97316" }}>
          Esta sección de reservas es solo para el staff del bar
          (admin / employee).
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
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>📅 Reservas</h1>

      {errorMsg && (
        <p style={{ color: "#f87171", marginBottom: "0.5rem" }}>{errorMsg}</p>
      )}

      {deleteError && (
        <p style={{ color: "#f97316", marginBottom: "1rem" }}>
          {deleteError}
        </p>
      )}

      {/* CREAR RESERVA */}
      <section
        style={{
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #1f2937",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
          Crear nueva reserva
        </h2>

        {createError && (
          <p style={{ color: "#f87171", marginBottom: "0.5rem" }}>
            {createError}
          </p>
        )}
        {createSuccess && (
          <p style={{ color: "#4ade80", marginBottom: "0.5rem" }}>
            {createSuccess}
          </p>
        )}

        <form
          onSubmit={handleCreateReservation}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          {/* Fecha */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              Fecha
            </label>
            <input
              type="date"
              ref={createDateRef}
              value={createForm.reservationDate}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  reservationDate: e.target.value,
                }))
              }
              onClick={openNativePicker}
              required
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#020617",
                color: "white",
              }}
            />
          </div>

          {/* Hora */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              Hora
            </label>
            <input
              type="time"
              value={createForm.reservationTime}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  reservationTime: e.target.value,
                }))
              }
              required
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#020617",
                color: "white",
              }}
            />
          </div>

          {/* Personas */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              Personas
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={createForm.partySize}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  partySize: Number(e.target.value),
                }))
              }
              required
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#020617",
                color: "white",
              }}
            />
          </div>

          {/* Notas */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              Notas
            </label>
            <input
              type="text"
              value={createForm.notes}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              placeholder="Mesa cerca de la ventana…"
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#020617",
                color: "white",
              }}
            />
          </div>

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
              marginTop: "0.4rem",
            }}
          >
            {creating ? "Creando..." : "Crear reserva"}
          </button>
        </form>
      </section>

      {/* FILTROS */}
      <section
        style={{
          background: "#1e293b",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #334155",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
          Filtros de búsqueda
        </h2>

        <form
          onSubmit={handleApplyFilters}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          {/* Estado */}
          <div
            style={{ display: "flex", flexDirection: "column", minWidth: 180 }}
          >
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#020617",
                color: "white",
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div
            style={{ display: "flex", flexDirection: "column", minWidth: 180 }}
          >
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              Fecha (YYYY-MM-DD)
            </label>
            <input
              type="date"
              ref={filterDateRef}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              onClick={openNativePicker}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#020617",
                color: "white",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.6rem 1.2rem",
              background: "#3b82f6",
              borderRadius: "0.6rem",
              border: "none",
              fontWeight: "bold",
              cursor: loading ? "default" : "pointer",
              marginTop: "0.4rem",
            }}
          >
            {loading ? "Buscando..." : "Aplicar filtros"}
          </button>
        </form>
      </section>

      {/* búsqueda por código */}
      <section
        style={{
          background: "#020617",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          border: "1px solid #334155",
        }}
      >
        <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>
          Buscar por código de confirmación
        </h2>

        <form
          onSubmit={handleSearchByCode}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", minWidth: 200 }}
          >
            <label style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>
              Código (ej: GRV2K4)
            </label>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              placeholder="BTCSSO"
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#020617",
                color: "white",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={searchCodeLoading || !searchCode.trim()}
            style={{
              padding: "0.6rem 1.2rem",
              background: "#22c55e",
              borderRadius: "0.6rem",
              border: "none",
              fontWeight: "bold",
              cursor:
                searchCodeLoading || !searchCode.trim()
                  ? "default"
                  : "pointer",
              marginTop: "0.4rem",
            }}
          >
            {searchCodeLoading ? "Buscando..." : "Buscar código"}
          </button>
        </form>
      </section>

      {/* INFO PAGINACIÓN */}
      {meta && (
        <div
          style={{
            marginBottom: "0.75rem",
            fontSize: "0.85rem",
            color: "#9ca3af",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <span>
            Página {meta.page} de {meta.totalPages || 1} ·{" "}
            {meta.totalItems} reservas encontradas
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={!meta.hasPreviousPage || loading}
              style={{
                padding: "0.35rem 0.8rem",
                borderRadius: "999px",
                border: "1px solid #4b5563",
                background: meta.hasPreviousPage ? "#020617" : "#02061755",
                color: "#e5e7eb",
                cursor:
                  !meta.hasPreviousPage || loading ? "default" : "pointer",
                fontSize: "0.8rem",
              }}
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!meta.hasNextPage || loading}
              style={{
                padding: "0.35rem 0.8rem",
                borderRadius: "999px",
                border: "1px solid #4b5563",
                background: meta.hasNextPage ? "#020617" : "#02061755",
                color: "#e5e7eb",
                cursor:
                  !meta.hasNextPage || loading ? "default" : "pointer",
                fontSize: "0.8rem",
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* LISTADO */}
      {reservations.length === 0 && !loading && (
        <p style={{ color: "#9ca3af" }}>
          No hay reservas para los filtros seleccionados.
        </p>
      )}

      {reservations.length > 0 && (
        <div
          style={{
            overflowX: "auto",
            borderRadius: "0.75rem",
            border: "1px solid #1f2937",
            background: "#020617",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ background: "#111827" }}>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>Fecha</th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>Cliente</th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>
                  Teléfono
                </th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>Mesa</th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>
                  Personas
                </th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>Estado</th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>Notas</th>
                <th style={{ padding: "0.6rem", textAlign: "left" }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #1f2937" }}>
                  <td style={{ padding: "0.6rem" }}>
                    {new Date(r.date).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td style={{ padding: "0.6rem" }}>
                    {r.customerName || r.customerId}
                  </td>
                  <td style={{ padding: "0.6rem" }}>
                    {r.customerPhone || "—"}
                  </td>
                  <td style={{ padding: "0.6rem" }}>
                    {r.tableNumber ?? "—"}
                  </td>
                  <td style={{ padding: "0.6rem" }}>{r.guests}</td>
                  <td style={{ padding: "0.6rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        backgroundColor:
                          r.status === "confirmed"
                            ? "#16a34a33"
                            : r.status === "cancelled"
                            ? "#f8717133"
                            : r.status === "completed"
                            ? "#22c55e33"
                            : r.status === "seated"
                            ? "#eab30833"
                            : r.status === "no-show"
                            ? "#f9731633"
                            : "#3b82f633",
                        color:
                          r.status === "confirmed"
                            ? "#4ade80"
                            : r.status === "cancelled"
                            ? "#fca5a5"
                            : r.status === "completed"
                            ? "#bbf7d0"
                            : r.status === "seated"
                            ? "#fde68a"
                            : r.status === "no-show"
                            ? "#fed7aa"
                            : "#93c5fd",
                        textTransform: "capitalize",
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem" }}>{r.notes || "—"}</td>
                  <td
                    style={{
                      padding: "0.6rem",
                      display: "flex",
                      gap: "0.35rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleViewDetails(r.id)}
                      style={{
                        padding: "0.3rem 0.7rem",
                        borderRadius: "999px",
                        border: "1px solid #3b82f6",
                        background: "#1d4ed833",
                        color: "#bfdbfe",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Ver detalle
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteReservation(r.id)}
                      disabled={deletingId === r.id}
                      style={{
                        padding: "0.3rem 0.7rem",
                        borderRadius: "999px",
                        border: "1px solid #f97316",
                        background: "#7c2d1233",
                        color: "#fed7aa",
                        fontSize: "0.75rem",
                        cursor:
                          deletingId === r.id ? "default" : "pointer",
                      }}
                    >
                      {deletingId === r.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <p style={{ marginTop: "1rem", color: "#9ca3af" }}>
          Cargando reservas…
        </p>
      )}

      {/* MODAL DE DETALLE */}
      {detailOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#020617",
              borderRadius: "0.75rem",
              border: "1px solid #1f2937",
              padding: "1.2rem 1.4rem",
              maxWidth: "480px",
              width: "100%",
              color: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.8rem",
              }}
            >
              <h3 style={{ fontSize: "1.1rem" }}>Detalle de reserva</h3>
              <button
                type="button"
                onClick={handleCloseDetail}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#9ca3af",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {detailLoading && (
              <p style={{ color: "#9ca3af" }}>Cargando detalle…</p>
            )}

            {detailError && !detailLoading && (
              <p style={{ color: "#f87171" }}>{detailError}</p>
            )}

            {detailData && !detailLoading && !detailError && (
              <>
                <div
                  style={{
                    display: "grid",
                    gap: "0.35rem",
                    fontSize: "0.9rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <strong>Cliente:</strong>{" "}
                    {detailData.customerName ||
                      detailData.customerEmail ||
                      "—"}
                  </div>
                  <div>
                    <strong>Email:</strong> {detailData.customerEmail || "—"}
                  </div>
                  <div>
                    <strong>Teléfono:</strong>{" "}
                    {detailData.customerPhone || "—"}
                  </div>
                  <div>
                    <strong>Fecha:</strong> {detailData.reservationDate}{" "}
                    {detailData.reservationTime}
                  </div>
                  <div>
                    <strong>Personas:</strong> {detailData.partySize}
                  </div>
                  <div>
                    <strong>Mesa:</strong>{" "}
                    {detailData.tableNumber
                      ? `Mesa ${detailData.tableNumber}`
                      : "—"}
                  </div>
                  <div>
                    <strong>Estado actual:</strong> {detailData.status}
                  </div>
                  <div>
                    <strong>Código confirmación:</strong>{" "}
                    {detailData.confirmationCode}
                  </div>
                  <div>
                    <strong>Solicitudes especiales:</strong>{" "}
                    {detailData.specialRequests.length
                      ? detailData.specialRequests.join(", ")
                      : "—"}
                  </div>
                  <div>
                    <strong>Restricciones dietarias:</strong>{" "}
                    {detailData.dietaryRestrictions.length
                      ? detailData.dietaryRestrictions.join(", ")
                      : "—"}
                  </div>
                  <div>
                    <strong>Alergias:</strong>{" "}
                    {detailData.allergies.length
                      ? detailData.allergies.join(", ")
                      : "—"}
                  </div>
                  <div>
                    <strong>Notas internas:</strong>{" "}
                    {detailData.internalNotes.length
                      ? detailData.internalNotes.join(", ")
                      : "—"}
                  </div>
                  <div>
                    <strong>Tags:</strong>{" "}
                    {detailData.tags.length
                      ? detailData.tags.join(", ")
                      : "—"}
                  </div>
                  <div>
                    <strong>Gasto actual:</strong> $
                    {detailData.actualSpend.toFixed(2)}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    Creada:{" "}
                    {new Date(detailData.createdAt).toLocaleString("es-ES")}
                    <br />
                    Actualizada:{" "}
                    {new Date(detailData.updatedAt).toLocaleString("es-ES")}
                  </div>
                </div>

                {/* Bloque de edición de estado */}
                <div
                  style={{
                    borderTop: "1px solid #1f2937",
                    paddingTop: "0.75rem",
                    marginTop: "0.25rem",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.95rem",
                      marginBottom: "0.5rem",
                      fontWeight: 600,
                    }}
                  >
                    Actualizar reserva (endpoint /status)
                  </h4>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <label
                      style={{ fontSize: "0.85rem", marginBottom: "0.1rem" }}
                    >
                      Nuevo estado (se mapea a action)
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) =>
                        setEditStatus(e.target.value as ReservationStatus | "")
                      }
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #475569",
                        background: "#020617",
                        color: "white",
                        fontSize: "0.85rem",
                      }}
                    >
                      {STATUS_OPTIONS_NO_ALL.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campos extra para complete / cancel */}
                  {editStatus === "completed" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "0.85rem",
                          marginBottom: "0.1rem",
                        }}
                      >
                        Gasto real (opcional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editActualSpend}
                        onChange={(e) => setEditActualSpend(e.target.value)}
                        placeholder="Ej: 25000"
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #475569",
                          background: "#020617",
                          color: "white",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                  )}

                  {editStatus === "cancelled" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "0.85rem",
                          marginBottom: "0.1rem",
                        }}
                      >
                        Motivo de cancelación (opcional)
                      </label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={2}
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #475569",
                          background: "#020617",
                          color: "white",
                          fontSize: "0.85rem",
                          resize: "vertical",
                        }}
                      />
                    </div>
                  )}

                  {editStatus === "seated" && !detailData.tableId && (
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#f97316",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Para usar la acción <strong>seat</strong> esta reserva
                      debe tener una mesa asignada.
                    </p>
                  )}

                  {updateError && (
                    <p
                      style={{
                        color: "#f87171",
                        fontSize: "0.8rem",
                        marginBottom: "0.4rem",
                      }}
                    >
                      {updateError}
                    </p>
                  )}
                  {updateSuccess && (
                    <p
                      style={{
                        color: "#4ade80",
                        fontSize: "0.8rem",
                        marginBottom: "0.4rem",
                      }}
                    >
                      {updateSuccess}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleUpdateReservation}
                    disabled={updating}
                    style={{
                      marginTop: "0.25rem",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.6rem",
                      border: "none",
                      background: "#3b82f6",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: updating ? "default" : "pointer",
                    }}
                  >
                    {updating ? "Guardando cambios..." : "Guardar cambios"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
