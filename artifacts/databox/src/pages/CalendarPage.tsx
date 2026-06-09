import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  format, isToday, isPast, parseISO, isSameMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addDays,
} from "date-fns";
import { Flame, CalendarDays, ChevronRight, AlignLeft, LayoutGrid, Clock, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CalendarEntry {
  id: number;
  title: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  highPriority: boolean;
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
          ? { borderLeftColor: color, borderLeftWidth: 3, boxShadow: isEventToday ? `0 1px 3px 0 ${hexWithOpacity(color, 0.2)}` : undefined }
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
      title={`${event.title}${timeRange ? ` · ${timeRange}` : ""} · ${event.categoryName} › ${event.instanceName}`}
      className={cn(
        "w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded flex flex-col gap-0.5 transition-all",
        isPriority
          ? "bg-orange-50 border border-orange-200 text-orange-900 hover:bg-orange-100"
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

  // Index events by date — multi-day events appear on every spanned day
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
  // Sort each day's bucket:
  //   middle days (multi-day event fully covers the day) → top ("0:")
  //   start day / single-day events                      → mixed by start time ("1:")
  //   end day                                            → mixed by end time ("1:") — interleaves with other events by clock
  const dayRole = (ev: CalendarEntry, dayKey: string): string => {
    const isMulti = ev.endDate && ev.endDate !== ev.date;
    if (!isMulti) return "1:" + (ev.startTime ?? "");       // single-day: by start time
    if (ev.date === dayKey)    return "1:" + (ev.startTime ?? ""); // start day: by start time
    if (ev.endDate === dayKey) return "1:" + (ev.endTime  ?? "23:59"); // end day: mixed in by end time
    return "0:";                                             // middle day: top
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

/* ── Main page ────────────────────────────────────────────────────── */
export function CalendarPage() {
  const [events, setEvents]           = useState<CalendarEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [rangeMode, setRangeMode]     = useState<RangeMode>("all");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    () => (sessionStorage.getItem("calendarDisplayMode") as DisplayMode | null) ?? "timeline"
  );

  const setDisplayModeAndPersist = (mode: DisplayMode) => {
    sessionStorage.setItem("calendarDisplayMode", mode);
    setDisplayMode(mode);
  };
  const [activeCategoryIds, setActiveCategoryIds] = useState<Set<number> | null>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/all-calendar-events`)
      .then((r) => r.json())
      .then((data: CalendarEntry[]) => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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

  const priorityCount = events.filter((e) => e.highPriority).length;
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
                  <div className="space-y-2.5">
                    {monthEvents.map((ev) => <TimelineEventCard key={ev.id} event={ev} />)}
                  </div>
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
    </AppLayout>
  );
}
