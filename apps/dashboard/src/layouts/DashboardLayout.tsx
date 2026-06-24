import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Calendar,
  Scissors,
  Users,
  BarChart2,
  Settings,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  AlertTriangle,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import type { Tenant, Subscription } from "@onclick/types";

interface NavItem {
  path: string;
  label: string;
  icon: typeof Calendar;
  roles: ("admin" | "professional")[];
}

const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", label: "Agenda", icon: Calendar, roles: ["admin", "professional"] },
  { path: "/dashboard/servicios", label: "Servicios", icon: Scissors, roles: ["admin"] },
  { path: "/dashboard/profesionales", label: "Profesionales", icon: Users, roles: ["admin"] },
  { path: "/dashboard/reportes", label: "Reportes", icon: BarChart2, roles: ["admin", "professional"] },
  { path: "/dashboard/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { getTenantById, getSubscription } = useData();

  const [collapsed, setCollapsed] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isExpanded = !collapsed || hovering;

  const visibleItems = NAV_ITEMS.filter(
    (item) => profile && item.roles.includes(profile.role as "admin" | "professional"),
  );

  useEffect(() => {
    if (!profile?.tenant_id) {
      setLoadingData(false);
      return;
    }

    const load = async () => {
      const [tenantData, subData] = await Promise.all([
        getTenantById(profile.tenant_id!),
        getSubscription(profile.tenant_id!),
      ]);

      if (tenantData) setTenant(tenantData);
      if (subData) setSubscription(subData);
      setLoadingData(false);
    };

    load();
  }, [profile?.tenant_id, getTenantById, getSubscription]);

  const daysRemaining = tenant?.trial_ends_at
    ? Math.max(0, Math.ceil(
        (new Date(tenant.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ))
    : 0;

  const isSuspended = tenant?.status === "suspended";
  const isPastDue = subscription?.status === "past_due";
  const isBlocked = isSuspended || isPastDue;

  if (loadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#0f1729] border-t-transparent" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      {/* Blocking modal */}
      {isBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            {isSuspended && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
                  Período de prueba vencido
                </h2>
                <p className="mb-6 text-center text-sm text-gray-500">
                  Tu período de prueba gratuita finalizó. Elegí un plan para seguir usando onClick.
                </p>
                <button
                  onClick={() => navigate("/dashboard/configuracion#suscripcion")}
                  className="w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
                >
                  Elegir un plan
                </button>
              </>
            )}
            {isPastDue && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <CreditCard className="h-6 w-6 text-amber-600" />
                </div>
                <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
                  Pago pendiente
                </h2>
                <p className="mb-6 text-center text-sm text-gray-500">
                  Tu suscripción tiene un pago pendiente. Regularizá tu situación para continuar usando onClick.
                </p>
                <button
                  onClick={() => navigate("/dashboard/configuracion#suscripcion")}
                  className="w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
                >
                  Regularizar pago
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`flex flex-col bg-[#0f1729] text-white transition-all duration-200 ${
          isExpanded ? "w-56" : "w-16"
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/10 ${isExpanded ? "h-16 px-5" : "h-16 justify-center"}`}>
          {isExpanded ? (
            <span className="text-lg font-bold tracking-tight">onClick</span>
          ) : (
            <CalendarDays className="h-6 w-6 text-blue-400" />
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#2563eb] text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                } ${!isExpanded && "justify-center px-0"}`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isExpanded && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-white/10 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white ${
              !isExpanded && "justify-center px-0"
            }`}
          >
            {collapsed ? (
              <PanelRightOpen className="h-5 w-5 shrink-0" />
            ) : (
              <PanelRightClose className="h-5 w-5 shrink-0" />
            )}
            {isExpanded && <span>Contraer</span>}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Trial banner */}
        {tenant?.status === "trial" && daysRemaining > 0 && (
          <div className="flex items-center justify-between bg-amber-50 px-6 py-2.5 text-sm text-amber-800">
            <p>
              Estás en tu período de prueba gratuita. Te quedan{" "}
              <span className="font-semibold">{daysRemaining}</span>{" "}
              {daysRemaining === 1 ? "día" : "días"}. Elegí un plan para continuar.
            </p>
            <button
              onClick={() => navigate("/dashboard/configuracion#suscripcion")}
              className="whitespace-nowrap rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
            >
              Ver planes
            </button>
          </div>
        )}

        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {tenant?.name ?? "Cargando..."}
            </h2>
            <p className="text-xs text-gray-400">
              {profile?.role === "admin"
                ? "Administrador"
                : profile?.role === "professional"
                  ? "Profesional"
                  : ""}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">
                {profile?.full_name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {profile?.full_name ?? "Usuario"}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
