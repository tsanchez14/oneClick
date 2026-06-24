import { useState, useEffect, useRef } from "react";
import { useData } from "../contexts/DataContext";
import type { Professional, Service, Client } from "@onclick/types";
import { X, Search, Plus, Loader2 } from "lucide-react";

interface ModalCrearTurnoProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: Date;
  defaultTime: string;
  defaultProfessionalId: string;
  professionals: Professional[];
  tenantId: string;
  onCreated: () => void;
}

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h, m };
}

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ModalCrearTurno({
  isOpen,
  onClose,
  defaultDate,
  defaultTime,
  defaultProfessionalId,
  professionals,
  tenantId,
  onCreated,
}: ModalCrearTurnoProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [searchingClient, setSearchingClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState(defaultProfessionalId);
  const [date, setDate] = useState(formatDateForInput(defaultDate));
  const [time, setTime] = useState(defaultTime);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const searchRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [showResults, setShowResults] = useState(false);

  const { getActiveServices, searchClients, upsertClient, createAppointment } = useData();

  useEffect(() => {
    if (!tenantId) return;
    getActiveServices(tenantId).then((data) => {
      setServices(data || []);
      setLoadingServices(false);
    });
  }, [tenantId, getActiveServices]);

  useEffect(() => {
    if (services.length > 0 && !serviceId) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!clientSearch.trim()) {
      setClientResults([]);
      setShowResults(false);
      return;
    }
    setSearchingClient(true);
    searchRef.current = setTimeout(async () => {
      const data = await searchClients(tenantId, clientSearch);
      setClientResults(data || []);
      setShowResults(true);
      setSearchingClient(false);
    }, 400);
  }, [clientSearch, tenantId, searchClients]);

  function resetForm() {
    setClientSearch("");
    setClientResults([]);
    setSelectedClient(null);
    setShowNewClient(false);
    setNewClientName("");
    setNewClientPhone("");
    setServiceId(services[0]?.id ?? "");
    setProfessionalId(defaultProfessionalId);
    setDate(formatDateForInput(defaultDate));
    setTime(defaultTime);
    setNotes("");
    setError("");
    setShowResults(false);
  }

  function selectClient(client: Client) {
    setSelectedClient(client);
    setClientSearch(`${client.full_name} (${client.phone})`);
    setShowResults(false);
    setShowNewClient(false);
  }

  async function createNewClient(): Promise<Client | null> {
    try {
      return await upsertClient(tenantId, newClientPhone, newClientName);
    } catch (err: any) {
      setError(err.message || "Error al crear cliente");
      return null;
    }
  }

  async function handleConfirm() {
    setError("");

    let client = selectedClient;
    if (!client) {
      if (!newClientName.trim() || !newClientPhone.trim()) {
        setError("Seleccioná o creá un cliente");
        return;
      }
      setCreatingClient(true);
      client = await createNewClient();
      setCreatingClient(false);
      if (!client) return;
    }

    if (!serviceId) {
      setError("Seleccioná un servicio");
      return;
    }
    if (!professionalId) {
      setError("Seleccioná un profesional");
      return;
    }

    const selService = services.find((s) => s.id === serviceId);
    if (!selService) return;

    const { h, m } = parseTime(time);
    const startDate = new Date(date);
    startDate.setHours(h, m, 0, 0);

    const durationMinutes = selService.duration_slots * 15;
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);

    setSaving(true);
    try {
      await createAppointment({
        tenant_id: tenantId,
        professional_id: professionalId,
        service_id: serviceId,
        client_id: client.id,
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        status: "confirmed",
        notes: notes.trim() || null,
        booked_from: "system",
      });
    } catch (err: any) {
      setError(err.message || "Error al crear el turno");
      setSaving(false);
      return;
    }
    setSaving(false);

    resetForm();
    onCreated();
    onClose();
  }

  if (!isOpen) return null;

  const selService = services.find((s) => s.id === serviceId);
  const durationMinutes = selService ? selService.duration_slots * 15 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="mx-4 flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Nuevo turno</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-4 max-h-[70vh]">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}

          {/* Client search */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
            {selectedClient && !showNewClient ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2">
                <span className="text-sm">{selectedClient.full_name} — {selectedClient.phone}</span>
                <button
                  onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                  className="text-xs text-[#2563eb] hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setSelectedClient(null);
                  }}
                  onFocus={() => { if (clientResults.length > 0) setShowResults(true); }}
                  placeholder="Buscar por nombre o teléfono..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
                />
                {searchingClient && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                )}
                {showResults && clientResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    {clientResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectClient(c)}
                        className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-blue-50"
                      >
                        <span className="font-medium">{c.full_name}</span>
                        <span className="ml-2 text-gray-400">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showResults && clientSearch.trim() && clientResults.length === 0 && !searchingClient && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg">
                    <button
                      onClick={() => { setShowNewClient(true); setShowResults(false); }}
                      className="flex items-center gap-2 text-[#2563eb] hover:underline"
                    >
                      <Plus className="h-4 w-4" />
                      Agendar como nuevo cliente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New client form */}
          {showNewClient && !selectedClient && (
            <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-medium text-blue-700">Nuevo cliente</p>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nombre completo"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
              />
              <input
                type="tel"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="Teléfono"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
              />
            </div>
          )}

          {/* Service selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Servicio</label>
            {loadingServices ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando servicios...
              </div>
            ) : (
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.duration_slots * 15} min{s.price ? ` — $${s.price.toLocaleString("es-AR")}` : ""}
                  </option>
                ))}
              </select>
            )}
            {selService && (
              <p className="mt-1 text-xs text-gray-400">
                Duración: {durationMinutes} min — Finaliza approx.{" "}
                {(() => {
                  const { h, m } = parseTime(time);
                  const d = new Date();
                  d.setHours(h, m + durationMinutes, 0, 0);
                  return d.toTimeString().slice(0, 5);
                })()}
                {selService.price ? ` — $${selService.price.toLocaleString("es-AR")}` : ""}
              </p>
            )}
          </div>

          {/* Professional selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Profesional</label>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name ?? "Sin nombre"}
                </option>
              ))}
            </select>
          </div>

          {/* Date and time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step="900"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notas sobre el turno..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || creatingClient}
            className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {(saving || creatingClient) && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar turno
          </button>
        </div>
      </div>
    </div>
  );
}
