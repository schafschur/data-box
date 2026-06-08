import { useState, useEffect } from "react";
import { useListCategories } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreateCategoryDialog } from "@/components/forms/CreateCategoryDialog";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Folder, CalendarDays } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
  description: string | null;
  blockId: number;
  blockTitle: string | null;
  instanceId: number;
  instanceName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
}

function UpcomingSection() {
  const [events, setEvents] = useState<UpcomingEvent[] | null>(null);

  useEffect(() => {
    fetch("/api/upcoming-events")
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming
        </h2>
        <span className="text-xs text-muted-foreground">— next 7 days</span>
      </div>

      <div className="space-y-2">
        {events.map((event) => {
          const eventDate = parseISO(event.date);
          const isEventToday = isToday(eventDate);

          return (
            <Link
              key={event.id}
              href={`/instances/${event.instanceId}#event-${event.id}`}
            >
              <div
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm hover:border-primary/40 group",
                  isEventToday
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card border-border hover:bg-muted/20",
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 flex flex-col items-center justify-center rounded-lg shrink-0",
                    isEventToday
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <span className="text-[10px] uppercase font-semibold tracking-wide leading-none mb-0.5">
                    {format(eventDate, "EEE")}
                  </span>
                  <span className="text-xl font-serif leading-none">
                    {format(eventDate, "d")}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium text-sm truncate transition-colors group-hover:text-primary",
                      isEventToday && "text-primary",
                    )}
                  >
                    {event.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {event.instanceName}
                    {event.blockTitle && (
                      <span className="opacity-60"> · {event.blockTitle}</span>
                    )}
                  </p>
                </div>

                {isEventToday && (
                  <span className="text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold shrink-0">
                    Today
                  </span>
                )}

                <div
                  className="w-2 h-2 rounded-full shrink-0 opacity-40 group-hover:opacity-70 transition-opacity"
                  style={{ backgroundColor: event.categoryColor || "var(--primary)" }}
                />
              </div>
            </Link>
          );
        })}
      </div>
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
