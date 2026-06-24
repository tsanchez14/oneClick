import { useState, useEffect, useRef } from "react";
import { supabase } from "@onclick/utils";
import { useAuth } from "../contexts/AuthContext";
import type { Tenant, Subscription } from "@onclick/types";
import {
  Store,
  Bell,
  CreditCard,
  Upload,
  X,
  Check,
  Loader2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Ban,
  ChevronRight,
  Zap,
  Star,
  Crown,
} from "lucide-react";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_INDEX_MAP: Record<string, number> = {
  Lun: 1, Mar: 2, "Mié": 3, Jue: 4, Vie: 5, Sáb: 6, Dom: 0,
};

const REMINDER_OPTIONS = [
  { value: "1h", label: "1 hora antes" },
  { value: "2h", label: "2 horas antes" },
  { value: "12h", label: "12 horas antes" },
  { value: "24h", label: "24 horas antes" },
];

const PLAN_ORDER: Record<string, number> = { base: 1, pro: 2, premium: 3 };

const PLANS = [
  {
    key: "base" as const,
    name: "Plan Base",
    price: "$12.000/mes",
    promo: "$9.000/mes",
    desc: "Para emprendimientos que arrancan",
    features: [
      "Hasta 3 profesionales",
      "Agenda compartida",
      "Recordatorios por WhatsApp",
      "URL pública personalizada",
    ],
  },
  {
    key: "pro" as const,
    name: "Plan Pro",
    price: "$25.000/mes",
    promo: "$22.000/mes",
    desc: "Para negocios en crecimiento",
    features: [
      "Hasta 10 profesionales",
      "Reportes y estadísticas",
      "Múltiples sucursales",
      "Soporte prioritario",
    ],
    popular: true,
  },
  {
    key: "premium" as const,
    name: "Plan Premium",
    price: "$43.000/mes",
    promo: "$40.000/mes",
    desc: "Para empresas consolidadas",
    features: [
      "Profesionales ilimitados",
      "API pública",
      "Personalización de marca",
      "Gerente de cuenta dedicado",
    ],
  },
];

type Tab = "negocio" | "notificaciones" | "suscripcion";

function autoSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function ConfiguracionPage() {
  const { profile, isAdmin, loading: authLoading } = useAuth();
  const tenantId = profile?.tenant_id;

  const [activeTab, setActiveTab] = useState<Tab>("negocio");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sectionRefs = {
    negocio: useRef<HTMLDivElement>(null),
    notificaciones: useRef<HTMLDivElement>(null),
    suscripcion: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (hash && ["negocio", "notificaciones", "suscripcion"].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    const el = sectionRefs[activeTab]?.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const [tenantRes, subRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
        supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
      ]);
      if (tenantRes.data) setTenant(tenantRes.data);
      if (subRes.data) setSubscription(subRes.data);
      setLoading(false);
    };
    load();
  }, [tenantId]);

  // ─── Negocio state ───
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const slugTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setPhone(tenant.phone ?? "");
    setSlug(tenant.slug);
    setDays(tenant.working_days);
    setOpenTime(tenant.open_time.slice(0, 5));
    setCloseTime(tenant.close_time.slice(0, 5));
    setLogoPreview(tenant.logo_url);
  }, [tenant]);

  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugError("");
      return;
    }
    setSlugChecking(true);
    clearTimeout(slugTimeout.current);
    slugTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .neq("id", tenantId ?? "__none__")
        .maybeSingle();
      setSlugChecking(false);
      setSlugError(data ? "Este slug ya está en uso." : "");
    }, 500);
    return () => clearTimeout(slugTimeout.current);
  }, [slug, tenantId]);

  // ─── Notificaciones state ───
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("2h");

  useEffect(() => {
    if (!tenant) return;
    setWhatsappEnabled((tenant as any).whatsapp_reminder_enabled ?? false);
    setReminderTime((tenant as any).reminder_time ?? "2h");
  }, [tenant]);

  // ─── Suscripción state ───
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // ─── Handlers ───

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

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function handleSaveNegocio() {
    if (!tenantId || !tenant) return;
    if (!name.trim()) { setError("El nombre del negocio es obligatorio."); return; }
    if (!phone.trim()) { setError("El teléfono de contacto es obligatorio."); return; }
    if (slugError || !slug) { setError("El slug no es válido o ya está en uso."); return; }
    if (days.length === 0) { setError("Seleccioná al menos un día."); return; }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let logoUrl = tenant.logo_url;
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
      } else if (logoPreview === null && tenant.logo_url) {
        const oldPath = tenant.logo_url.split("/").slice(-2).join("/");
        await supabase.storage.from("tenant-assets").remove([oldPath]);
        logoUrl = null;
      }

      const { error: err } = await supabase
        .from("tenants")
        .update({
          name: name.trim(),
          phone: phone.trim(),
          slug,
          logo_url: logoUrl,
          working_days: days,
          open_time: openTime,
          close_time: closeTime,
        })
        .eq("id", tenantId);

      if (err) { setError(err.message); return; }

      setTenant((prev) =>
        prev ? { ...prev, name: name.trim(), phone, slug, logo_url: logoUrl, working_days: days, open_time: openTime, close_time: closeTime } : prev
      );
      setSuccess("Cambios guardados correctamente.");
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotificaciones() {
    if (!tenantId) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: err } = await supabase
      .from("tenants")
      .update({
        whatsapp_reminder_enabled: whatsappEnabled,
        reminder_time: reminderTime,
      } as any)
      .eq("id", tenantId);

    if (err) { setError(err.message); } else {
      setSuccess("Preferencias de notificación guardadas.");
    }
    setSaving(false);
  }

  async function handleChoosePlan(planKey: string) {
    setSelectedPlan(planKey);
    setShowPaymentModal(true);
  }

  async function handleConfirmPlan() {
    if (!tenantId || !selectedPlan) return;
    setSaving(true);
    setError("");

    const { error: err } = await supabase
      .from("subscriptions")
      .upsert({
        tenant_id: tenantId,
        plan: selectedPlan,
        status: "active",
        payment_method: "manual",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        promo_ends_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "tenant_id" })
      .select()
      .single();

    if (err) { setError(err.message); setSaving(false); return; }

    const { error: tenantErr } = await supabase
      .from("tenants")
      .update({ status: "active" })
      .eq("id", tenantId);

    if (tenantErr) { setError(tenantErr.message); } else {
      setShowPaymentModal(false);
      setSelectedPlan(null);
      setSuccess("Plan contratado con éxito.");
      const [_, subRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
        supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
      ]);
      if (subRes.data) setSubscription(subRes.data);
    }
    setSaving(false);
  }

  async function handleUpgrade(planKey: string) {
    if (!tenantId) return;
    setSaving(true);
    setError("");

    const { error: err } = await supabase
      .from("subscriptions")
      .update({ plan: planKey })
      .eq("tenant_id", tenantId);

    if (err) { setError(err.message); } else {
      setShowUpgradeModal(false);
      setSuccess("Plan mejorado con éxito.");
      const { data } = await supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).single();
      if (data) setSubscription(data);
    }
    setSaving(false);
  }

  async function handleDowngrade(planKey: string) {
    if (!tenantId) return;
    setSaving(true);
    setError("");

    const { error: err } = await supabase
      .from("subscriptions")
      .update({ plan: planKey })
      .eq("tenant_id", tenantId);

    if (err) { setError(err.message); } else {
      setShowDowngradeConfirm(false);
      setSuccess("Plan cambiado con éxito.");
      const { data } = await supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).single();
      if (data) setSubscription(data);
    }
    setSaving(false);
  }

  async function handleCancelSubscription() {
    if (!tenantId) return;
    setSaving(true);
    setError("");

    const { error: err } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("tenant_id", tenantId);

    if (err) { setError(err.message); } else {
      setShowCancelConfirm(false);
      setSuccess("Suscripción cancelada. Tu acceso se mantendrá hasta el fin del período facturado.");
      const { data } = await supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).single();
      if (data) setSubscription(data);
    }
    setSaving(false);
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Solo los administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  const isTrial = tenant?.status === "trial" || (!subscription || subscription.status === "trial");
  const currentPlan = subscription?.plan;

  const availableUpgrades = currentPlan
    ? PLANS.filter((p) => PLAN_ORDER[p.key] > PLAN_ORDER[currentPlan])
    : [];

  const availableDowngrades = currentPlan
    ? PLANS.filter((p) => PLAN_ORDER[p.key] < PLAN_ORDER[currentPlan])
    : [];

  const TABS: { key: Tab; label: string; icon: typeof Store }[] = [
    { key: "negocio", label: "Negocio", icon: Store },
    { key: "notificaciones", label: "Notificaciones", icon: Bell },
    { key: "suscripcion", label: "Suscripción", icon: CreditCard },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Configuración</h1>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-white text-navy-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Flash messages */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* ─────────── SECCIÓN 1: NEGOCIO ─────────── */}
      <div ref={sectionRefs.negocio} id="negocio" className="scroll-mt-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-2 border-b pb-4">
            <Store className="h-5 w-5 text-navy-600" />
            <h2 className="text-lg font-semibold text-navy-900">Datos del negocio</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre del negocio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +54 11 1234-5678"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Logo</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
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
              <label className="mb-2 block text-sm font-medium text-gray-700">Días de atención</label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label) => {
                  const dayNum = DAY_INDEX_MAP[label];
                  const active = days.includes(dayNum);
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Horario apertura</label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Horario cierre</label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Slug / URL pública <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-sm text-gray-500">onclick.com/</span>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(autoSlug(e.target.value))}
                    placeholder="mi-negocio"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 ${
                      slugError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                        : slug && !slugError
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
              {slug && !slugError && !slugChecking && (
                <p className="mt-1 text-xs text-green-600">onclick.com/{slug} — disponible</p>
              )}
            </div>

            <div className="flex justify-end border-t pt-5">
              <button
                onClick={handleSaveNegocio}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-navy-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────── SECCIÓN 2: NOTIFICACIONES ─────────── */}
      <div ref={sectionRefs.notificaciones} id="notificaciones" className="mt-6 scroll-mt-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-2 border-b pb-4">
            <Bell className="h-5 w-5 text-navy-600" />
            <h2 className="text-lg font-semibold text-navy-900">Notificaciones</h2>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Activar recordatorios por WhatsApp</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Tus clientes recibirán un recordatorio por WhatsApp antes de su turno.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  whatsappEnabled ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    whatsappEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tiempo de anticipación
              </label>
              <select
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                disabled={!whatsappEnabled}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 ${
                  whatsappEnabled
                    ? "border-gray-300 focus:border-blue-500"
                    : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                }`}
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {!whatsappEnabled && (
                <p className="mt-1 text-xs text-gray-400">Activá los recordatorios para configurar el tiempo.</p>
              )}
            </div>

            <div className="flex justify-end border-t pt-5">
              <button
                onClick={handleSaveNotificaciones}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-navy-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────── SECCIÓN 3: SUSCRIPCIÓN ─────────── */}
      <div ref={sectionRefs.suscripcion} id="suscripcion" className="mt-6 scroll-mt-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-2 border-b pb-4">
            <CreditCard className="h-5 w-5 text-navy-600" />
            <h2 className="text-lg font-semibold text-navy-900">Suscripción</h2>
          </div>

          {isTrial ? (
            <div>
              <p className="mb-6 text-sm text-gray-500">
                Estás usando el período de prueba gratuita. Elegí el plan que mejor se adapte a tu negocio.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {PLANS.map((plan) => (
                  <div
                    key={plan.key}
                    className={`relative flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-md ${
                      plan.popular ? "border-blue-500 shadow-sm" : "border-gray-200"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                        Más elegido
                      </span>
                    )}
                    <div className="mb-1 flex items-center gap-2">
                      {plan.key === "base" && <Zap className="h-5 w-5 text-gray-500" />}
                      {plan.key === "pro" && <Star className="h-5 w-5 text-blue-600" />}
                      {plan.key === "premium" && <Crown className="h-5 w-5 text-amber-500" />}
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    </div>
                    <p className="mb-3 text-xs text-gray-400">{plan.desc}</p>
                    <div className="mb-3">
                      <span className="text-2xl font-bold text-gray-900">{plan.promo}</span>
                      <span className="ml-1 text-xs text-gray-400 line-through">{plan.price}</span>
                    </div>
                    <p className="mb-4 text-xs text-green-600">los primeros 3 meses</p>
                    <ul className="mb-6 flex-1 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleChoosePlan(plan.key)}
                      className={`w-full rounded-lg py-2.5 text-sm font-semibold transition ${
                        plan.popular
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Elegir plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : subscription ? (
            <div className="space-y-6">
              {/* Plan actual */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Plan actual</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {subscription.plan === "base" && "Plan Base"}
                      {subscription.plan === "pro" && "Plan Pro"}
                      {subscription.plan === "premium" && "Plan Premium"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      subscription.status === "active"
                        ? "bg-green-100 text-green-700"
                        : subscription.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {subscription.status === "active" ? "Activo" : subscription.status === "cancelled" ? "Cancelado" : "Pendiente"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-400">Precio</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {subscription.plan === "base" && (subscription.promo_ends_at ? "$9.000/mes" : "$12.000/mes")}
                      {subscription.plan === "pro" && (subscription.promo_ends_at ? "$22.000/mes" : "$25.000/mes")}
                      {subscription.plan === "premium" && (subscription.promo_ends_at ? "$40.000/mes" : "$43.000/mes")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Próximo vencimiento</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {subscription.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString("es-AR", {
                            day: "numeric", month: "long", year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Método de pago</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {subscription.payment_method === "mercadopago"
                        ? "Mercado Pago"
                        : subscription.payment_method === "manual"
                          ? "Efectivo / Transferencia"
                          : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-3">
                {availableUpgrades.length > 0 && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <ArrowUp className="h-4 w-4" />
                    Mejorar plan
                  </button>
                )}
                {availableDowngrades.length > 0 && (
                  <button
                    onClick={() => setShowDowngradeConfirm(true)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowDown className="h-4 w-4" />
                    Cambiar a plan inferior
                  </button>
                )}
                {subscription.status === "active" && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="flex items-center gap-2 rounded-lg border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Ban className="h-4 w-4" />
                    Cancelar suscripción
                  </button>
                )}
              </div>

              {subscription.status === "cancelled" && (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Tu suscripción está cancelada. Tu acceso se mantendrá hasta{" "}
                    <strong>
                      {subscription.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString("es-AR")
                        : "el fin del período"}
                    </strong>
                    . Podés reactivarla en cualquier momento.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── MODAL: Elegir método de pago ─── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowPaymentModal(false); setSelectedPlan(null); }}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Elegí tu método de pago</h3>
            </div>
            <div className="space-y-3 px-6 py-5">
              <p className="text-sm text-gray-500">
                Plan seleccionado:{" "}
                <span className="font-semibold text-gray-900">
                  {PLANS.find((p) => p.key === selectedPlan)?.name}
                </span>
              </p>
              <button
                onClick={() => handleConfirmPlan()}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"
              >
                <div>
                  <p className="font-medium text-gray-900">Mercado Pago</p>
                  <p className="text-xs text-gray-500">Pagá con tarjeta, débito o efectivo</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
              <button
                onClick={() => handleConfirmPlan()}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"
              >
                <div>
                  <p className="font-medium text-gray-900">Efectivo / Transferencia</p>
                  <p className="text-xs text-gray-500">Te contactaremos para coordinar</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="flex justify-end border-t px-6 py-4">
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedPlan(null); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Mejorar plan ─── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowUpgradeModal(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Mejorar plan</h3>
            </div>
            <div className="space-y-3 px-6 py-5">
              <p className="text-sm text-gray-500">Elegí a qué plan querés migrar:</p>
              {availableUpgrades.map((plan) => (
                <button
                  key={plan.key}
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={saving}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
                >
                  <div>
                    <p className="font-medium text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500">{plan.promo} — {plan.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))}
            </div>
            <div className="flex justify-end border-t px-6 py-4">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Confirmar downgrade ─── */}
      {showDowngradeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDowngradeConfirm(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Cambiar a plan inferior</h3>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Al cambiar a un plan inferior podrías perder algunas funcionalidades.
                </p>
              </div>
              <p className="text-sm text-gray-500">Elegí el plan al que querés cambiar:</p>
              {availableDowngrades.map((plan) => (
                <button
                  key={plan.key}
                  onClick={() => handleDowngrade(plan.key)}
                  disabled={saving}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60"
                >
                  <div>
                    <p className="font-medium text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500">{plan.promo}/mes</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))}
            </div>
            <div className="flex justify-end border-t px-6 py-4">
              <button
                onClick={() => setShowDowngradeConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Confirmar cancelación ─── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCancelConfirm(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Cancelar suscripción</h3>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Tu acceso se mantendrá hasta{" "}
                  <strong>
                    {subscription?.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString("es-AR", {
                          day: "numeric", month: "long", year: "numeric",
                        })
                      : "el fin del período actual"}
                  </strong>
                  . Podés reactivar en cualquier momento.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
