import { useState } from "react";
import { Block, useListCalendarEvents, useCreateCalendarEvent, useDeleteCalendarEvent, getListCalendarEventsQueryKey } from "@workspace/api-client-react";
import { format, isToday, isPast, isFuture, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function CalendarBlock({ block }: { block: Block }) {
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const queryClient = useQueryClient();

  const { data: events = [] } = useListCalendarEvents(block.id, {
    query: { enabled: !!block.id, queryKey: getListCalendarEventsQueryKey(block.id) }
  });

  const createEvent = useCreateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    createEvent.mutate(
      { data: { title: newTitle, date: newDate, blockId: block.id } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey(block.id) });
          setNewTitle("");
          setNewDate("");
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteEvent.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey(block.id) });
        }
      }
    );
  };

  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No events scheduled
          </div>
        ) : (
          sortedEvents.map((event) => {
            const eventDate = parseISO(event.date);
            const isEventToday = isToday(eventDate);
            const isEventPast = isPast(eventDate) && !isEventToday;
            
            return (
              <div 
                key={event.id} 
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border group transition-all",
                  isEventToday ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card hover:border-primary/30",
                  isEventPast ? "opacity-60" : ""
                )}
              >
                <div className={cn(
                  "w-12 flex flex-col items-center justify-center rounded-md py-1",
                  isEventToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <span className="text-xs uppercase font-medium">{format(eventDate, "MMM")}</span>
                  <span className="text-lg font-serif">{format(eventDate, "d")}</span>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <h4 className={cn("font-medium truncate", isEventPast && "line-through")}>
                      {event.title}
                    </h4>
                    {isEventToday && (
                      <span className="text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{format(eventDate, "h:mm a")}</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive -mt-1 -mr-1"
                  onClick={() => handleDelete(event.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
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
          type="datetime-local"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-[200px]"
        />
        <Button type="submit" disabled={!newTitle.trim() || !newDate || createEvent.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </form>
    </div>
  );
}
