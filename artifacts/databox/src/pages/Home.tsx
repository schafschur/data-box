import { useState, useEffect } from "react";
import { useListCategories } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreateCategoryDialog } from "@/components/forms/CreateCategoryDialog";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Folder, CalendarDays, CalendarClock, GripVertical, MapPin } from "lucide-react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
  description: string | null;
  sortOrder: number | null;
  locationId: number | null;
  locationName: string | null;
  locationColor: string | null;
  blockId: number;
  blockTitle: string | null;
  instanceId: number;
  instanceName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
}

function UpcomingEventCard({ event }: { event: UpcomingEvent }) {
  const eventDate    = parseISO(event.date);
  const isEventToday = isToday(eventDate);
  return (
    <Link href={`/instances/${event.instanceId}#event-${event.id}`}>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border cursor-pointer transition-all hover:shadow-sm hover:border-primary/40 group",
          isEventToday ? "bg-primary/5 border-primary/20" : "bg-card border-border hover:bg-muted/20",
        )}
      >
        {/* Category dot — top-right */}
        <span
          aria-hidden
          className="absolute top-2 right-2 w-2 h-2 rounded-full opacity-50 group-hover:opacity-80 transition-opacity z-10"
          style={{ backgroundColor: event.categoryColor || "var(--primary)" }}
        />
        {/* Location triangle — bottom-right */}
        {event.locationColor && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 0,
              height: 0,
              borderLeft: "24px solid transparent",
              borderBottom: `24px solid ${event.locationColor}`,
            }}
          />
        )}
        <div className="flex items-center gap-4 p-3">
          <div
            className={cn(
              "w-12 h-12 flex flex-col items-center justify-center rounded-lg shrink-0",
              isEventToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            <span className="text-[10px] uppercase font-semibold tracking-wide leading-none mb-0.5">
              {format(eventDate, "EEE")}
            </span>
            <span className="text-xl font-serif leading-none">{format(eventDate, "d")}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium text-sm truncate transition-colors group-hover:text-primary", isEventToday && "text-primary")}>
              {event.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {event.instanceName}
              {event.blockTitle && <span className="opacity-60"> · {event.blockTitle}</span>}
            </p>
            {event.locationName && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" style={{ color: event.locationColor || "#6b7280" }} />
                <span className="text-xs font-medium truncate" style={{ color: event.locationColor || "#6b7280" }}>
                  {event.locationName}
                </span>
              </div>
            )}
          </div>
          {isEventToday && (
            <span className="text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold shrink-0">
              Today
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function SortableUpcomingEventCard({ event }: { event: UpcomingEvent }) {
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
        <UpcomingEventCard event={event} />
      </div>
    </div>
  );
}

interface UrgentTodo {
  id: number;
  text: string;
  deadline: string;
  blockId: number;
  blockTitle: string | null;
  instanceId: number;
  instanceName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
}

function UrgentTodosSection() {
  const [todos, setTodos] = useState<UrgentTodo[] | null>(null);

  useEffect(() => {
    fetch("/api/urgent-todos")
      .then((r) => r.json())
      .then(setTodos)
      .catch(() => setTodos([]));
  }, []);

  if (todos === null) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Deadlines</h2>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (todos.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Deadlines
        </h2>
      </div>

      <div className="space-y-2">
        {todos.map((todo) => {
          const deadline    = parseISO(todo.deadline);
          const dueTodayV   = isToday(deadline);
          const dueTomorrow = isTomorrow(deadline);
          const isOverdue   = !dueTodayV && isPast(deadline);

          return (
            <Link key={todo.id} href={`/instances/${todo.instanceId}`}>
              <div className={cn(
                "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm group",
                isOverdue
                  ? "bg-red-50/70 border-red-200/80 hover:border-red-400/60 dark:bg-red-950/20 dark:border-red-800/50"
                  : dueTodayV
                  ? "bg-amber-50/70 border-amber-200/80 hover:border-amber-400/60 dark:bg-amber-950/20 dark:border-amber-800/50"
                  : "bg-amber-50/40 border-amber-100/60 hover:border-amber-300/60 dark:bg-amber-950/10 dark:border-amber-900/40"
              )}>
                <div className={cn(
                  "w-12 h-12 flex flex-col items-center justify-center rounded-lg shrink-0",
                  isOverdue
                    ? "bg-red-500 text-white"
                    : dueTodayV
                    ? "bg-amber-500 text-white"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                )}>
                  <span className="text-[10px] uppercase font-semibold tracking-wide leading-none mb-0.5">
                    {isOverdue ? format(deadline, "EEE") : dueTodayV ? "Today" : dueTomorrow ? "Tmrw" : format(deadline, "EEE")}
                  </span>
                  <span className="text-xl font-serif leading-none">{format(deadline, "d")}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm truncate transition-colors",
                    isOverdue
                      ? "text-red-700 dark:text-red-300 group-hover:text-red-800"
                      : "text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-300"
                  )}>
                    {todo.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {todo.instanceName}
                    {todo.blockTitle && <span className="opacity-60"> · {todo.blockTitle}</span>}
                  </p>
                </div>

                <div
                  className="w-2 h-2 rounded-full shrink-0 opacity-40 group-hover:opacity-70 transition-opacity"
                  style={{ backgroundColor: todo.categoryColor || "var(--primary)" }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingSection() {
  const [events, setEvents] = useState<UpcomingEvent[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    fetch("/api/upcoming-events")
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  const handleDragEnd = async (dragEvent: DragEndEvent) => {
    if (!events) return;
    const { active, over } = dragEvent;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((e) => e.id === active.id);
    const newIndex = sorted.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sorted, oldIndex, newIndex);
    const items = reordered.map((e, i) => ({ id: e.id, sortOrder: i }));

    setEvents(reordered.map((e, i) => ({ ...e, sortOrder: i })));

    try {
      await fetch("/api/calendar-events/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      fetch("/api/upcoming-events")
        .then((r) => r.json())
        .then(setEvents);
    }
  };

  if (events === null) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) return null;

  const sorted = [...events].sort((a, b) => {
    const aO = a.sortOrder ?? null;
    const bO = b.sortOrder ?? null;
    if (aO != null && bO != null) return aO - bO;
    if (aO != null) return -1;
    if (bO != null) return 1;
    return parseISO(a.date).getTime() - parseISO(b.date).getTime();
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming
        </h2>
        <span className="text-xs text-muted-foreground">— next 7 days</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map((event) => (
              <SortableUpcomingEventCard key={event.id} event={event} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export function Home() {
  const { data: categories, isLoading } = useListCategories();

  return (
    <AppLayout>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-serif tracking-tight text-foreground">Overview</h1>
            <p className="text-muted-foreground mt-2 text-lg">Your personal data workspace.</p>
          </div>
          <CreateCategoryDialog />
        </div>

        <UrgentTodosSection />
        <UpcomingSection />

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : categories?.length === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-lg bg-card/50">
              <h3 className="text-xl font-serif text-muted-foreground mb-4">No categories yet</h3>
              <CreateCategoryDialog />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories?.map((cat) => (
                <Link key={cat.id} href={`/categories/${cat.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer group hover-elevate">
                    <CardHeader className="relative">
                      <div
                        className="absolute top-6 right-6 w-3 h-3 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: cat.color || "var(--primary)" }}
                      />
                      <CardTitle className="font-serif text-xl flex items-center gap-2">
                        <Folder className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        {cat.name}
                      </CardTitle>
                      {cat.description && (
                        <CardDescription className="text-sm mt-2 line-clamp-2">
                          {cat.description}
                        </CardDescription>
                      )}
                      <div className="text-xs font-medium text-muted-foreground mt-4 uppercase tracking-wider">
                        {cat.instanceCount} {cat.instanceCount === 1 ? "instance" : "instances"}
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
