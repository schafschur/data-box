import { useGetInstanceAnalysis, getGetInstanceAnalysisQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Calendar as CalendarIcon, Hash, Image as ImageIcon } from "lucide-react";

export function AnalysisPanel({ instanceId }: { instanceId: number }) {
  const { data: analysis, isLoading } = useGetInstanceAnalysis(instanceId, {
    query: { enabled: !!instanceId, queryKey: getGetInstanceAnalysisQueryKey(instanceId) }
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!analysis) return null;

  const { textStats, todoStats, calendarStats, photoStats } = analysis;

  const chartData = textStats.topKeywords.slice(0, 5).map(k => ({
    name: k.word,
    count: k.count
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card shadow-sm border-card-border hover-elevate">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Hash className="w-4 h-4" /> Word Count
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-serif text-foreground">{textStats.totalWordCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {textStats.blockCount} text blocks</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-card-border hover-elevate">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Todos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-serif text-foreground">
              {Math.round(todoStats.completionRate * 100)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todoStats.completedItems} of {todoStats.totalItems} done
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-card-border hover-elevate">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" /> Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-serif text-foreground">{calendarStats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming events</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-card-border hover-elevate">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-serif text-foreground">{photoStats.totalPhotos}</div>
            <p className="text-xs text-muted-foreground mt-1">Saved photos</p>
          </CardContent>
        </Card>
      </div>

      {/* Keywords Chart */}
      <Card className="bg-card shadow-sm border-card-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Top Keywords</CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-[200px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <Tooltip 
                  cursor={{ fill: 'var(--muted)' }} 
                  contentStyle={{ backgroundColor: 'var(--popover)', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="hsl(var(--primary))" fillOpacity={0.8} />
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
    </div>
  );
}
