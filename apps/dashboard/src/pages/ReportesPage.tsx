import { useState, useEffect, useMemo, useCallback } from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import type { Appointment, Service, Professional } from "@onclick/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Loader2, Calendar } from "lucide-react";

const PIE_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#ea580c",
  "#16a34a", "#0d9488", "#ca8a04", "#dc2626",
  "#0891b2", "#4f46e5",
];

interface AppointmentWithJoins extends Appointment {
  service: Pick<Service, "name" | "price"> | null;
  professional: Pick<Professional, "display_name"> | null;
}

type SortKey = "professional" | "total" | "top_service" | "revenue";
type SortDir = "asc" | "desc";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function dayName(dateStr: string): string {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return days[new Date(dateStr).getDay()];
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function ReportesPage() {
  const { profile, user, isAdmin } = useAuth();
  const tenantId = profile?.tenant_id;
  const userId = user?.id;
  const { getAppointments, getProfessionals } = useData();

  // ── Date filter ──
  const [from, setFrom] = useState(() => startOfMonth());
  const [to, setTo] = useState(() => endOfToday());
  const [customFrom, setCustomFrom] = useState(formatDate(startOfMonth()));
  const [customTo, setCustomTo] = useState(formatDate(endOfToday()));

  // ── Data ──
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentWithJoins[]>([]);
  const [professionalId, setProfessionalId] = useState<string | null>(null);

  // ── Sorting ──
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Fetch professional id for non-admin ──
  useEffect(() => {
    if (isAdmin() || !userId || !tenantId) {
      setProfessionalId(null);
      return;
    }
    getProfessionals(tenantId).then(profs => {
      const mine = profs.find(p => p.user_id === userId);
      setProfessionalId(mine?.id ?? null);
    });
  }, [userId, tenantId, isAdmin, getProfessionals]);

  // ── Fetch appointments ──
  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    const all = await getAppointments(tenantId, from.toISOString(), to.toISOString());
    let filtered = all as unknown as AppointmentWithJoins[];
    if (!isAdmin() && professionalId) {
      filtered = filtered.filter(a => a.professional_id === professionalId);
    }
    setAppointments(filtered);
    setLoading(false);
  }, [tenantId, from, to, isAdmin, professionalId, getAppointments]);

  useEffect(() => {
    if (tenantId && (isAdmin() || professionalId !== null)) {
      fetchData();
    }
  }, [fetchData, tenantId, isAdmin, professionalId]);

  // ── Quick date presets ──
  function setQuickRange(label: string) {
    let f: Date, t: Date;
    if (label === "week") {
      f = startOfWeek();
      t = endOfToday();
    } else if (label === "month") {
      f = startOfMonth();
      t = endOfToday();
    } else {
      f = startOfMonthsAgo(3);
      t = endOfToday();
    }
    setFrom(f);
    setTo(t);
    setCustomFrom(formatDate(f));
    setCustomTo(formatDate(t));
  }

  function applyCustomRange() {
    setFrom(new Date(customFrom + "T00:00:00"));
    setTo(new Date(customTo + "T23:59:59"));
  }

  // ── Derived metrics ──
  const metrics = useMemo(() => {
    const confirmed = appointments.filter((a) => a.status === "confirmed");
    const total = appointments.filter((a) => a.status === "confirmed" || a.status === "no_show");
    const cancelled = appointments.filter((a) => a.status === "cancelled");
    const uniqueClients = new Set(total.map((a) => a.client_id)).size;
    const revenue = confirmed.reduce((sum, a) => sum + (a.service?.price ?? 0), 0);

    return { total: total.length, cancelled: cancelled.length, uniqueClients, revenue };
  }, [appointments]);

  // ── Bar chart: appointments by day ──
  const barData = useMemo(() => {
    const map = new Map<string, number>();
    const active = appointments.filter((a) => a.status === "confirmed" || a.status === "no_show");

    for (const a of active) {
      const key = a.starts_at.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([date, count]) => ({
      date: date.slice(5),
      day: dayName(date),
      turnos: count,
    }));
  }, [appointments]);

  // ── Pie chart: distribution by service ──
  const pieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    const active = appointments.filter((a) => a.status === "confirmed" || a.status === "no_show");

    for (const a of active) {
      const name = a.service?.name ?? "Sin servicio";
      const entry = map.get(name) ?? { name, value: 0 };
      entry.value++;
      map.set(name, entry);
    }

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [appointments]);

  // ── Performance by professional (admin only) ──
  const perfData = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; total: number; services: Map<string, number>; revenue: number }
    >();
    const active = appointments.filter((a) => a.status === "confirmed" || a.status === "no_show");

    for (const a of active) {
      const pid = a.professional_id;
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: a.professional?.display_name ?? "Sin nombre",
          total: 0,
          services: new Map(),
          revenue: 0,
        });
      }
      const entry = map.get(pid)!;
      entry.total++;
      const sname = a.service?.name ?? "Sin servicio";
      entry.services.set(sname, (entry.services.get(sname) ?? 0) + 1);
      if (a.status === "confirmed") {
        entry.revenue += a.service?.price ?? 0;
      }
    }

    return Array.from(map.values()).map((e) => ({
      id: e.id,
      professional: e.name,
      total: e.total,
      top_service: Array.from(e.services.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
      revenue: formatCurrency(e.revenue),
      revenueRaw: e.revenue,
    }));
  }, [appointments]);

  // ── Sorting handler ──
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedPerf = useMemo(() => {
    if (!isAdmin()) return [];
    return [...perfData].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "professional") cmp = a.professional.localeCompare(b.professional);
      else if (sortKey === "total") cmp = a.total - b.total;
      else if (sortKey === "top_service") cmp = a.top_service.localeCompare(b.top_service);
      else if (sortKey === "revenue") cmp = a.revenueRaw - b.revenueRaw;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [perfData, sortKey, sortDir, isAdmin]);

  function SortArrow({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-gray-600">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  // ── Render ──
  return (
    <div className="flex h-full flex-col">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">
        Reportes {!isAdmin() && "— Mis métricas"}
      </h1>

      {/* ── Filters ── */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <button
          onClick={() => setQuickRange("week")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Esta semana
        </button>
        <button
          onClick={() => setQuickRange("month")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Este mes
        </button>
        <button
          onClick={() => setQuickRange("3months")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Últimos 3 meses
        </button>

        <div className="ml-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
          />
          <span className="text-sm text-gray-500">a</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
          />
          <button
            onClick={applyCustomRange}
            className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1d4ed8]"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard label="Turnos" value={metrics.total} />
            <SummaryCard label="Cancelados" value={metrics.cancelled} />
            <SummaryCard label="Clientes" value={metrics.uniqueClients} />
            <SummaryCard label="Ingresos" value={formatCurrency(metrics.revenue)} />
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* BarChart */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-800">Turnos por día</h2>
              {barData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Sin datos en el período</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                      }}
                      labelFormatter={(label) => `Fecha: ${label}`}
                    />
                    <Bar dataKey="turnos" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* PieChart */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-800">Distribución por servicio</h2>
              {pieData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Sin datos en el período</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={40}
                      stroke="none"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                      }}
                      formatter={(value) => [`${value} turnos`, null]}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-sm text-gray-700">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Performance table (admin only) ── */}
          {isAdmin() && (
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-800">Rendimiento por profesional</h2>
              </div>
              {sortedPerf.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">Sin datos en el período</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
                        <th
                          className="cursor-pointer px-5 py-3 hover:text-gray-700"
                          onClick={() => toggleSort("professional")}
                        >
                          Profesional <SortArrow k="professional" />
                        </th>
                        <th
                          className="cursor-pointer px-5 py-3 hover:text-gray-700"
                          onClick={() => toggleSort("total")}
                        >
                          Turnos realizados <SortArrow k="total" />
                        </th>
                        <th
                          className="cursor-pointer px-5 py-3 hover:text-gray-700"
                          onClick={() => toggleSort("top_service")}
                        >
                          Servicio + solicitado <SortArrow k="top_service" />
                        </th>
                        <th
                          className="cursor-pointer px-5 py-3 hover:text-gray-700"
                          onClick={() => toggleSort("revenue")}
                        >
                          Ingresos estimados <SortArrow k="revenue" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPerf.map((row) => (
                        <tr key={row.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-3 font-medium text-gray-900">{row.professional}</td>
                          <td className="px-5 py-3 text-gray-700">{row.total}</td>
                          <td className="px-5 py-3 text-gray-700">{row.top_service}</td>
                          <td className="px-5 py-3 text-gray-700">{row.revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
