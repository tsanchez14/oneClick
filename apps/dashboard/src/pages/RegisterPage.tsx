import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Mail, Lock, User, AlertCircle, Check } from "lucide-react";
import { supabase } from "@onclick/utils";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Completá todos los campos.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    // 1. Sign up with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setSubmitting(false);

      if (signUpError.message.includes("already registered")) {
        setError("Este email ya está registrado.");
      } else {
        setError(signUpError.message);
      }
      return;
    }

    const userId = data.user?.id ?? data.session?.user?.id;
    if (!userId) {
      setSubmitting(false);
      setError("Error al crear la cuenta. Si tenés confirmación de email habilitada, revisá tu bandeja de entrada.");
      return;
    }

    // 2. Create tenant directly
    const slug = fullName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .insert({
        name: fullName,
        slug,
        email,
        status: "trial",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (tenantErr || !tenant) {
      setSubmitting(false);
      setError("Error al crear el negocio: " + (tenantErr?.message ?? "error desconocido"));
      return;
    }

    // 3. Create public.users entry
    const { error: userErr } = await supabase.from("users").insert({
      id: userId,
      tenant_id: tenant.id,
      role: "admin",
      full_name: fullName || null,
    });

    setSubmitting(false);

    if (userErr) {
      // Rollback tenant
      await supabase.from("tenants").delete().eq("id", tenant.id);
      setError("Error al configurar tu negocio: " + userErr.message);
      return;
    }

    // 4. Create professional entry so the admin appears in the agenda
    const { error: profErr } = await supabase.from("professionals").insert({
      tenant_id: tenant.id,
      user_id: userId,
      display_name: fullName,
      is_available: true,
    });

    if (profErr) {
      await supabase.from("users").delete().eq("id", userId);
      await supabase.from("tenants").delete().eq("id", tenant.id);
      setError("Error al configurar tu negocio: " + profErr.message);
      return;
    }

    // Refresh profile so onboarding can read tenant_id
    await refreshProfile();

    navigate("/onboarding");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-blue-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">onClick</h1>
          <p className="mt-1 text-sm text-blue-200">
            Creá tu cuenta gratis por 14 días
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-8 shadow-xl"
        >
          <h2 className="mb-6 text-xl font-semibold text-navy-900">
            Registrarse
          </h2>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="fullName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
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
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
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

          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
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

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <Check className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí la contraseña"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-900 disabled:opacity-60"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {submitting ? "Creando cuenta…" : "Crear cuenta gratis"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            ¿Ya tenés cuenta?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:underline"
            >
              Iniciá sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
