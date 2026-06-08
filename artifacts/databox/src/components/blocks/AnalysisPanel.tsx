import { useGetInstanceAnalysis, getGetInstanceAnalysisQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Calendar as CalendarIcon, Hash, Image as ImageIcon, MessageSquare, StickyNote, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

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
    return <Skeleton className="h-64 w-full" />;
  }

  if (!analysis) return null;

  const { textStats, todoStats, calendarStats, photoStats } = analysis;

  const keywordData = textStats.topKeywords.slice(0, 5).map(k => ({
    name: k.word,
    count: k.count,
  }));

  const monthData = (photoStats.byMonth ?? []).map(m => ({
    name: formatMonth(m.month),
    count: m.count,
  }));

  const withCaption = photoStats.withCaption ?? 0;
  const withNotes = photoStats.withNotes ?? 0;
  const withDate = photoStats.withDate ?? 0;
  const earliestDate = photoStats.earliestDate ?? null;
  const latestDate = photoStats.latestDate ?? null;

  const hasPhotoBlock = photoStats.blockCount > 0;
  const hasPhotos = photoStats.totalPhotos > 0;

  return (
    <div className="space-y-6">
      {/* ── Overview row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Hash className="w-4 h-4" /> Words
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-serif">{textStats.totalWordCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {textStats.blockCount} text {textStats.blockCount === 1 ? "block" : "blocks"}</p>
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
            <p className="text-xs text-muted-foreground mt-1">Upcoming events</p>
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
              {hasPhotoBlock ? `In ${photoStats.blockCount} photo ${photoStats.blockCount === 1 ? "block" : "blocks"}` : "No photo blocks"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Second row: keywords + photo timeline ─────────────── */}
      <div className={cn("grid gap-6", hasPhotoBlock ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
        {/* Keywords chart */}
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

        {/* Photos per month chart */}
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

      {/* ── Photo metadata completeness ───────────────────────── */}
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
            <MetadataRow
              label="With caption"
              icon={MessageSquare}
              value={withCaption}
              total={photoStats.totalPhotos}
            />
            <MetadataRow
              label="With notes"
              icon={StickyNote}
              value={withNotes}
              total={photoStats.totalPhotos}
            />
            <MetadataRow
              label="With date"
              icon={CalendarDays}
              value={withDate}
              total={photoStats.totalPhotos}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
