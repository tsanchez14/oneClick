import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@onclick/utils";
import { useAuth } from "../contexts/AuthContext";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  X,
  Plus,
  Trash2,
  Building2,
  Clock,
  Scissors,
} from "lucide-react";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_INDEX_MAP: Record<string, number> = {
  Lun: 1, Mar: 2, "Mié": 3, Jue: 4, Vie: 5, Sáb: 6, Dom: 0,
};

const DURATIONS = [15, 30, 45, 60, 90, 120];

const COLOR_PALETTE = [
  { label: "Teal", value: "#14B8A6" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Pink", value: "#EC4899" },
  { label: "Orange", value: "#F97316" },
  { label: "Red", value: "#EF4444" },
  { label: "Green", value: "#22C55E" },
  { label: "Yellow", value: "#EAB308" },
];

interface ServiceForm {
  key: string;
  name: string;
  duration: number;
  price: string;
  color: string;
}

interface FormData {
  name: string;
  phone: string;
  slug: string;
  days: number[];
  openTime: string;
  closeTime: string;
  services: ServiceForm[];
}

let serviceKeyCounter = 0;
const EMPTY_SERVICE = (): ServiceForm => ({
  key: `svc_${++serviceKeyCounter}`,
  name: "",
  duration: 60,
  price: "",
  color: COLOR_PALETTE[0].value,
});

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const tenantId = profile?.tenant_id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0f1729] border-t-transparent" />
      </div>
    );
  }

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    slug: "",
    days: [1, 2, 3, 4, 5],
    openTime: "09:00",
    closeTime: "18:00",
    services: [EMPTY_SERVICE()],
  });

  const slugTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const updateField = <K extends keyof FormData>(
    key: K,
    value: FormData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const daysLabel = useCallback(() => {
    if (form.days.length === 0) return "Ningún día seleccionado";
    const ordered = form.days.sort((a, b) => a - b);
    const labels = ordered.map((d) => DAY_LABELS[d === 0 ? 6 : d - 1]);

    const ranges: string[] = [];
    let start = labels[0];
    let prev = labels[0];
    for (let i = 1; i < labels.length; i++) {
      if (
        ordered[i] === ordered[i - 1] + 1 ||
        (ordered[i - 1] === 5 && ordered[i] === 0)
      ) {
        prev = labels[i];
      } else {
        ranges.push(start === prev ? start : `${start} a ${prev}`);
        start = labels[i];
        prev = labels[i];
      }
    }
    ranges.push(start === prev ? start : `${start} a ${prev}`);
    return ranges.join(", ");
  }, [form.days]);

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  useEffect(() => {
    if (!form.name) {
      setSlugError("");
      return;
    }
    const slug = autoSlug(form.name);
    updateField("slug", slug);
  }, [form.name]);

  useEffect(() => {
    if (!form.slug || form.slug.length < 2) {
      setSlugError("");
      return;
    }
    setSlugChecking(true);
    clearTimeout(slugTimeout.current);
    slugTimeout.current = setTimeout(async () => {
      const { data, error: _err } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", form.slug)
        .neq("id", tenantId ?? "__none__")
        .maybeSingle();

      setSlugChecking(false);
      if (data) {
        setSlugError("Este slug ya está en uso.");
      } else {
        setSlugError("");
      }
    }, 500);
    return () => clearTimeout(slugTimeout.current);
  }, [form.slug, tenantId]);

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoPreview(null);
  }

  function addService() {
    setForm((prev) => ({
      ...prev,
      services: [...prev.services, EMPTY_SERVICE()],
    }));
  }

  function removeService(key: string) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.key !== key),
    }));
  }

  function updateService(key: string, field: keyof ServiceForm, value: string | number) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.key === key ? { ...s, [field]: value } : s,
      ),
    }));
  }

  function validateStep(stepNum: number): boolean {
    setError("");
    if (stepNum === 1) {
      if (!form.name.trim()) { setError("El nombre del negocio es obligatorio."); return false; }
      if (!form.phone.trim()) { setError("El teléfono de contacto es obligatorio."); return false; }
      if (slugError || !form.slug) { setError("El slug no es válido o ya está en uso."); return false; }
      return true;
    }
    if (stepNum === 2) {
      if (form.days.length === 0) { setError("Seleccioná al menos un día."); return false; }
      return true;
    }
    if (stepNum === 3) {
      if (form.services.length === 0) { setError("Agregá al menos un servicio."); return false; }
      for (const s of form.services) {
        if (!s.name.trim()) { setError("Completá el nombre de todos los servicios."); return false; }
      }
      return true;
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
    setError("");
  }

  async function handleSave() {
    if (!tenantId) {
      setError("No se encontró el tenant. Refrescá la página o cerrá sesión y volvé a iniciarla.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${tenantId}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("tenant-assets")
          .upload(path, logoFile, { upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("tenant-assets")
            .getPublicUrl(path);
          logoUrl = urlData.publicUrl;
        }
      }

      const { error: tenantErr } = await supabase
        .from("tenants")
        .update({
          name: form.name.trim(),
          phone: form.phone.trim(),
          slug: form.slug,
          logo_url: logoUrl,
          working_days: form.days,
          open_time: form.openTime,
          close_time: form.closeTime,
        })
        .eq("id", tenantId);

      if (tenantErr) { setError(tenantErr.message); setSaving(false); return; }

      const serviceRows = form.services.map((s) => ({
        tenant_id: tenantId,
        name: s.name.trim(),
        duration_slots: s.duration / 15,
        price: s.price ? parseFloat(s.price) : null,
        color: s.color,
      }));

      const { error: svcErr } = await supabase
        .from("services")
        .insert(serviceRows);

      if (svcErr) { setError(svcErr.message); setSaving(false); return; }

      navigate("/dashboard");
    } catch {
      setError("Ocurrió un error inesperado.");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-blue-900 px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Configurá tu negocio</h1>
          <p className="mt-1 text-sm text-blue-200">Completá los pasos para empezar</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {/* Progress */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    n < step
                      ? "bg-green-500 text-white"
                      : n === step
                        ? "bg-navy-800 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {n < step ? <Check className="h-4 w-4" /> : n}
                </div>
                {n < 4 && (
                  <div
                    className={`h-0.5 w-8 transition-colors ${
                      n < step ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1 — Business data */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-3">
                <Building2 className="h-5 w-5 text-navy-600" />
                <h2 className="text-lg font-semibold text-navy-900">Datos del negocio</h2>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre del negocio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Ej: Barbería Estilo"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Teléfono de contacto <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="Ej: +54 11 1234-5678"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Logo (opcional)</label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400">
                      <Upload className="h-6 w-6" />
                      <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
                    </label>
                  )}
                  <span className="text-xs text-gray-400">PNG, JPG. Máx 2 MB.</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  URL pública <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-sm text-gray-500">onclick.com/</span>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => updateField("slug", autoSlug(e.target.value))}
                      placeholder="mi-negocio"
                      className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 ${
                        slugError
                          ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                          : form.slug && !slugError
                            ? "border-green-400 focus:border-green-500 focus:ring-green-200"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                      }`}
                    />
                    {slugChecking && (
                      <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    )}
                  </div>
                </div>
                {slugError && <p className="mt-1 text-xs text-red-500">{slugError}</p>}
                {form.slug && !slugError && !slugChecking && (
                  <p className="mt-1 text-xs text-green-600">Slug disponible</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2 — Days & hours */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-3">
                <Clock className="h-5 w-5 text-navy-600" />
                <h2 className="text-lg font-semibold text-navy-900">Días y horarios</h2>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Días de atención</label>
                <div className="flex flex-wrap gap-2">
                  {DAY_LABELS.map((label) => {
                    const dayNum = DAY_INDEX_MAP[label];
                    const active = form.days.includes(dayNum);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleDay(dayNum)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                          active
                            ? "border-navy-800 bg-navy-800 text-white"
                            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Apertura</label>
                  <input
                    type="time"
                    value={form.openTime}
                    onChange={(e) => updateField("openTime", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cierre</label>
                  <input
                    type="time"
                    value={form.closeTime}
                    onChange={(e) => updateField("closeTime", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                <span className="font-medium">Vista previa:</span>{" "}
                {daysLabel()}, {form.openTime.slice(0, 5)} a {form.closeTime.slice(0, 5)}
              </div>
            </div>
          )}

          {/* Step 3 — Services */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-3">
                <Scissors className="h-5 w-5 text-navy-600" />
                <h2 className="text-lg font-semibold text-navy-900">Servicios</h2>
              </div>

              {form.services.map((svc, idx) => (
                <div
                  key={svc.key}
                  className="relative rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  {form.services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeService(svc.key)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <p className="mb-3 text-xs font-semibold uppercase text-gray-400">
                    Servicio #{idx + 1}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={svc.name}
                        onChange={(e) => updateService(svc.key, "name", e.target.value)}
                        placeholder="Nombre del servicio"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Duración</label>
                      <select
                        value={svc.duration}
                        onChange={(e) => updateService(svc.key, "duration", Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        {DURATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d} min
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Precio ($)</label>
                      <input
                        type="number"
                        value={svc.price}
                        onChange={(e) => updateService(svc.key, "price", e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-gray-500">Color</label>
                      <div className="flex gap-2">
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => updateService(svc.key, "color", c.value)}
                            className={`h-7 w-7 rounded-full border-2 transition ${
                              svc.color === c.value ? "border-gray-800 scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addService}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700"
              >
                <Plus className="h-4 w-4" />
                Agregar otro servicio
              </button>
            </div>
          )}

          {/* Step 4 — Summary */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-navy-900">Resumen de configuración</h2>

              <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Negocio:</span>{" "}
                  <span className="text-gray-600">{form.name}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Teléfono:</span>{" "}
                  <span className="text-gray-600">{form.phone}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">URL:</span>{" "}
                  <span className="text-gray-600">onclick.com/{form.slug}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Horario:</span>{" "}
                  <span className="text-gray-600">
                    {daysLabel()}, {form.openTime.slice(0, 5)} a {form.closeTime.slice(0, 5)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    Servicios ({form.services.length}):
                  </span>
                  <ul className="mt-1 space-y-1">
                    {form.services.map((s) => (
                      <li key={s.key} className="flex items-center gap-2 text-gray-600">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name} — {s.duration} min{s.price ? ` — $${s.price}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
              )}
            </div>
            <div>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-1 rounded-lg bg-navy-800 px-6 py-2 text-sm font-semibold text-white hover:bg-navy-900"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {saving ? "Guardando…" : "Ir a mi agenda"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
