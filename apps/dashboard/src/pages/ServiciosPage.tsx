import { useState, useEffect } from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import type { Service } from "@onclick/types";
import { Plus, X, Loader2, MoreVertical, AlertTriangle } from "lucide-react";

const DURATIONS = [15, 30, 45, 60, 90, 120];

const COLOR_PALETTE = [
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
  { label: "Orange", value: "#ea580c" },
  { label: "Red", value: "#dc2626" },
  { label: "Green", value: "#16a34a" },
  { label: "Yellow", value: "#ca8a04" },
];

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toLocaleString("es-AR")}`;
}

export default function ServiciosPage() {
  const { profile, isAdmin } = useAuth();
  const tenantId = profile?.tenant_id;

  const { getServices, updateService, deleteService, checkFutureAppointments } = useData();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState(false);

  const fetchServices = async () => {
    if (!tenantId) return;
    setLoading(true);
    const data = await getServices(tenantId);
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [tenantId]);

  function openCreate() {
    setEditingService(null);
    setShowModal(true);
  }

  function openEdit(svc: Service) {
    setEditingService(svc);
    setShowModal(true);
  }

  async function handleToggle(svc: Service) {
    await updateService(svc.id, { is_active: !svc.is_active });
    fetchServices();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    const hasFuture = await checkFutureAppointments("service_id", deleteTarget.id);

    if (hasFuture) {
      setDeleteWarning(true);
      setDeleteLoading(false);
      return;
    }

    const success = await deleteService(deleteTarget.id);

    setDeleteLoading(false);
    if (success) {
      setDeleteTarget(null);
      setDeleteWarning(false);
      fetchServices();
    }
  }

  async function handleForceDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await deleteService(deleteTarget.id);
    setDeleteLoading(false);
    setDeleteTarget(null);
    setDeleteWarning(false);
    fetchServices();
  }

  const activeServices = services.filter((s) => s.is_active);
  const inactiveServices = services.filter((s) => !s.is_active);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Servicios</h1>
        {isAdmin() && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            <Plus className="h-4 w-4" />
            Agregar servicio
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && services.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500">No hay servicios aún.</p>
            {isAdmin() && (
              <button
                onClick={openCreate}
                className="mt-3 text-sm font-medium text-[#2563eb] hover:underline"
              >
                Agregar el primer servicio
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {!loading && services.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeServices.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              onEdit={() => openEdit(svc)}
              onToggle={() => handleToggle(svc)}
              onDelete={() => setDeleteTarget(svc)}
            />
          ))}
          {inactiveServices.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              onEdit={() => openEdit(svc)}
              onToggle={() => handleToggle(svc)}
              onDelete={() => setDeleteTarget(svc)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ModalServicio
          service={editingService}
          tenantId={tenantId ?? ""}
          onClose={() => { setShowModal(false); setEditingService(null); }}
          onSaved={() => { setShowModal(false); setEditingService(null); fetchServices(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && !deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">¿Eliminar servicio?</h3>
            <p className="mt-2 text-sm text-gray-500">
              ¿Eliminar el servicio <span className="font-medium text-gray-700">{deleteTarget.name}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete warning (future appointments exist) */}
      {deleteTarget && deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDeleteTarget(null); setDeleteWarning(false); }}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Servicio con turnos futuros</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Este servicio tiene turnos confirmados. Al eliminarlo, los turnos no serán afectados pero el servicio no podrá seleccionarse para nuevos turnos. Considerá{" "}
                  <button
                    onClick={() => { handleToggle(deleteTarget); setDeleteTarget(null); setDeleteWarning(false); }}
                    className="font-medium text-[#2563eb] hover:underline"
                  >
                    desactivarlo
                  </button>{" "}
                  en su lugar.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteWarning(false); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleForceDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: Service;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`relative rounded-xl border border-gray-200 bg-white p-5 transition-opacity ${
        !service.is_active ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 shrink-0 rounded-lg"
            style={{ backgroundColor: service.color ?? "#3B82F6" }}
          />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{service.name}</h3>
            <p className="text-xs text-gray-400">{service.duration_slots * 15} min</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => { onEdit(); setMenuOpen(false); }}
                  className="flex w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => { onToggle(); setMenuOpen(false); }}
                  className="flex w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {service.is_active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="flex w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">
          {formatPrice(service.price)}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            service.is_active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {service.is_active ? "Activo" : "Inactivo"}
        </span>
      </div>
    </div>
  );
}

function ModalServicio({
  service,
  tenantId,
  onClose,
  onSaved,
}: {
  service: Service | null;
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [duration, setDuration] = useState(service ? service.duration_slots * 15 : 30);
  const [price, setPrice] = useState(service?.price?.toString() ?? "");
  const [color, setColor] = useState(service?.color ?? COLOR_PALETTE[1].value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { createService, updateService } = useData();

  async function handleSave() {
    setError("");
    if (!name.trim()) { setError("El nombre del servicio es obligatorio."); return; }
    if (!tenantId) { setError("No se encontró el negocio."); return; }

    setSaving(true);

    const payload = {
      tenant_id: tenantId,
      name: name.trim(),
      duration_slots: duration / 15,
      price: price ? parseFloat(price) : null,
      color,
    };

    try {
      if (service) {
        await updateService(service.id, payload);
      } else {
        await createService(payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Error al guardar el servicio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {service ? "Editar servicio" : "Nuevo servicio"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre del servicio</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Corte clásico"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Duración</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Precio en ARS</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min={0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`h-8 w-8 rounded-lg transition-all ${
                    color === c.value ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {service ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
