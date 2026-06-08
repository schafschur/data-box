import { useGetInstanceAnalysis, getGetInstanceAnalysisQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, Calendar as CalendarIcon, Hash, Image as ImageIcon,
  MessageSquare, StickyNote, CalendarDays, FileText, CheckSquare,
  BookOpen, Users, List, FileIcon, Clock, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

function pct(num: number, total: number) {
  return total === 0 ? 0 : Math.round((num / total) * 100);
}

function formatMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
}

function formatEventDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString("default", { day: "numeric", month: "short" });
  if (diff === 0) return { label: "Today", sub: label, urgent: true };
  if (diff === 1) return { label: "Tomorrow", sub: label, urgent: true };
  if (diff <= 7) return { label: `In ${diff} days`, sub: label, urgent: false };
  return { label, sub: date.toLocaleDateString("default", { year: "numeric" }), urgent: false };
}

function relativeTime(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days  = Math.floor(ms / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const BLOCK_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  richtext: FileText,
  todo:     CheckSquare,
  calendar: CalendarIcon,
  photo:    ImageIcon,
  pdf:      FileIcon,
  contact:  Users,
  list:     List,
};

const BLOCK_COLORS: Record<string, string> = {
  richtext: "text-blue-500",
  todo:     "text-green-500",
  calendar: "text-purple-500",
  photo:    "text-orange-500",
  pdf:      "text-red-500",
  contact:  "text-pink-500",
  list:     "text-teal-500",
};

const BLOCK_BG: Record<string, string> = {
  richtext: "bg-blue-500/10",
  todo:     "bg-green-500/10",
  calendar: "bg-purple-500/10",
  photo:    "bg-orange-500/10",
  pdf:      "bg-red-500/10",
  contact:  "bg-pink-500/10",
  list:     "bg-teal-500/10",
};

function MetadataRow({ label, icon: Icon, value, total }: {
  label: string;
  icon: React.ElementType;
  value: number;
  total: number;
}) {
  const p = pct(value, total);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className="font-medium text-foreground">{value} <span className="text-muted-foreground font-normal">({p}%)</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70 transition-all duration-500"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

export function AnalysisPanel({ instanceId }: { instanceId: number }) {
  const { data: analysis, isLoading } = useGetInstanceAnalysis(instanceId, {
    query: { enabled: !!instanceId, queryKey: getGetInstanceAnalysisQueryKey(instanceId) }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!analysis) return null;

  const {
    textStats, todoStats, calendarStats, photoStats,
    blockComposition    = [],
    upcomingEventsList  = [],
    activityStats       = [],
    overdueStats        = { count: 0, items: [] },
  } = analysis;

  const keywordData = textStats.topKeywords.slice(0, 5).map(k => ({
    name: k.word,
    count: k.count,
  }));

  const monthData = (photoStats.byMonth ?? []).map(m => ({
    name: formatMonth(m.month),
    count: m.count,
  }));

  const withCaption = photoStats.withCaption ?? 0;
  const withNotes   = photoStats.withNotes   ?? 0;
  const withDate    = photoStats.withDate    ?? 0;
  const earliestDate = photoStats.earliestDate ?? null;
  const latestDate   = photoStats.latestDate   ?? null;

  const hasPhotoBlock = photoStats.blockCount > 0;
  const hasPhotos     = photoStats.totalPhotos > 0;
  const hasCalendar   = calendarStats.blockCount > 0;
  const hasOverdue    = overdueStats.count > 0;

  return (
    <div className="space-y-6">

      {/* ── Block composition map ──────────────────────────────────── */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Content Map</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {blockComposition.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocks yet</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {blockComposition.map(({ type, label, count }) => {
                const Icon = BLOCK_ICONS[type] ?? FileText;
                return (
                  <div
                    key={type}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border/60",
                      BLOCK_BG[type] ?? "bg-muted/30"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", BLOCK_COLORS[type] ?? "text-muted-foreground")} />
                    <div>
                      <div className="text-xs text-muted-foreground leading-none mb-0.5">{label}</div>
                      <div className="text-lg font-serif leading-none">{count}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Overview row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Hash className="w-4 h-4" /> Words
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-serif">{textStats.totalWordCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {textStats.blockCount} text {textStats.blockCount === 1 ? "block" : "blocks"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Todos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-serif">{Math.round(todoStats.completionRate * 100)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{todoStats.completedItems} of {todoStats.totalItems} done</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" /> Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-serif">{calendarStats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {calendarStats.totalEvents} total · {calendarStats.overdueEvents} past
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-serif">{photoStats.totalPhotos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasPhotoBlock
                ? `In ${photoStats.blockCount} photo ${photoStats.blockCount === 1 ? "block" : "blocks"}`
                : "No photo blocks"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Upcoming events + Activity ─────────────────────────────── */}
      <div className={cn("grid gap-6", hasCalendar ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>

        {/* Upcoming events list */}
        {hasCalendar && (
          <Card className="bg-card shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {upcomingEventsList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No upcoming events</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEventsList.map((event) => {
                    const { label, sub, urgent } = formatEventDate(event.date);
                    return (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className={cn(
                          "shrink-0 text-center rounded-lg px-2.5 py-1.5 min-w-[56px]",
                          urgent ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
                        )}>
                          <div className="text-xs font-semibold leading-tight">{label}</div>
                          <div className="text-[10px] leading-tight opacity-70">{sub}</div>
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <div className="text-sm font-medium leading-tight truncate">{event.title}</div>
                          {event.blockTitle && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">{event.blockTitle}</div>
                          )}
                          {event.description && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">{event.description}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity / freshness */}
        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Last Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {activityStats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No activity yet</p>
            ) : (
              <div className="space-y-2.5">
                {activityStats.map(({ type, label, blockCount, lastUpdated }) => {
                  const Icon = BLOCK_ICONS[type] ?? FileText;
                  return (
                    <div key={type} className="flex items-center gap-2.5">
                      <div className={cn("p-1.5 rounded-md shrink-0", BLOCK_BG[type] ?? "bg-muted/30")}>
                        <Icon className={cn("w-3.5 h-3.5", BLOCK_COLORS[type] ?? "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium leading-none">{label}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{relativeTime(lastUpdated)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {blockCount} {blockCount === 1 ? "block" : "blocks"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Overdue todos ─────────────────────────────────────────── */}
      {hasOverdue && (
        <Card className="bg-card shadow-sm border-amber-500/30">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Overdue To-dos
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {overdueStats.count} item{overdueStats.count !== 1 ? "s" : ""} older than 7 days
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {overdueStats.items.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5">
                <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-amber-400/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">{item.text}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.blockTitle && (
                      <span className="text-xs text-muted-foreground">{item.blockTitle}</span>
                    )}
                    <span className="text-xs text-amber-500/80">{item.daysOld}d old</span>
                  </div>
                </div>
              </div>
            ))}
            {overdueStats.count > overdueStats.items.length && (
              <p className="text-xs text-muted-foreground pt-1">
                +{overdueStats.count - overdueStats.items.length} more
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Keywords + Photo timeline ──────────────────────────────── */}
      <div className={cn("grid gap-6", hasPhotoBlock ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Keywords</CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-[200px]">
            {keywordData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={keywordData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ backgroundColor: "var(--popover)", borderRadius: "8px", border: "1px solid var(--border)" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {keywordData.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Not enough text data yet
              </div>
            )}
          </CardContent>
        </Card>

        {hasPhotoBlock && (
          <Card className="bg-card shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Photos by Month</CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-[200px]">
              {monthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ backgroundColor: "var(--popover)", borderRadius: "8px", border: "1px solid var(--border)" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {monthData.map((_, i) => (
                        <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.75} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No photos yet
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Photo metadata completeness ────────────────────────────── */}
      {hasPhotoBlock && hasPhotos && (
        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Photo Metadata</CardTitle>
              {earliestDate && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(earliestDate)}
                  {latestDate && latestDate !== earliestDate && (
                    <> → {formatDate(latestDate)}</>
                  )}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <MetadataRow label="With caption" icon={MessageSquare} value={withCaption} total={photoStats.totalPhotos} />
            <MetadataRow label="With notes"   icon={StickyNote}    value={withNotes}   total={photoStats.totalPhotos} />
            <MetadataRow label="With date"    icon={CalendarDays}  value={withDate}    total={photoStats.totalPhotos} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
