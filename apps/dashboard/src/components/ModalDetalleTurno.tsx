import { useState } from "react";
import { useData } from "../contexts/DataContext";
import type { Appointment, Professional, Service, Client } from "@onclick/types";
import { X, AlertTriangle, Edit3, Loader2 } from "lucide-react";

interface AppointmentJoined extends Appointment {
  professional: Professional;
  service: Service;
  client: Client;
}

interface ModalDetalleTurnoProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentJoined;
  isOwn: boolean;
  isAdmin: boolean;
  onUpdated: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  confirmed: { label: "Confirmado", classes: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", classes: "bg-gray-100 text-gray-500" },
  no_show: { label: "No asistió", classes: "bg-red-100 text-red-700" },
  blocked: { label: "Bloqueado", classes: "bg-gray-100 text-gray-500" },
};

export default function ModalDetalleTurno({
  isOpen,
  onClose,
  appointment,
  isOwn,
  isAdmin,
  onUpdated,
}: ModalDetalleTurnoProps) {
  const [editing, setEditing] = useState(false);
  const [editServiceId, setEditServiceId] = useState(appointment.service_id);
  const [editDate, setEditDate] = useState(appointment.starts_at.slice(0, 10));
  const [editTime, setEditTime] = useState(appointment.starts_at.slice(11, 16));
  const [editNotes, setEditNotes] = useState(appointment.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const { updateAppointment } = useData();

  const canEdit = isAdmin || isOwn;
  const statusCfg = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.confirmed;

  async function handleCancel() {
    setSaving(true);
    await updateAppointment(appointment.id, { status: "cancelled" });
    setSaving(false);
    setConfirmingCancel(false);
    onUpdated();
    onClose();
  }

  async function handleNoShow() {
    setSaving(true);
    await updateAppointment(appointment.id, { status: "no_show" });
    setSaving(false);
    onUpdated();
    onClose();
  }

  async function handleSaveEdit() {
    setSaving(true);
    const durationSlots = appointment.service.duration_slots;
    const durationMinutes = durationSlots * 15;
    const [h, m] = editTime.split(":").map(Number);
    const startDate = new Date(editDate);
    startDate.setHours(h, m, 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);

    await updateAppointment(appointment.id, {
      service_id: editServiceId,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      notes: editNotes.trim() || null,
    });
    setSaving(false);
    setEditing(false);
    onUpdated();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="mx-4 flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? "Editar turno" : "Detalle del turno"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-4 max-h-[70vh]">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusCfg.classes}`}>
              {statusCfg.label}
            </span>
            {editing && (
              <span className="text-xs text-blue-600">Modo edición</span>
            )}
          </div>

          {editing ? (
            /* Edit mode */
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Servicio</label>
                <select
                  value={editServiceId}
                  onChange={(e) => setEditServiceId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                >
                  <option value={appointment.service_id}>{appointment.service.name}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hora</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    step="900"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="font-medium text-gray-900">{appointment.client.full_name}</p>
                <p className="text-gray-500">{appointment.client.phone}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-400">Servicio</p>
                  <p className="font-medium text-gray-900">{appointment.service.name}</p>
                  <p className="text-gray-500">{appointment.service.duration_slots * 15} min</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-400">Profesional</p>
                  <p className="font-medium text-gray-900">{appointment.professional.display_name}</p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400">Fecha y hora</p>
                <p className="font-medium text-gray-900">
                  {new Date(appointment.starts_at).toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-gray-500">
                  {appointment.starts_at.slice(11, 16)} — {appointment.ends_at.slice(11, 16)}
                </p>
              </div>

              {appointment.notes && (
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-400">Notas</p>
                  <p className="text-gray-700">{appointment.notes}</p>
                </div>
              )}

              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400">Origen</p>
                <p className="text-gray-700">
                  {appointment.booked_from === "public_url" ? "Reserva online" : "Sistema"}
                </p>
              </div>

              {appointment.service.price && (
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-400">Precio</p>
                  <p className="font-medium text-gray-900">
                    ${appointment.service.price.toLocaleString("es-AR")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          {editing ? (
            <div className="flex w-full justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {canEdit && appointment.status === "confirmed" && !confirmingCancel && (
                  <>
                    <button
                      onClick={() => setConfirmingCancel(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Cancelar turno
                    </button>
                    <button
                      onClick={handleNoShow}
                      disabled={saving}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      No asistió
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </button>
                  </>
                )}
                {confirmingCancel && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">¿Cancelar este turno?</span>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, cancelar"}
                    </button>
                    <button
                      onClick={() => setConfirmingCancel(false)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
