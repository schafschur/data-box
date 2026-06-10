import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  format, isToday, isPast, parseISO, isSameMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addDays,
} from "date-fns";
import {
  Flame, CalendarDays, ChevronRight, AlignLeft, LayoutGrid,
  Clock, CalendarRange, GripVertical, MapPin, X, Plus, Trash2, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Location {
  id: number;
  name: string;
  color: string;
}

interface CalendarEntry {
  id: number;
  title: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  highPriority: boolean;
  sortOrder: number | null;
  locationId: number | null;
  locationName: string | null;
  locationColor: string | null;
  blockId: number;
  instanceId: number;
  instanceName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
}

type RangeMode   = "all" | "upcoming" | "past";
type DisplayMode = "timeline" | "grid";

function hexWithOpacity(hex: string | null, opacity: number): string {
  if (!hex) return `rgba(100,100,100,${opacity})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function fmt12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function fmtTimeRange(s?: string | null, e?: string | null): string | null {
  if (!s) return null;
  return e ? `${fmt12(s)} – ${fmt12(e)}` : fmt12(s);
}

function fmtDateRange(date: string, endDate?: string | null): string {
  const start = parseISO(date);
  if (!endDate || endDate === date) return format(start, "EEEE, MMM d, yyyy");
  const end = parseISO(endDate);
  return format(start, "yyyy") === format(end, "yyyy")
    ? `${format(start, "EEE, MMM d")} – ${format(end, "EEE, MMM d, yyyy")}`
    : `${format(start, "EEE, MMM d, yyyy")} – ${format(end, "EEE, MMM d, yyyy")}`;
}

function LocationBadge({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <MapPin className="w-3 h-3 shrink-0" style={{ color }} />
      <span className="text-xs font-medium" style={{ color }}>{name}</span>
    </div>
  );
}

/* ── Timeline event card ──────────────────────────────────────────── */
function TimelineEventCard({ event }: { event: CalendarEntry }) {
  const [, setLocation] = useLocation();
  const eventDate    = parseISO(event.date);
  const endDate      = event.endDate ? parseISO(event.endDate) : eventDate;
  const isEventToday = isToday(eventDate);
  const isEventPast  = isPast(endDate) && !isEventToday;
  const isPriority   = event.highPriority;
  const color        = event.categoryColor || "#6b7280";
  const isMultiDay   = !!event.endDate && event.endDate !== event.date;
  const timeRange    = fmtTimeRange(event.startTime, event.endTime);

  return (
    <button
      onClick={() => setLocation(`/instances/${event.instanceId}`)}
      className={cn(
        "w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all group",
        isPriority && "bg-gradient-to-r from-orange-50 via-amber-50/50 to-transparent border-orange-300 shadow-sm shadow-orange-100",
        !isPriority && isEventToday && "bg-primary/5 border-primary/20 shadow-sm",
        !isPriority && !isEventToday && "bg-card border-border hover:border-border/80",
        isEventPast && !isPriority && "opacity-55",
        isEventPast && isPriority  && "opacity-70",
        "hover:shadow-md hover:-translate-y-px",
      )}
      style={
        !isPriority
          ? {
              borderLeftColor: color,
              borderLeftWidth: 3,
              boxShadow: isEventToday ? `0 1px 3px 0 ${hexWithOpacity(color, 0.2)}` : undefined,
              ...(event.locationColor ? { background: `linear-gradient(to left, ${event.locationColor} 35%, white 100%)` } : {}),
            }
          : { borderLeftWidth: 3, borderLeftColor: "rgb(249,115,22)" }
      }
    >
      {/* Date badge */}
      <div
        className="w-12 flex flex-col items-center justify-center rounded-lg py-1.5 shrink-0 text-white"
        style={
          isPriority
            ? { background: "linear-gradient(to bottom, #f97316, #ef4444)" }
            : { backgroundColor: color, opacity: isEventPast ? 0.6 : 1 }
        }
      >
        <span className="text-[10px] uppercase font-semibold tracking-wide leading-none mb-0.5">{format(eventDate, "MMM")}</span>
        <span className="text-xl font-serif leading-none">{format(eventDate, "d")}</span>
        <span className="text-[10px] uppercase font-medium tracking-wide leading-none mt-0.5 opacity-80">{format(eventDate, "EEE")}</span>
        {isMultiDay && <CalendarRange className="w-2.5 h-2.5 mt-0.5 opacity-70" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("font-medium text-sm leading-snug", isPriority && "font-bold text-orange-900")}>
            {event.title}
          </span>
          {isPriority && (
            <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-orange-500 to-red-500 text-white shrink-0">
              <Flame className="w-2.5 h-2.5" /> Priority
            </span>
          )}
          {isEventToday && (
            <span className={cn("text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0", isPriority ? "bg-orange-100 text-orange-700" : "bg-primary/15 text-primary")}>
              Today
            </span>
          )}
        </div>

        {/* Date range */}
        <div className={cn("flex items-center gap-1 mt-0.5 text-xs", isPriority ? "text-orange-700/70" : "text-muted-foreground")}>
          {isMultiDay && <CalendarRange className="w-3 h-3 opacity-60 shrink-0" />}
          <span>{fmtDateRange(event.date, event.endDate)}</span>
        </div>

        {/* Time range */}
        {timeRange && (
          <div className={cn("flex items-center gap-1 mt-0.5 text-xs", isPriority ? "text-orange-700/60" : "text-muted-foreground")}>
            <Clock className="w-3 h-3 opacity-60 shrink-0" />
            <span>{timeRange}</span>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="font-medium" style={{ color }}>{event.categoryName}</span>
          <ChevronRight className="w-3 h-3 opacity-40" />
          <span className="truncate">{event.instanceName}</span>
        </div>

        {/* Location badge */}
        {event.locationName && (
          <LocationBadge name={event.locationName} color={event.locationColor || "#6b7280"} />
        )}

        {event.description && (
          <p className={cn("text-xs mt-1 line-clamp-2 leading-relaxed", isPriority ? "text-orange-700/60" : "text-muted-foreground")}>
            {event.description}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 mt-2 transition-colors" />
    </button>
  );
}

/* ── Sortable wrapper for timeline cards ──────────────────────────── */
function SortableTimelineEventCard({ event }: { event: CalendarEntry }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: event.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/drag flex items-stretch gap-1">
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-5 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-30 hover:!opacity-70 touch-none text-muted-foreground transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <TimelineEventCard event={event} />
      </div>
    </div>
  );
}

/* ── Grid: compact event pill inside a day cell ───────────────────── */
function GridEventItem({ event }: { event: CalendarEntry }) {
  const [, setLocation] = useLocation();
  const isPriority = event.highPriority;
  const color      = event.categoryColor || "#6b7280";
  const timeRange  = fmtTimeRange(event.startTime, event.endTime);
  const isMultiDay = !!event.endDate && event.endDate !== event.date;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setLocation(`/instances/${event.instanceId}`); }}
      title={`${event.title}${timeRange ? ` · ${timeRange}` : ""}${event.locationName ? ` · 📍 ${event.locationName}` : ""} · ${event.categoryName} › ${event.instanceName}`}
      className={cn(
        "w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded flex flex-col gap-0.5 transition-all",
        isPriority
          ? "bg-orange-50 border border-orange-200 text-orange-900 hover:bg-orange-100"
          : isMultiDay
          ? "bg-background border border-border hover:border-primary/30 hover:shadow-sm text-foreground"
          : "hover:bg-muted/80 text-foreground",
      )}
      style={
        isPriority ? undefined : { borderLeft: `2px solid ${color}`, paddingLeft: "5px" }
      }
    >
      <div className="flex items-center gap-1">
        {isPriority
          ? <Flame className="w-2.5 h-2.5 text-orange-500 fill-orange-400 shrink-0" />
          : <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-px" style={{ backgroundColor: color }} />
        }
        <span className="truncate font-medium">{event.title}</span>
        {isMultiDay && <CalendarRange className="w-2.5 h-2.5 shrink-0 opacity-50" />}
        {event.locationName && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: event.locationColor || "#6b7280" }}
          />
        )}
      </div>
      {timeRange && (
        <div className={cn("flex items-center gap-0.5 pl-3", isPriority ? "text-orange-600/70" : "text-muted-foreground")}>
          <Clock className="w-2 h-2 shrink-0" />
          <span className="text-[10px]">{timeRange}</span>
        </div>
      )}
    </button>
  );
}

/* ── Grid: one week row ───────────────────────────────────────────── */
function WeekRow({ weekStart, monthDate, eventsByDate }: {
  weekStart: Date;
  monthDate: Date;
  eventsByDate: Map<string, CalendarEntry[]>;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      {days.map((day, idx) => {
        const dayKey    = format(day, "yyyy-MM-dd");
        const inMonth   = isSameMonth(day, monthDate);
        const todayFlag = isToday(day);
        const pastFlag  = isPast(day) && !todayFlag;
        const dayEvents = eventsByDate.get(dayKey) ?? [];

        return (
          <div
            key={dayKey}
            className={cn(
              "min-h-[90px] flex flex-col p-1.5 gap-1 transition-colors",
              idx !== 6 && "border-r border-border",
              !inMonth && "bg-muted/20",
              todayFlag && "bg-primary/5",
              pastFlag && inMonth && "opacity-60",
            )}
          >
            <div className={cn(
              "flex flex-col items-center justify-center rounded-md py-0.5 mb-0.5",
              todayFlag && "bg-primary text-primary-foreground",
              !todayFlag && !inMonth && "opacity-40",
            )}>
              <span className={cn("text-[9px] uppercase font-semibold tracking-wider leading-none", todayFlag ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {format(day, "EEE")}
              </span>
              <span className={cn("text-sm font-serif leading-tight", todayFlag ? "text-primary-foreground font-bold" : inMonth ? "text-foreground" : "text-muted-foreground")}>
                {format(day, "d")}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 flex-1">
              {dayEvents.map((ev) => (
                <GridEventItem key={`${ev.id}-${dayKey}`} event={ev} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Grid: full month section ─────────────────────────────────────── */
function MonthGrid({ monthKey, events, isCurrentMonth, todayRef }: {
  monthKey: string;
  events: CalendarEntry[];
  isCurrentMonth: boolean;
  todayRef?: React.RefObject<HTMLDivElement>;
}) {
  const monthDate  = new Date(monthKey + "-01");
  const monthStart = startOfMonth(monthDate);
  const monthEnd   = endOfMonth(monthDate);
  const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const lastWeekEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 });

  const allDays = eachDayOfInterval({ start: firstWeekStart, end: lastWeekEnd });
  const weeks: Date[] = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays[i]);

  const eventsByDate = new Map<string, CalendarEntry[]>();
  for (const ev of events) {
    const start = parseISO(ev.date);
    const end   = ev.endDate ? parseISO(ev.endDate) : start;
    const days  = eachDayOfInterval({ start, end });
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push(ev);
    }
  }
  const dayRole = (ev: CalendarEntry, dayKey: string): string => {
    const isMulti = ev.endDate && ev.endDate !== ev.date;
    if (!isMulti) return "1:" + (ev.startTime ?? "");
    if (ev.date === dayKey)    return "1:" + (ev.startTime ?? "");
    if (ev.endDate === dayKey) return "1:" + (ev.endTime  ?? "23:59");
    return "0:";
  };
  for (const [dayKey, bucket] of eventsByDate.entries()) {
    bucket.sort((a, b) => dayRole(a, dayKey).localeCompare(dayRole(b, dayKey)));
  }

  return (
    <section>
      <div ref={isCurrentMonth ? todayRef : undefined} className="flex items-center gap-3 mb-4">
        <h2 className={cn("text-sm font-bold uppercase tracking-widest", isCurrentMonth ? "text-primary" : "text-muted-foreground")}>
          {format(monthDate, "MMMM yyyy")}
        </h2>
        {isCurrentMonth && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded">Current</span>
        )}
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{events.length} event{events.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-2">
        {weeks.map((weekStart) => (
          <WeekRow
            key={format(weekStart, "yyyy-MM-dd")}
            weekStart={weekStart}
            monthDate={monthDate}
            eventsByDate={eventsByDate}
          />
        ))}
      </div>
    </section>
  );
}

/* ── Locations manager panel ──────────────────────────────────────── */
const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#a855f7",
];
function randomColor() {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

function LocationsPanel({
  locations,
  onClose,
  onRefresh,
}: {
  locations: Location[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [newName, setNewName]   = useState("");
  const [newColor, setNewColor] = useState(() => randomColor());
  const [saving, setSaving]     = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch(`${BASE_URL}/api/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      setNewName("");
      setNewColor(randomColor());
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = async (id: number, color: string) => {
    await fetch(`${BASE_URL}/api/locations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${BASE_URL}/api/locations/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="flex-1 bg-black/20" onClick={onClose} />
      {/* Panel */}
      <div className="w-72 bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Locations</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {locations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No locations yet. Add a city below.
            </p>
          ) : (
            locations.map((loc) => (
              <div key={loc.id} className="flex items-center gap-2.5 group py-1">
                <div className="relative shrink-0">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm cursor-pointer"
                    style={{ backgroundColor: loc.color }}
                  />
                  <input
                    type="color"
                    value={loc.color}
                    onChange={(e) => handleColorChange(loc.id, e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-full"
                    title="Change color"
                  />
                </div>
                <span className="flex-1 text-sm font-medium truncate">{loc.name}</span>
                <button
                  onClick={() => handleDelete(loc.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded"
                  title="Remove location"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add form */}
        <div className="border-t px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Add location</p>
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <div className="relative shrink-0">
              <div
                className="w-7 h-7 rounded-md border border-border cursor-pointer shadow-sm"
                style={{ backgroundColor: newColor }}
              />
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Pick color"
              />
            </div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="City name"
              className="flex-1 h-8 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newName.trim() || saving}
              className="h-8 px-2.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export function CalendarPage() {
  const [events, setEvents]           = useState<CalendarEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [rangeMode, setRangeMode]     = useState<RangeMode>("all");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    () => (sessionStorage.getItem("calendarDisplayMode") as DisplayMode | null) ?? "timeline"
  );
  const [locations, setLocations]     = useState<Location[]>([]);
  const [showLocMgr, setShowLocMgr]   = useState(false);

  const setDisplayModeAndPersist = (mode: DisplayMode) => {
    sessionStorage.setItem("calendarDisplayMode", mode);
    setDisplayMode(mode);
  };
  const [activeCategoryIds, setActiveCategoryIds] = useState<Set<number> | null>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetchEvents = () => {
    fetch(`${BASE_URL}/api/all-calendar-events`)
      .then((r) => r.json())
      .then((data: CalendarEntry[]) => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchLocations = () => {
    fetch(`${BASE_URL}/api/locations`)
      .then((r) => r.json())
      .then((data: Location[]) => setLocations(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchEvents();
    fetchLocations();
  }, []);

  const handleMonthDragEnd = async (dragEvent: DragEndEvent, monthEvents: CalendarEntry[]) => {
    const { active, over } = dragEvent;
    if (!over || active.id === over.id) return;

    const oldIndex = monthEvents.findIndex((e) => e.id === active.id);
    const newIndex = monthEvents.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(monthEvents, oldIndex, newIndex);
    const items = reordered.map((e, i) => ({ id: e.id, sortOrder: i }));

    setEvents((prev) =>
      prev.map((ev) => {
        const found = items.find((s) => s.id === ev.id);
        return found ? { ...ev, sortOrder: found.sortOrder } : ev;
      }),
    );

    try {
      await fetch(`${BASE_URL}/api/calendar-events/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      fetchEvents();
    }
  };

  const categories = Array.from(
    new Map(events.map((e) => [e.categoryId, { id: e.categoryId, name: e.categoryName, color: e.categoryColor }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const toggleCategory = (id: number) => {
    setActiveCategoryIds((prev) => {
      const all = new Set(categories.map((c) => c.id));
      if (prev === null) { const next = new Set(all); next.delete(id); return next; }
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); if (next.size === 0) return all; }
      else { next.add(id); if (next.size === all.size) return null; }
      return next;
    });
  };

  const todayStr      = new Date().toISOString().split("T")[0];
  const todayMonthKey = todayStr.slice(0, 7);

  const filtered = events.filter((e) => {
    if (activeCategoryIds !== null && !activeCategoryIds.has(e.categoryId)) return false;
    const effectiveEnd = e.endDate ?? e.date;
    if (rangeMode === "upcoming") return effectiveEnd >= todayStr;
    if (rangeMode === "past")     return effectiveEnd < todayStr;
    return true;
  });

  const timelineEvents = displayMode === "timeline"
    ? filtered.filter((e) => (e.endDate ?? e.date) >= todayStr)
    : filtered;

  const groupedByMonth = new Map<string, CalendarEntry[]>();
  for (const ev of timelineEvents) {
    const key = ev.date.slice(0, 7);
    if (!groupedByMonth.has(key)) groupedByMonth.set(key, []);
    groupedByMonth.get(key)!.push(ev);
  }

  useEffect(() => {
    if (!loading && rangeMode === "all") {
      setTimeout(() => todayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [loading, displayMode]);

  const priorityCount   = events.filter((e) => e.highPriority).length;
  const isAllCategories = activeCategoryIds === null;

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-20">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 border-b pb-6">
          <div>
            <h1 className="text-4xl font-serif tracking-tight text-foreground flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-primary" />
              Calendar
            </h1>
            <p className="text-muted-foreground text-lg mt-2">All events across your workspace</p>
          </div>
          {priorityCount > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700 font-medium">
              <Flame className="w-4 h-4 fill-orange-400" />
              {priorityCount} high-priority event{priorityCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setDisplayModeAndPersist("timeline")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", displayMode === "timeline" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <AlignLeft className="w-3.5 h-3.5" /> Timeline
            </button>
            <button
              onClick={() => setDisplayModeAndPersist("grid")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", displayMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(["all", "upcoming", "past"] as RangeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setRangeMode(mode)}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize", rangeMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-border" />
          <button
            onClick={() => setShowLocMgr(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
              locations.length > 0
                ? "border-border text-foreground hover:border-primary/40 hover:bg-muted/30"
                : "border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            Locations
            {locations.length > 0 && (
              <span className="flex items-center gap-0.5 ml-0.5">
                {locations.slice(0, 5).map((loc) => (
                  <span key={loc.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: loc.color }} />
                ))}
              </span>
            )}
          </button>
        </div>

        {/* Category filter chips */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Filter:</span>
            {categories.map((cat) => {
              const active = isAllCategories || activeCategoryIds!.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border transition-all", active ? "border-transparent text-white font-medium shadow-sm" : "border-border bg-card text-muted-foreground opacity-50 hover:opacity-70")}
                  style={active ? { backgroundColor: cat.color || "#6b7280" } : undefined}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? "rgba(255,255,255,0.6)" : (cat.color || "#6b7280") }} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-8">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                {[1, 2, 3].map((j) => <div key={j} className="h-20 bg-muted/50 rounded-xl animate-pulse" />)}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl bg-card/50">
            <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-xl font-serif text-muted-foreground">No events found</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">Try changing the filter or view mode</p>
          </div>
        ) : displayMode === "timeline" ? (
          <div className="space-y-10">
            {Array.from(groupedByMonth.entries()).map(([monthKey, monthEvents]) => {
              const isCurrentMonth = monthKey === todayMonthKey;
              const label = format(new Date(monthKey + "-01"), "MMMM yyyy");
              const sorted = [...monthEvents].sort((a, b) => {
                const aO = a.sortOrder ?? null;
                const bO = b.sortOrder ?? null;
                if (aO != null && bO != null) return aO - bO;
                if (aO != null) return -1;
                if (bO != null) return 1;
                if (a.highPriority && !b.highPriority) return -1;
                if (!a.highPriority && b.highPriority) return 1;
                return parseISO(a.date).getTime() - parseISO(b.date).getTime();
              });
              return (
                <section key={monthKey}>
                  <div
                    ref={isCurrentMonth && rangeMode === "all" ? todayRef : undefined}
                    className="flex items-center gap-3 mb-4"
                  >
                    <h2 className={cn("text-sm font-bold uppercase tracking-widest", isCurrentMonth ? "text-primary" : "text-muted-foreground")}>{label}</h2>
                    {isCurrentMonth && <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded">Current</span>}
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}</span>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleMonthDragEnd(e, sorted)}
                  >
                    <SortableContext items={sorted.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2.5">
                        {sorted.map((ev) => <SortableTimelineEventCard key={ev.id} event={ev} />)}
                      </div>
                    </SortableContext>
                  </DndContext>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-10">
            {Array.from(groupedByMonth.keys()).map((monthKey) => (
              <MonthGrid
                key={monthKey}
                monthKey={monthKey}
                events={groupedByMonth.get(monthKey)!}
                isCurrentMonth={monthKey === todayMonthKey}
                todayRef={monthKey === todayMonthKey && rangeMode === "all" ? todayRef : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Location manager panel */}
      {showLocMgr && (
        <LocationsPanel
          locations={locations}
          onClose={() => setShowLocMgr(false)}
          onRefresh={() => {
            fetchLocations();
            fetchEvents();
          }}
        />
      )}
    </AppLayout>
  );
}
