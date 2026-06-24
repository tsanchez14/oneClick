import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Calendar, Scissors, Users, BarChart2, Settings, CalendarDays } from 'lucide-react';
import { DemoProvider } from '../contexts/DemoContext';
import { DemoDataProvider } from '../providers/DemoDataProvider';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Calendar;
}

const DEMO_NAV: NavItem[] = [
  { path: '/demo/dashboard', label: 'Agenda', icon: Calendar },
  { path: '/demo/dashboard/servicios', label: 'Servicios', icon: Scissors },
  { path: '/demo/dashboard/profesionales', label: 'Profesionales', icon: Users },
  { path: '/demo/dashboard/reportes', label: 'Reportes', icon: BarChart2 },
  { path: '/demo/dashboard/configuracion', label: 'Configuración', icon: Settings },
];

function DemoBanner() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm text-white shadow-sm shrink-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
          DEMO
        </span>
        <span className="font-medium">
          Estás en modo demo — Los datos no se guardan.{' '}
          <span className="hidden sm:inline opacity-80">¿Listo para empezar?</span>
        </span>
      </div>
      <button
        onClick={() => navigate('/register')}
        className="whitespace-nowrap rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
      >
        Registrarme gratis →
      </button>
    </div>
  );
}

function DemoLayoutInner() {
  const [collapsed, setCollapsed] = React.useState(true);
  const [hovering, setHovering] = React.useState(false);
  const isExpanded = !collapsed || hovering;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8fafc]">
      {/* Permanent Demo Banner — cannot be closed */}
      <DemoBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className={`flex flex-col bg-[#0f1729] text-white transition-all duration-200 shrink-0 ${
            isExpanded ? 'w-56' : 'w-16'
          }`}
        >
          {/* Logo */}
          <div className={`flex items-center border-b border-white/10 ${isExpanded ? 'h-16 px-5' : 'h-16 justify-center'}`}>
            {isExpanded ? (
              <span className="text-lg font-bold tracking-tight">onClick</span>
            ) : (
              <CalendarDays className="h-6 w-6 text-blue-400" />
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {DEMO_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/demo/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#2563eb] text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  } ${!isExpanded && 'justify-center px-0'}`
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
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:bg-white/10 hover:text-white ${
                !isExpanded && 'justify-center px-0'
              }`}
            >
              {isExpanded ? '← Contraer' : '→'}
            </button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Barber Shop Demo</h2>
              <p className="text-xs text-gray-400">Administrador</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">
                D
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-900">Demo User</p>
                <p className="text-xs text-gray-400">demo@onclick.com</p>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default function DemoLayout() {
  return (
    <DemoProvider>
      <DemoDataProvider>
        <DemoLayoutInner />
      </DemoDataProvider>
    </DemoProvider>
  );
}
