import { useState, useEffect } from "react";
import {
  Block,
  CalendarEvent,
  useListCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  getListCalendarEventsQueryKey,
} from "@workspace/api-client-react";
import { format, isToday, isPast, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2, Plus, Pencil, Check, X, Flame, Clock, CalendarRange, GripVertical, MapPin,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Location {
  id: number;
  name: string;
  color: string;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateRange(date: string, endDate?: string | null): string {
  const start = parseISO(date);
  if (!endDate || endDate === date) return format(start, "EEEE, MMMM d, yyyy");
  const end = parseISO(endDate);
  if (format(start, "yyyy") === format(end, "yyyy")) {
    return `${format(start, "EEE, MMM d")} – ${format(end, "EEE, MMM d, yyyy")}`;
  }
  return `${format(start, "EEE, MMM d, yyyy")} – ${format(end, "EEE, MMM d, yyyy")}`;
}

function formatTimeRange(startTime?: string | null, endTime?: string | null): string | null {
  if (!startTime) return null;
  const s = formatTime(startTime);
  return endTime ? `${s} – ${formatTime(endTime)}` : s;
}

interface EditState {
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  description: string;
  locationId: number | null;
}

function LocationBadge({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <MapPin className="w-3 h-3 shrink-0" style={{ color }} />
      <span className="text-xs font-medium" style={{ color }}>{name}</span>
    </div>
  );
}

function EventRow({
  event,
  locations,
  onDelete,
  onSave,
  onTogglePriority,
  isDeleting,
  isSaving,
}: {
  event: CalendarEvent;
  locations: Location[];
  onDelete: () => void;
  onSave: (data: EditState) => void;
  onTogglePriority: () => void;
  isDeleting: boolean;
  isSaving: boolean;
}) {
  const [editing, setEditing]                   = useState(false);
  const [editTitle, setEditTitle]               = useState(event.title);
  const [editDate, setEditDate]                 = useState(event.date as unknown as string);
  const [editEndDate, setEditEndDate]           = useState((event.endDate as unknown as string) ?? "");
  const [editStartTime, setEditStartTime]       = useState(event.startTime ?? "");
  const [editEndTime, setEditEndTime]           = useState(event.endTime ?? "");
  const [editDescription, setEditDescription]   = useState(event.description ?? "");
  const [editLocationId, setEditLocationId]     = useState<number | null>(event.locationId ?? null);

  const eventDate    = parseISO(event.date as unknown as string);
  const isEventToday = isToday(eventDate);
  const isEventPast  = isPast(event.endDate ? parseISO(event.endDate as unknown as string) : eventDate) && !isEventToday;
  const isPriority   = !!event.highPriority;
  const isMultiDay   = !!event.endDate && event.endDate !== event.date;
  const timeRange    = formatTimeRange(event.startTime, event.endTime);

  const startEdit = () => {
    setEditTitle(event.title);
    setEditDate(event.date as unknown as string);
    setEditEndDate((event.endDate as unknown as string) ?? "");
    setEditStartTime(event.startTime ?? "");
    setEditEndTime(event.endTime ?? "");
    setEditDescription(event.description ?? "");
    setEditLocationId(event.locationId ?? null);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = () => {
    if (!editTitle.trim() || !editDate) return;
    onSave({
      title:       editTitle.trim(),
      date:        editDate,
      endDate:     editEndDate,
      startTime:   editStartTime,
      endTime:     editEndTime,
      description: editDescription.trim(),
      locationId:  editLocationId,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        id={`event-${event.id}`}
        className={cn(
          "p-4 rounded-lg border space-y-3",
          isPriority ? "bg-gradient-to-r from-orange-50 to-amber-50/40 border-orange-300"
            : isEventToday ? "bg-primary/5 border-primary/20"
            : "bg-muted/30 border-border",
        )}
      >
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Event title"
          className="w-full h-8 text-sm"
          autoFocus
        />
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">Start date</label>
            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-[148px] h-8 text-sm" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">End date <span className="normal-case">(optional)</span></label>
            <Input type="date" value={editEndDate} min={editDate} onChange={(e) => setEditEndDate(e.target.value)} className="w-[148px] h-8 text-sm" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">From <span className="normal-case">(optional)</span></label>
            <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-[120px] h-8 text-sm" />
          </div>
          <span className="text-muted-foreground text-sm pb-1">–</span>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">To <span className="normal-case">(optional)</span></label>
            <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="w-[120px] h-8 text-sm" />
          </div>
          {locations.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">Location <span className="normal-case">(optional)</span></label>
              <select
                value={editLocationId ?? ""}
                onChange={(e) => setEditLocationId(e.target.value ? Number(e.target.value) : null)}
                className="h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">None</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <Textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          className="text-sm resize-none h-16 min-h-0"
        />
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 px-2 text-muted-foreground">
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!editTitle.trim() || !editDate || isSaving} className="h-7 px-3">
            <Check className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>
    );
  }

  const locationColor = (event.locationColor as string | undefined) ?? null;
  const locationName  = (event.locationName  as string | undefined) ?? null;

  return (
    <div
      id={`event-${event.id}`}
      className={cn(
        "relative overflow-hidden flex items-start gap-4 p-4 rounded-lg border group transition-all",
        isPriority && [
          "bg-gradient-to-r from-orange-50 via-amber-50/60 to-transparent",
          "border-orange-300 border-l-[3px] border-l-orange-500 shadow-sm shadow-orange-100",
          isEventToday && "border-orange-400 shadow-md shadow-orange-200",
        ],
        !isPriority && isEventToday && "bg-primary/5 border-primary/20 shadow-sm",
        !isPriority && !isEventToday && "bg-card hover:border-primary/30",
        isEventPast && !isPriority && "opacity-60",
        isEventPast && isPriority  && "opacity-75",
      )}
    >
      {locationColor && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 0,
            height: 0,
            borderLeft: "24px solid transparent",
            borderBottom: `24px solid ${locationColor}`,
          }}
        />
      )}
      {/* Date badge */}
      <div
        className={cn(
          "w-12 flex flex-col items-center justify-center rounded-md py-1 shrink-0",
          isPriority ? "bg-gradient-to-b from-orange-500 to-red-500 text-white"
            : isEventToday ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
          isMultiDay && "relative",
        )}
      >
        <span className="text-xs uppercase font-medium">{format(eventDate, "MMM")}</span>
        <span className="text-lg font-serif">{format(eventDate, "d")}</span>
        {isMultiDay && <CalendarRange className="w-2.5 h-2.5 mt-0.5 opacity-70" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className={cn(
            "font-medium truncate",
            isPriority && "font-bold text-orange-900",
            isEventPast && !isPriority && "line-through",
          )}>
            {event.title}
          </h4>
          {isPriority && (
            <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-orange-500 to-red-500 text-white shrink-0">
              <Flame className="w-2.5 h-2.5" /> Priority
            </span>
          )}
          {isEventToday && (
            <span className={cn(
              "inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold",
              isPriority ? "bg-orange-100 text-orange-700" : "bg-primary/20 text-primary",
            )}>
              Today
            </span>
          )}
        </div>
        <div className={cn("text-sm mt-0.5 flex items-center gap-1.5", isPriority ? "text-orange-700/70" : "text-muted-foreground")}>
          {isMultiDay && <CalendarRange className="w-3 h-3 shrink-0 opacity-60" />}
          <span>{formatDateRange(event.date as unknown as string, event.endDate as unknown as string)}</span>
        </div>
        {timeRange && (
          <div className={cn("text-sm flex items-center gap-1.5 mt-0.5", isPriority ? "text-orange-700/60" : "text-muted-foreground")}>
            <Clock className="w-3 h-3 shrink-0 opacity-60" />
            <span>{timeRange}</span>
          </div>
        )}
        {event.description && (
          <div className={cn("text-sm mt-1 line-clamp-2", isPriority ? "text-orange-800/60" : "text-muted-foreground")}>
            {event.description}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 -mt-1 -mr-1">
        <Button
          variant="ghost" size="icon"
          className={cn(
            "h-7 w-7 transition-all",
            isPriority
              ? "text-orange-500 hover:text-orange-600 hover:bg-orange-50 opacity-100"
              : "text-muted-foreground hover:text-orange-500 opacity-0 group-hover:opacity-100",
          )}
          onClick={onTogglePriority}
          title={isPriority ? "Remove priority" : "Mark as high priority"}
        >
          <Flame className={cn("h-3.5 w-3.5", isPriority && "fill-orange-400")} />
        </Button>
        <Button variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={startEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SortableEventRow(props: {
  event: CalendarEvent;
  locations: Location[];
  onDelete: () => void;
  onSave: (data: EditState) => void;
  onTogglePriority: () => void;
  isDeleting: boolean;
  isSaving: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.event.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
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
        <EventRow {...props} />
      </div>
    </div>
  );
}

const LOCATION_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#a855f7",
];
function randomColor() {
  return LOCATION_COLORS[Math.floor(Math.random() * LOCATION_COLORS.length)];
}

export function CalendarBlock({ block }: { block: Block }) {
  const [newTitle, setNewTitle]           = useState("");
  const [newDate, setNewDate]             = useState("");
  const [newEndDate, setNewEndDate]       = useState("");
  const [newStartTime, setNewStartTime]   = useState("");
  const [newEndTime, setNewEndTime]       = useState("");
  const [newLocationId, setNewLocationId] = useState<number | null>(null);
  const [locations, setLocations]         = useState<Location[]>([]);
  const queryClient = useQueryClient();

  const { data: events = [] } = useListCalendarEvents(block.id, {
    query: { enabled: !!block.id, queryKey: getListCalendarEventsQueryKey(block.id) },
  });

  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data: Location[]) => setLocations(data))
      .catch(() => {});
  }, []);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey(block.id) });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    createEvent.mutate(
      {
        blockId: block.id,
        data: {
          title:      newTitle.trim(),
          date:       newDate,
          endDate:    newEndDate   || null,
          startTime:  newStartTime || null,
          endTime:    newEndTime   || null,
          locationId: newLocationId,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setNewTitle("");
          setNewDate("");
          setNewEndDate("");
          setNewStartTime("");
          setNewEndTime("");
          setNewLocationId(null);
        },
      },
    );
  };

  const handleSave = (id: number, data: EditState) => {
    updateEvent.mutate(
      {
        id,
        data: {
          title:       data.title,
          date:        data.date,
          endDate:     data.endDate   || null,
          startTime:   data.startTime || null,
          endTime:     data.endTime   || null,
          description: data.description || null,
          locationId:  data.locationId,
        },
      },
      { onSuccess: invalidate },
    );
  };

  const handleTogglePriority = (event: CalendarEvent) => {
    updateEvent.mutate(
      {
        id: event.id,
        data: {
          title:        event.title,
          date:         event.date as unknown as string,
          endDate:      event.endDate as unknown as string ?? null,
          startTime:    event.startTime   ?? null,
          endTime:      event.endTime     ?? null,
          description:  event.description ?? null,
          highPriority: !event.highPriority,
          locationId:   (event.locationId as number | undefined) ?? null,
        },
      },
      { onSuccess: invalidate },
    );
  };

  const handleDelete = (id: number) => {
    deleteEvent.mutate({ id }, { onSuccess: invalidate });
  };

  const displayEvents = [...events].sort((a, b) => {
    const aOrder = a.sortOrder ?? null;
    const bOrder = b.sortOrder ?? null;
    if (aOrder != null && bOrder != null) return aOrder - bOrder;
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;
    if (a.highPriority && !b.highPriority) return -1;
    if (!a.highPriority && b.highPriority) return 1;
    return new Date(a.date as unknown as string).getTime() - new Date(b.date as unknown as string).getTime();
  });

  const handleDragEnd = async (dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent;
    if (!over || active.id === over.id) return;

    const oldIndex = displayEvents.findIndex((e) => e.id === active.id);
    const newIndex = displayEvents.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(displayEvents, oldIndex, newIndex);

    queryClient.setQueryData(
      getListCalendarEventsQueryKey(block.id),
      reordered.map((e, i) => ({ ...e, sortOrder: i })),
    );

    try {
      await fetch("/api/calendar-events/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reordered.map((e, i) => ({ id: e.id, sortOrder: i })),
        }),
      });
    } catch {
      invalidate();
    }
  };

  return (
    <div className="space-y-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayEvents.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {displayEvents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No events scheduled
              </div>
            ) : (
              displayEvents.map((event) => (
                <SortableEventRow
                  key={event.id}
                  event={event}
                  locations={locations}
                  onDelete={() => handleDelete(event.id)}
                  onSave={(data) => handleSave(event.id, data)}
                  onTogglePriority={() => handleTogglePriority(event)}
                  isDeleting={deleteEvent.isPending}
                  isSaving={updateEvent.isPending}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      <form onSubmit={handleAdd} className="space-y-2 pt-4 border-t border-border/50">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Event title"
          className="w-full"
        />
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">Start</label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-[148px] h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">End date <span className="normal-case opacity-70">(opt)</span></label>
            <Input type="date" value={newEndDate} min={newDate} onChange={(e) => setNewEndDate(e.target.value)} className="w-[148px] h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">From <span className="normal-case opacity-70">(opt)</span></label>
            <Input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} className="w-[120px] h-9 text-sm" />
          </div>
          <span className="text-muted-foreground text-sm pb-2">–</span>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">To <span className="normal-case opacity-70">(opt)</span></label>
            <Input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} className="w-[120px] h-9 text-sm" />
          </div>
          {locations.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider pl-0.5">Location <span className="normal-case opacity-70">(opt)</span></label>
              <select
                value={newLocationId ?? ""}
                onChange={(e) => setNewLocationId(e.target.value ? Number(e.target.value) : null)}
                className="h-9 text-sm rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">None</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button
            type="submit"
            disabled={!newTitle.trim() || !newDate || createEvent.isPending}
            className="mb-0 self-end"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </form>

      {/* Locations hint */}
      {locations.length === 0 && (
        <p className="text-xs text-muted-foreground/60 text-center">
          Add locations in the <span className="font-medium">Calendar</span> page to tag events with a city.
        </p>
      )}
    </div>
  );
}

export { randomColor };
