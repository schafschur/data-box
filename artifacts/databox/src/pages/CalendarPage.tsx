import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { format, isToday, isPast, parseISO } from "date-fns";
import { Flame, CalendarDays, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CalendarEntry {
  id: number;
  title: string;
  date: string;
  description: string | null;
  highPriority: boolean;
  blockId: number;
  instanceId: number;
  instanceName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
}

type ViewMode = "all" | "upcoming" | "past";

function hexWithOpacity(hex: string | null, opacity: number): string {
  if (!hex) return `rgba(100,100,100,${opacity})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function EventCard({ event }: { event: CalendarEntry }) {
  const [, setLocation] = useLocation();
  const eventDate = parseISO(event.date);
  const isEventToday = isToday(eventDate);
  const isEventPast = isPast(eventDate) && !isEventToday;
  const isPriority = event.highPriority;
  const color = event.categoryColor || "#6b7280";

  const handleClick = () => setLocation(`/instances/${event.instanceId}`);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all group",
        isPriority && [
          "bg-gradient-to-r from-orange-50 via-amber-50/50 to-transparent",
          "border-orange-300 shadow-sm shadow-orange-100",
        ],
        !isPriority && isEventToday && "bg-primary/5 border-primary/20 shadow-sm",
        !isPriority && !isEventToday && "bg-card border-border hover:border-border/80",
        isEventPast && !isPriority && "opacity-55",
        isEventPast && isPriority && "opacity-70",
        "hover:shadow-md hover:-translate-y-px",
      )}
      style={
        !isPriority
          ? {
              borderLeftColor: color,
              borderLeftWidth: 3,
              boxShadow: isEventToday
                ? `0 1px 3px 0 ${hexWithOpacity(color, 0.2)}`
                : undefined,
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
            : { backgroundColor: isEventToday ? color : color, opacity: isEventPast ? 0.6 : 1 }
        }
      >
        <span className="text-[10px] uppercase font-semibold tracking-wide leading-none mb-0.5">
          {format(eventDate, "MMM")}
        </span>
        <span className="text-xl font-serif leading-none">{format(eventDate, "d")}</span>
        <span className="text-[10px] uppercase font-medium tracking-wide leading-none mt-0.5 opacity-80">
          {format(eventDate, "EEE")}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "font-medium text-sm leading-snug",
            isPriority && "font-bold text-orange-900",
          )}>
            {event.title}
          </span>
          {isPriority && (
            <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-orange-500 to-red-500 text-white shrink-0">
              <Flame className="w-2.5 h-2.5" />
              Priority
            </span>
          )}
          {isEventToday && (
            <span className={cn(
              "text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0",
              isPriority ? "bg-orange-100 text-orange-700" : "bg-primary/15 text-primary",
            )}>
              Today
            </span>
          )}
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium" style={{ color }}>{event.categoryName}</span>
          <ChevronRight className="w-3 h-3 opacity-40" />
          <span className="truncate">{event.instanceName}</span>
        </div>

        {event.description && (
          <p className={cn(
            "text-xs mt-1.5 line-clamp-2 leading-relaxed",
            isPriority ? "text-orange-700/60" : "text-muted-foreground",
          )}>
            {event.description}
          </p>
        )}
      </div>

      {/* Arrow hint on hover */}
      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 mt-2 transition-colors" />
    </button>
  );
}

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [activeCategoryIds, setActiveCategoryIds] = useState<Set<number> | null>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/all-calendar-events`)
      .then((r) => r.json())
      .then((data: CalendarEntry[]) => {
        setEvents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Build category list from events
  const categories = Array.from(
    new Map(events.map((e) => [e.categoryId, { id: e.categoryId, name: e.categoryName, color: e.categoryColor }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const toggleCategory = (id: number) => {
    setActiveCategoryIds((prev) => {
      const all = new Set(categories.map((c) => c.id));
      if (prev === null) {
        // currently showing all → deselect this one
        const next = new Set(all);
        next.delete(id);
        return next;
      }
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) return all; // re-select all if none left
      } else {
        next.add(id);
        if (next.size === all.size) return null; // all selected = null
      }
      return next;
    });
  };

  const isAllCategories = activeCategoryIds === null;

  // Filter
  const todayStr = new Date().toISOString().split("T")[0];
  const filtered = events.filter((e) => {
    if (activeCategoryIds !== null && !activeCategoryIds.has(e.categoryId)) return false;
    if (viewMode === "upcoming") return e.date >= todayStr;
    if (viewMode === "past")     return e.date < todayStr;
    return true;
  });

  // Group by "MMMM yyyy"
  const grouped = new Map<string, CalendarEntry[]>();
  for (const ev of filtered) {
    const key = format(parseISO(ev.date), "MMMM yyyy");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ev);
  }

  const todayMonthKey = format(new Date(), "MMMM yyyy");

  // Scroll to today on first load
  useEffect(() => {
    if (!loading && viewMode === "all") {
      setTimeout(() => todayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [loading]);

  const priorityCount = events.filter((e) => e.highPriority).length;

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-20">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 border-b pb-6">
          <div>
            <h1 className="text-4xl font-serif tracking-tight text-foreground flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-primary" />
              Calendar
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              All events across your workspace
            </p>
          </div>
          {priorityCount > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700 font-medium">
              <Flame className="w-4 h-4 fill-orange-400" />
              {priorityCount} high-priority event{priorityCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* View mode tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit mb-5">
          {(["all", "upcoming", "past"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
                viewMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode}
            </button>
          ))}
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
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border transition-all",
                    active
                      ? "border-transparent text-white font-medium shadow-sm"
                      : "border-border bg-card text-muted-foreground opacity-50 hover:opacity-70",
                  )}
                  style={active ? { backgroundColor: cat.color || "#6b7280" } : undefined}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: active ? "rgba(255,255,255,0.6)" : (cat.color || "#6b7280") }}
                  />
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
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl bg-card/50">
            <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-xl font-serif text-muted-foreground">No events found</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">Try changing the filter or view mode</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Array.from(grouped.entries()).map(([monthKey, monthEvents]) => {
              const isCurrentMonth = monthKey === todayMonthKey;
              return (
                <section key={monthKey}>
                  {/* Month header */}
                  <div
                    ref={isCurrentMonth && viewMode === "all" ? todayRef : undefined}
                    className="flex items-center gap-3 mb-4"
                  >
                    <h2 className={cn(
                      "text-sm font-bold uppercase tracking-widest",
                      isCurrentMonth ? "text-primary" : "text-muted-foreground",
                    )}>
                      {monthKey}
                    </h2>
                    {isCurrentMonth && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded">
                        Current
                      </span>
                    )}
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-2.5">
                    {monthEvents.map((ev) => (
                      <EventCard key={ev.id} event={ev} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
