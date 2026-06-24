import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import type { Professional, Appointment, TimeBlock, Service, Client } from "@onclick/types";
import { ChevronLeft, ChevronRight, Lock, Loader2, Users, Building2 } from "lucide-react";
import ModalCrearTurno from "../components/ModalCrearTurno";
import ModalDetalleTurno from "../components/ModalDetalleTurno";

interface AppointmentJoined extends Appointment {
  professional: Professional;
  service: Service;
  client: Client;
}

interface CellPos {
  day: number;
  slot: number;
  profIdx: number;
}

interface SlotInfo {
  time: string;
  hour: number;
  minute: number;
  date: Date;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MIN_SLOT = 15;
const SLOT_HEIGHT = 36;

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function weeksEqual(a: Date, b: Date): boolean {
  return getMonday(a).getTime() === getMonday(b).getTime();
}

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h, m };
}

function generateSlots(
  weekStart: Date,
  openTime: string,
  closeTime: string,
): { day: number; slots: SlotInfo[] }[] {
  const { h: oh, m: om } = parseTime(openTime);
  const { h: ch, m: cm } = parseTime(closeTime);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;
  const totalMinutes = closeMinutes - openMinutes;
  const slotCount = Math.max(0, Math.floor(totalMinutes / MIN_SLOT));

  const result: { day: number; slots: SlotInfo[] }[] = [];

  for (let d = 0; d < 7; d++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + d);
    const daySlots: SlotInfo[] = [];
    for (let i = 0; i < slotCount; i++) {
      const mins = openMinutes + i * MIN_SLOT;
      const slotDate = new Date(date);
      slotDate.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
      daySlots.push({
        time: formatTime(slotDate),
        hour: Math.floor(mins / 60),
        minute: mins % 60,
        date: slotDate,
      });
    }
    result.push({ day: d, slots: daySlots });
  }
  return result;
}

