import { useState } from "react";
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
import { Trash2, Plus, Pencil, Check, X, Flame } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface EditState {
  title: string;
  date: string;
  description: string;
}

function EventRow({
  event,
  onDelete,
  onSave,
  onTogglePriority,
  isDeleting,
  isSaving,
}: {
  event: CalendarEvent;
  onDelete: () => void;
  onSave: (data: EditState) => void;
  onTogglePriority: () => void;
  isDeleting: boolean;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);
  const [editDate, setEditDate] = useState(event.date);
  const [editDescription, setEditDescription] = useState(event.description ?? "");

  const eventDate = parseISO(event.date);
  const isEventToday = isToday(eventDate);
  const isEventPast = isPast(eventDate) && !isEventToday;
  const isPriority = !!event.highPriority;

  const startEdit = () => {
    setEditTitle(event.title);
    setEditDate(event.date);
    setEditDescription(event.description ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = () => {
    if (!editTitle.trim() || !editDate) return;
    onSave({
      title: editTitle.trim(),
      date: editDate,
      description: editDescription.trim(),
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        id={`event-${event.id}`}
        className={cn(
          "p-4 rounded-lg border space-y-3",
          isPriority
            ? "bg-gradient-to-r from-orange-50 to-amber-50/40 border-orange-300"
            : isEventToday
            ? "bg-primary/5 border-primary/20"
            : "bg-muted/30 border-border",
        )}
      >
        <div className="flex items-center gap-2">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Event title"
            className="flex-1 h-8 text-sm"
            autoFocus
          />
          <Input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="w-[150px] h-8 text-sm"
          />
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

  return (
    <div
      id={`event-${event.id}`}
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border group transition-all",
        isPriority && [
          "bg-gradient-to-r from-orange-50 via-amber-50/60 to-transparent",
          "border-orange-300 border-l-[3px] border-l-orange-500",
          "shadow-sm shadow-orange-100",
          isEventToday && "border-orange-400 shadow-md shadow-orange-200",
        ],
        !isPriority && isEventToday && "bg-primary/5 border-primary/20 shadow-sm",
        !isPriority && !isEventToday && "bg-card hover:border-primary/30",
        isEventPast && !isPriority && "opacity-60",
        isEventPast && isPriority && "opacity-75",
      )}
    >
      {/* Date badge */}
      <div
        className={cn(
          "w-12 flex flex-col items-center justify-center rounded-md py-1 shrink-0",
          isPriority
            ? "bg-gradient-to-b from-orange-500 to-red-500 text-white"
            : isEventToday
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <span className="text-xs uppercase font-medium">{format(eventDate, "MMM")}</span>
        <span className="text-lg font-serif">{format(eventDate, "d")}</span>
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
              <Flame className="w-2.5 h-2.5" />
              Priority
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
        <div className={cn("text-sm mt-0.5", isPriority ? "text-orange-700/70" : "text-muted-foreground")}>
          {format(eventDate, "EEEE, MMMM d, yyyy")}
        </div>
        {event.description && (
          <div className={cn("text-sm mt-1 line-clamp-2", isPriority ? "text-orange-800/60" : "text-muted-foreground")}>
            {event.description}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 -mt-1 -mr-1">
        {/* Priority toggle — always visible when high priority, hover-only when not */}
        <Button
          variant="ghost"
          size="icon"
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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={startEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
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

export function CalendarBlock({ block }: { block: Block }) {
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const queryClient = useQueryClient();

  const { data: events = [] } = useListCalendarEvents(block.id, {
    query: { enabled: !!block.id, queryKey: getListCalendarEventsQueryKey(block.id) },
  });

  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey(block.id) });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    createEvent.mutate(
      { blockId: block.id, data: { title: newTitle, date: newDate } },
      {
        onSuccess: () => {
          invalidate();
          setNewTitle("");
          setNewDate("");
        },
      },
    );
  };

  const handleSave = (id: number, data: EditState) => {
    updateEvent.mutate(
      { id, data: { title: data.title, date: data.date, description: data.description || null } },
      { onSuccess: invalidate },
    );
  };

  const handleTogglePriority = (event: CalendarEvent) => {
    updateEvent.mutate(
      {
        id: event.id,
        data: {
          title: event.title,
          date: event.date,
          description: event.description ?? null,
          highPriority: !event.highPriority,
        },
      },
      { onSuccess: invalidate },
    );
  };

  const handleDelete = (id: number) => {
    deleteEvent.mutate({ id }, { onSuccess: invalidate });
  };

  const sortedEvents = [...events].sort((a, b) => {
    if (a.highPriority && !b.highPriority) return -1;
    if (!a.highPriority && b.highPriority) return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No events scheduled
          </div>
        ) : (
          sortedEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onDelete={() => handleDelete(event.id)}
              onSave={(data) => handleSave(event.id, data)}
              onTogglePriority={() => handleTogglePriority(event)}
              isDeleting={deleteEvent.isPending}
              isSaving={updateEvent.isPending}
            />
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-3 pt-4 border-t border-border/50">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Event title"
          className="flex-1"
        />
        <Input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-[160px]"
        />
        <Button type="submit" disabled={!newTitle.trim() || !newDate || createEvent.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </form>
    </div>
  );
}
