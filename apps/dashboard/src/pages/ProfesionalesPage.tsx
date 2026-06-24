import { useState, useEffect } from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import type { Professional, User, Subscription } from "@onclick/types";
import { X, Loader2, MoreVertical, Copy, Share2, Check, UserPlus } from "lucide-react";

interface ProfessionalWithUser extends Professional {
  user: Pick<User, "role" | "is_active"> | null;
}

const PLAN_LIMITS: Record<string, number> = {
  base: 1,
  pro: 5,
  premium: Infinity,
};

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#2563eb", "#7c3aed", "#db2777", "#ea580c",
    "#16a34a", "#0d9488", "#ca8a04", "#dc2626",
  ];
  return colors[Math.abs(hash) % colors.length];
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ProfesionalesPage() {
  const { profile, isAdmin } = useAuth();
  const tenantId = profile?.tenant_id;

  const [professionals, setProfessionals] = useState<ProfessionalWithUser[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ProfessionalWithUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfessionalWithUser | null>(null);

  const { getProfessionals, getSubscription, updateProfessional, deleteProfessional } = useData();

  const fetchData = async () => {
    if (!tenantId) return;
    setLoading(true);

    const [profData, subData] = await Promise.all([
      getProfessionals(tenantId),
      getSubscription(tenantId),
    ]);

    setProfessionals(profData as unknown as ProfessionalWithUser[]);
    setSubscription(subData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const plan = subscription?.plan ?? "base";
  const limit = PLAN_LIMITS[plan] ?? 1;
  const atLimit = professionals.length >= limit;

  async function handleToggle(prof: ProfessionalWithUser) {
    await updateProfessional(prof.id, { is_available: !prof.is_available });
    fetchData();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteProfessional(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Profesionales</h1>
        {isAdmin() && (
          <div className="relative">
            <button
              onClick={() => {
                if (atLimit) return;
                setShowInviteModal(true);
              }}
              disabled={atLimit}
              className="flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              Invitar profesional
            </button>
            {atLimit && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
                <p className="text-xs text-gray-600">
                  {plan === "base"
                    ? "El plan Base solo incluye 1 profesional. Actualizá a Pro para agregar más."
                    : plan === "pro"
                      ? "El plan Pro incluye hasta 5 profesionales. Actualizá a Premium para agregar más."
                      : "Límite alcanzado."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty */}
      {!loading && professionals.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500">No hay profesionales aún.</p>
          </div>
        </div>
      )}

      {/* Grid */}
      {!loading && professionals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {professionals.map((prof) => (
            <div
              key={prof.id}
              className="relative rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: avatarColor(prof.display_name ?? "") }}
                >
                  {(prof.display_name ?? "?").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {prof.display_name ?? "Sin nombre"}
                    </h3>
                    {prof.user?.role === "admin" && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Admin
                      </span>
                    )}
                  </div>
                  {prof.specialty && (
                    <p className="mt-0.5 text-xs text-gray-400">{prof.specialty}</p>
                  )}
                </div>

                {/* Options menu */}
                <div className="relative">
                  <button
                    onClick={() => {
                      const el = document.getElementById(`menu-${prof.id}`);
                      if (el) el.classList.toggle("hidden");
                    }}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  <div
                    id={`menu-${prof.id}`}
                    className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg hidden"
                  >
                    <button
                      onClick={() => { setEditTarget(prof); document.getElementById(`menu-${prof.id}`)?.classList.add("hidden"); }}
                      className="flex w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Editar perfil
                    </button>
                    {prof.user?.role !== "admin" && (
                      <button
                        onClick={() => { setDeleteTarget(prof); document.getElementById(`menu-${prof.id}`)?.classList.add("hidden"); }}
                        className="flex w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggle */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => handleToggle(prof)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    prof.is_available ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      prof.is_available ? "translate-x-[18px]" : "translate-x-[2px]"
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500">
                  {prof.is_available ? "Disponible" : "No disponible"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <ModalInvitacion
          tenantId={tenantId ?? ""}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => { setShowInviteModal(false); fetchData(); }}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <ModalEditarProfesional
          professional={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchData(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">¿Eliminar profesional?</h3>
            <p className="mt-2 text-sm text-gray-500">
              ¿Eliminar a <span className="font-medium text-gray-700">{deleteTarget.display_name}</span>? Los turnos futuros asociados también se eliminarán.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalInvitacion({
  tenantId,
  onClose,
  onInvited,
}: {
  tenantId: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const { createInvitation } = useData();

  async function generateLink() {
    setGenerating(true);
    setError("");

    const newToken = generateToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    try {
      await createInvitation(tenantId, email.trim() || "", newToken, expiresAt.toISOString());
    } catch (err: any) {
      setError(err.message || "Error al crear invitación");
      setGenerating(false);
      return;
    }

    const link = `${window.location.origin}/invitacion?token=${newToken}`;
    setInviteLink(link);
    setGenerating(false);
    onInvited();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Invitar profesional</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email del profesional (opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="profesional@email.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
            />
          </div>

          {!inviteLink ? (
            <button
              onClick={generateLink}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              Generar link de invitación
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Vence en 48 horas</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none bg-gray-50"
                />
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent("Te invito a unirte a nuestro equipo en onClick: " + inviteLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                <Share2 className="h-4 w-4" />
                Compartir por WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalEditarProfesional({
  professional,
  onClose,
  onSaved,
}: {
  professional: ProfessionalWithUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(professional.display_name ?? "");
  const [specialty, setSpecialty] = useState(professional.specialty ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { updateProfessional } = useData();

  async function handleSave() {
    setError("");
    if (!displayName.trim()) { setError("El nombre es obligatorio."); return; }

    setSaving(true);
    try {
      await updateProfessional(professional.id, {
        display_name: displayName.trim(),
        specialty: specialty.trim() || null,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Editar perfil</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre completo</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Especialidad</label>
            <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ej: Corte y color" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