function dateToSlotIndex(date: Date, openTime: string): number {
  const { h: oh, m: om } = parseTime(openTime);
  const openMinutes = oh * 60 + om;
  const minutes = date.getHours() * 60 + date.getMinutes();
  return Math.floor((minutes - openMinutes) / MIN_SLOT);
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AgendaPage() {
  const navigate = useNavigate();
  const { profile, isAdmin, isProfessional } = useAuth();
  const tenantId = profile?.tenant_id;
  const { getTenantById, getProfessionals, getAppointments, getTimeBlocks, createTimeBlock } = useData();

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<AppointmentJoined[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [dragStart, setDragStart] = useState<CellPos | null>(null);
  const [dragEnd, setDragEnd] = useState<CellPos | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [clickedAppointment, setClickedAppointment] = useState<AppointmentJoined | null>(null);
  const [clickedFreeSlot, setClickedFreeSlot] = useState<{
    professional: Professional;
    date: Date;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const slotsByDay = useMemo(
    () => generateSlots(weekStart, openTime, closeTime),
    [weekStart, openTime, closeTime],
  );

  const SLOTS_PER_DAY = slotsByDay[0]?.slots.length ?? 0;

  // Fetch tenant config
  useEffect(() => {
    if (!tenantId) return;
    getTenantById(tenantId)
      .then((data) => {
        if (data) {
          setOpenTime(data.open_time);
          setCloseTime(data.close_time);
          setWorkingDays(data.working_days);
        } else {
          setDataError("No se pudo cargar la configuración.");
        }
      })
      .catch((err) => setDataError(err.message));
  }, [tenantId, getTenantById]);

  // Fetch professionals
  useEffect(() => {
    if (!tenantId) return;
    getProfessionals(tenantId)
      .then((data) => {
        if (data) setProfessionals(data);
      })
      .catch((err) => setDataError(err.message));
  }, [tenantId, getProfessionals]);

  const fetchWeekData = useCallback(async () => {
    if (!tenantId) { setLoading(false); setDataError(null); return; }
    setLoading(true);
    setDataError(null);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    try {
      const [aptData, blkData] = await Promise.all([
        getAppointments(tenantId, weekStart.toISOString(), weekEnd.toISOString()),
        getTimeBlocks(tenantId, weekStart.toISOString(), weekEnd.toISOString()),
      ]);

      setAppointments((aptData || []).filter(a => a.status !== 'cancelled') as AppointmentJoined[]);
      setTimeBlocks(blkData || []);
    } catch (e) {
      setDataError(e instanceof Error ? e.message : "Error al cargar datos");
    }
    setLoading(false);
  }, [tenantId, weekStart, getAppointments, getTimeBlocks]);

  useEffect(() => {
    fetchWeekData();
  }, [fetchWeekData]);

  // Realtime
  useEffect(() => {
    if (!tenantId || tenantId === 'demo-tenant') return;
    // We import supabase dynamically here to avoid it being used in demo mode fully,
    // or just rely on the static import if we left it. Wait, we removed the import at the top.
    // Let's re-import it safely if needed.
    import('@onclick/utils').then(({ supabase }) => {
      const channel = supabase
        .channel(`agenda-${tenantId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointments", filter: `tenant_id=eq.${tenantId}` },
          fetchWeekData,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "time_blocks", filter: `tenant_id=eq.${tenantId}` },
          fetchWeekData,
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [tenantId, fetchWeekData]);

  const goToday = () => setWeekStart(getMonday(new Date()));
  const prevWeek = () => {
    const w = new Date(weekStart);
    w.setDate(w.getDate() - 7);
    setWeekStart(w);
  };
  const nextWeek = () => {
    const w = new Date(weekStart);
    w.setDate(w.getDate() + 7);
    setWeekStart(w);
  };

  const isCurrentWeek = weeksEqual(weekStart, new Date());

  const occupiedMap = useMemo(() => {
    const map = new Map<string, AppointmentJoined>();
    for (const apt of appointments) {
      const pIdx = professionals.findIndex((p) => p.id === apt.professional_id);
      if (pIdx < 0) continue;
      const aptDate = new Date(apt.starts_at);
      const dayIdx = days.findIndex((d) => isSameDate(d, aptDate));
      if (dayIdx < 0) continue;
      const slotIdx = dateToSlotIndex(aptDate, openTime);
      const dur = apt.service?.duration_slots ?? 4;
      for (let i = 0; i < dur; i++) {
        map.set(`${dayIdx}-${pIdx}-${slotIdx + i}`, apt);
      }
    }
    return map;
  }, [appointments, professionals, days, openTime]);

  const blockedMap = useMemo(() => {
    const set = new Set<string>();
    for (const blk of timeBlocks) {
      const pIdx = professionals.findIndex((p) => p.id === blk.professional_id);
      if (pIdx < 0) continue;
      const start = new Date(blk.starts_at);
      const end = new Date(blk.ends_at);
      const dayIdx = days.findIndex((d) => isSameDate(d, start));
      if (dayIdx < 0) continue;
      const startSlot = dateToSlotIndex(start, openTime);
      const endSlot = dateToSlotIndex(end, openTime);
      for (let i = startSlot; i < endSlot; i++) {
        set.add(`${dayIdx}-${pIdx}-${i}`);
      }
    }
    return set;
  }, [timeBlocks, professionals, days, openTime]);

  const isSelected = useCallback(
    (day: number, pIdx: number, slot: number) => {
      if (!dragStart || !isDragging) return false;
      const end = dragEnd ?? dragStart;
      const minDay = Math.min(dragStart.day, end.day);
      const maxDay = Math.max(dragStart.day, end.day);
      const minProf = Math.min(dragStart.profIdx, end.profIdx);
      const maxProf = Math.max(dragStart.profIdx, end.profIdx);
      const minSlot = Math.min(dragStart.slot, end.slot);
      const maxSlot = Math.max(dragStart.slot, end.slot);
      return (
        day >= minDay &&
        day <= maxDay &&
        pIdx >= minProf &&
        pIdx <= maxProf &&
        slot >= minSlot &&
        slot <= maxSlot
      );
    },
    [dragStart, dragEnd, isDragging],
  );

  // Drag handlers
  const handleMouseDown = (day: number, pIdx: number, slot: number) => {
    if (!isAdmin() && !isProfessional()) return;
    if (isProfessional()) {
      const prof = professionals[pIdx];
      if (prof?.user_id !== profile?.id) return;
    }
    setDragStart({ day, slot, profIdx: pIdx });
    setDragEnd({ day, slot, profIdx: pIdx });
    setIsDragging(true);
  };

  const handleMouseEnterCell = (day: number, pIdx: number, slot: number) => {
    if (isDragging) {
      setDragEnd({ day, slot, profIdx: pIdx });
    }
  };

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart) {
      setIsDragging(false);
      return;
    }
    const end = dragEnd ?? dragStart;
    const isSameCell =
      dragStart.day === end.day &&
      dragStart.slot === end.slot &&
      dragStart.profIdx === end.profIdx;

    if (isSameCell) {
      const key = `${end.day}-${end.profIdx}-${end.slot}`;
      const apt = occupiedMap.get(key);
      const prof = professionals[end.profIdx];
      const cellDate = new Date(slotsByDay[end.day]?.slots[end.slot]?.date ?? days[end.day]);

      if (apt) {
        setClickedAppointment(apt);
      } else if (prof && cellDate) {
        setClickedFreeSlot({ professional: prof, date: cellDate });
      }
    } else {
      setShowBlockModal(true);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, occupiedMap, professionals, slotsByDay, days]);

  // Window-level mouseup guard
  useEffect(() => {
    const onWindowUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    window.addEventListener("mouseup", onWindowUp);
    return () => window.removeEventListener("mouseup", onWindowUp);
  }, [isDragging, handleMouseUp]);

  async function confirmBlock() {
    if (!tenantId || !dragStart || !dragEnd) return;

    const minDay = Math.min(dragStart.day, dragEnd.day);
    const minSlot = Math.min(dragStart.slot, dragEnd.slot);
    const minProf = Math.min(dragStart.profIdx, dragEnd.profIdx);
    const maxDay = Math.max(dragStart.day, dragEnd.day);
    const maxSlot = Math.max(dragStart.slot, dragEnd.slot);
    const maxProf = Math.max(dragStart.profIdx, dragEnd.profIdx);

    const blocksToInsert: { tenant_id: string; professional_id: string; starts_at: string; ends_at: string; reason: string | null }[] = [];

    for (let d = minDay; d <= maxDay; d++) {
      for (let p = minProf; p <= maxProf; p++) {
        const prof = professionals[p];
        if (!prof) continue;
        const daySlots = slotsByDay[d]?.slots;
        if (!daySlots) continue;
        const startSlotDate = daySlots[minSlot]?.date;
        const endSlotDate = daySlots[maxSlot]?.date;
        if (!startSlotDate || !endSlotDate) continue;
        const endDate = new Date(endSlotDate);
        endDate.setMinutes(endDate.getMinutes() + MIN_SLOT);

        blocksToInsert.push({
          tenant_id: tenantId,
          professional_id: prof.id,
          starts_at: startSlotDate.toISOString(),
          ends_at: endDate.toISOString(),
          reason: blockReason.trim() || null,
        });
      }
    }

    await Promise.all(blocksToInsert.map(b => createTimeBlock(b)));
    setShowBlockModal(false);
    setBlockReason("");
    fetchWeekData();
  }

  const canActOnCell = useCallback(
    (pIdx: number) => {
      if (isAdmin()) return true;
      if (isProfessional() && professionals[pIdx]?.user_id === profile?.id) return true;
      return false;
    },
    [isAdmin, isProfessional, professionals, profile?.id],
  );

  // ── Render ──

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        {dataError && <p className="mt-4 text-xs text-red-400">{dataError}</p>}
      </div>
    );
  }

  if (dataError && professionals.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md text-center">
          <p className="text-sm text-red-500">Error al cargar la agenda</p>
          <p className="mt-1 text-xs text-gray-400">{dataError}</p>
          <button
            onClick={fetchWeekData}
            className="mt-4 rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-sm text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">No hay un negocio configurado para esta cuenta</p>
          <p className="mt-1 text-xs text-gray-400">
            El usuario autenticado no tiene un negocio asignado. Esto ocurre cuando no hay una fila en{" "}
            <code className="text-gray-500">public.users</code> con tu ID de auth o el <code className="text-gray-500">tenant_id</code> es nulo.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => navigate("/onboarding")}
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
            >
              Ir al onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (professionals.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay profesionales aún.</p>
          <p className="mt-1 text-xs text-gray-400">Agregá profesionales desde la sección correspondiente.</p>
        </div>
      </div>
    );
  }

  const numCols = 1 + professionals.length; // time column + professional columns
  const ROWS_PER_DAY = SLOTS_PER_DAY > 0 ? 1 + SLOTS_PER_DAY : 0;

  // Build the flat cell list
  const cells: React.ReactNode[] = [];

  // -- Header row (row 1) --
  cells.push(
    <div
      key="hdr-time"
      className="sticky top-0 z-20 border-b border-r border-gray-200 bg-[#f8fafc] px-2 py-3 text-center text-xs font-semibold uppercase text-gray-500"
      style={{ gridRow: 1, gridColumn: 1 }}
    >
      Hora
    </div>,
  );
  professionals.forEach((p, pIdx) => {
    cells.push(
      <div
        key={`hdr-${p.id}`}
        className="sticky top-0 z-20 border-b border-r border-gray-200 bg-[#f8fafc] px-2 py-3 text-center text-sm font-medium text-gray-700"
        style={{ gridRow: 1, gridColumn: pIdx + 2 }}
      >
        <div className="truncate">{p.display_name ?? "Sin nombre"}</div>
        {p.specialty && <div className="truncate text-xs text-gray-400">{p.specialty}</div>}
      </div>,
    );
  });

  // -- Body rows --
  for (let d = 0; d < 7; d++) {
    if (ROWS_PER_DAY === 0) continue;

    const dayDate = days[d];
    const wd = dayDate.getDay();
    const isWD = workingDays.includes(wd);
    const isToday = isSameDate(dayDate, new Date());
    const dayHeaderRow = 2 + d * ROWS_PER_DAY;

    // Day header (full-width row)
    cells.push(
      <div
        key={`day-hdr-${d}`}
        className={`sticky top-[52px] z-10 border-b border-r border-gray-200 px-3 py-1.5 text-xs font-semibold ${
          isToday ? "bg-blue-50 text-[#2563eb]" : "bg-gray-50 text-gray-500"
        }`}
        style={{ gridRow: dayHeaderRow, gridColumn: `1 / span ${numCols}` }}
      >
        {DAY_LABELS[wd]} {dayDate.getDate()}
        {isToday && <span className="ml-1.5 rounded-full bg-[#2563eb] px-1.5 py-0.5 text-[10px] text-white">Hoy</span>}
      </div>,
    );

    for (let s = 0; s < SLOTS_PER_DAY; s++) {
      const slot = slotsByDay[d]?.slots[s];
      if (!slot) continue;
      const row = dayHeaderRow + 1 + s;

      // Time label
      const isFirstHour = slot.minute === 0;
      cells.push(
        <div
          key={`t-${d}-${s}`}
          className="border-b border-r border-gray-100 bg-white px-1 text-center text-[10px] leading-none text-gray-400"
          style={{ gridRow: row, gridColumn: 1, minHeight: SLOT_HEIGHT, paddingTop: isFirstHour ? 2 : 8 }}
        >
          {isFirstHour ? slot.time : null}
        </div>,
      );

      for (let p = 0; p < professionals.length; p++) {
        const key = `${d}-${p}-${s}`;
        const apt = occupiedMap.get(key);
        const blocked = blockedMap.has(key);
        const selected = isSelected(d, p, s);
        const outsideHours = !isWD;
        const canClick = !outsideHours && canActOnCell(p);

        // Determine if this is the start slot of an appointment (for spanning)
        const isStartSlot = apt && s === dateToSlotIndex(new Date(apt.starts_at), openTime);

        if (apt && !isStartSlot) {
          // Continuation slot of appointment — skip rendering (explicit gridRow handles this)
          continue;
        }

        let cellContent: React.ReactNode = null;
        let cellClass = "";
        let span = 1;

        if (isStartSlot && apt) {
          const duration = apt.service?.duration_slots ?? 4;
          span = duration;
          const color = apt.service?.color ?? "#3B82F6";

          cellContent = (
            <div
              className="flex h-full cursor-pointer flex-col justify-center overflow-hidden rounded-lg px-1.5 py-0.5 text-xs text-white hover:brightness-110"
              style={{ backgroundColor: color }}
              onClick={() => setClickedAppointment(apt)}
            >
              <span className="truncate font-semibold leading-tight">
                {apt.client?.full_name ?? "Cliente"}
              </span>
              <span className="truncate leading-tight opacity-90">
                {apt.service?.name ?? "Servicio"}
              </span>
            </div>
          );
          cellClass = "p-0.5 overflow-visible z-[3]";
        } else if (blocked) {
          cellContent = (
            <div className="flex h-full items-center justify-center">
              <Lock className="h-3 w-3 text-gray-300" />
            </div>
          );
          cellClass = "bg-gray-50/80";
        } else if (outsideHours) {
          cellClass = "bg-[#f1f5f9]";
        } else if (selected && canClick) {
          cellClass = "bg-blue-200 cursor-pointer";
        } else if (canClick) {
          cellClass = "bg-white hover:bg-blue-50/60 cursor-pointer";
        } else {
          cellClass = "bg-white";
        }

        cells.push(
          <div
            key={key}
            className={`border-b border-r border-gray-100 ${cellClass}`}
            style={{
              gridRow: span > 1 ? `${row} / span ${span}` : row,
              gridColumn: p + 2,
              minHeight: SLOT_HEIGHT,
            }}
            onMouseDown={() => {
              if (!blocked && !outsideHours && canClick) {
                handleMouseDown(d, p, s);
              }
            }}
            onMouseEnter={() => {
              if (!blocked && !outsideHours && canClick) {
                handleMouseEnterCell(d, p, s);
              }
            }}
          >
            {cellContent}
          </div>,
        );
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Navigation */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              isCurrentWeek
                ? "border-[#2563eb] bg-[#2563eb] text-white"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Hoy
          </button>
          <button
            onClick={nextWeek}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-semibold text-gray-700">
            {days[0]?.toLocaleDateString("es-AR", { day: "numeric", month: "long" })} –{" "}
            {days[6]?.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={formatDate(weekStart)}
            onChange={(e) => {
              if (e.target.value) {
                setWeekStart(getMonday(new Date(e.target.value)));
              }
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
          />
        </div>
      </div>

      {/* Grid */}
      <div
        className={`flex-1 overflow-auto rounded-xl border border-gray-200 bg-white ${isDragging ? "select-none" : ""}`}
        ref={gridRef}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `70px repeat(${professionals.length}, 160px)`,
          }}
        >
          {cells}
        </div>
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Bloquear rango</h3>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              {dragStart && dragEnd && (() => {
                const s = dragStart;
                const e = dragEnd;
                const startSlot = slotsByDay[s.day]?.slots[s.slot];
                const endSlot = slotsByDay[e.day]?.slots[e.slot];
                if (!startSlot || !endSlot) return "";
                const endDate = new Date(endSlot.date);
                endDate.setMinutes(endDate.getMinutes() + MIN_SLOT);
                return `${startSlot.date.toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}, ${startSlot.time} – ${formatTime(endDate)}`;
              })()}
            </p>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Motivo (opcional)"
              rows={2}
              className="mb-6 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-200"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBlock}
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
              >
                Confirmar bloqueo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment detail modal */}
      {clickedAppointment && (
        <ModalDetalleTurno
          isOpen={!!clickedAppointment}
          onClose={() => setClickedAppointment(null)}
          appointment={clickedAppointment}
          isOwn={clickedAppointment.professional?.user_id === profile?.id}
          isAdmin={isAdmin()}
          onUpdated={fetchWeekData}
        />
      )}

      {/* New appointment modal */}
      {clickedFreeSlot && (
        <ModalCrearTurno
          isOpen={!!clickedFreeSlot}
          onClose={() => setClickedFreeSlot(null)}
          defaultDate={clickedFreeSlot.date}
          defaultTime={formatTime(clickedFreeSlot.date)}
          defaultProfessionalId={clickedFreeSlot.professional.id}
          professionals={professionals}
          tenantId={tenantId ?? ""}
          onCreated={fetchWeekData}
        />
      )}
    </div>
  );
}
