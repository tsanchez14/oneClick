import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@onclick/utils";
import type { Invitation } from "@onclick/types";
import { Loader2, AlertCircle, Check, UserPlus, Mail, Lock, User } from "lucide-react";

export default function InvitacionPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Link de invitación inválido. No se encontró el token.");
      setValidating(false);
      return;
    }

    supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single()
      .then(({ data, error: err }) => {
        setValidating(false);
        if (err || !data) {
          setError("Link de invitación inválido o expirado.");
          return;
        }
        if (data.used_at) {
          setError("Este link ya fue usado.");
          return;
        }
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError("Este link de invitación expiró. Solicitá uno nuevo al administrador.");
          return;
        }
        setInvitation(data);
        if (data.email) setEmail(data.email);
      });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Completá todos los campos.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSubmitting(true);

    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpErr) {
      setSubmitting(false);
      setError(signUpErr.message);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setSubmitting(false);
      setError("Error al crear la cuenta. Intentá de nuevo.");
      return;
    }

    // Create public.users entry
    const { error: userErr } = await supabase.from("users").insert({
      id: userId,
      tenant_id: invitation!.tenant_id,
      role: "professional",
      full_name: fullName.trim(),
    });

    if (userErr) {
      setSubmitting(false);
      setError(userErr.message);
      return;
    }

    // Create professional entry
    const { error: profErr } = await supabase.from("professionals").insert({
      tenant_id: invitation!.tenant_id,
      user_id: userId,
      display_name: fullName.trim(),
      is_available: true,
    });

    if (profErr) {
      await supabase.from("users").delete().eq("id", userId);
      setSubmitting(false);
      setError(profErr.message);
      return;
    }

    // Mark invitation as used
    await supabase
      .from("invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invitation!.id);

    setSubmitting(false);
    setDone(true);
  }

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-blue-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-blue-900 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Invitación inválida</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-blue-900 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <Check className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">¡Registro completado!</h2>
          <p className="text-sm text-gray-500">
            Ya forms parte del equipo. Iniciá sesión para acceder al dashboard.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-[#2563eb] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-blue-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">onClick</h1>
          <p className="mt-1 text-sm text-blue-200">Te invitaron a unirte a un equipo</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-xl">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Completá tu registro</h2>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
              Nombre completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {submitting ? "Registrando…" : "Registrarme"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            ¿Ya tenés cuenta?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
