import { useState, useCallback } from "react";
import type { Block } from "@workspace/api-client-react";
import {
  useListGridRows,
  useCreateGridRow,
  useUpdateGridRow,
  useDeleteGridRow,
  getListGridRowsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = (typeof DAYS)[number];

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

function toLocalISODate(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalISODate(d);
}

function addWeeks(weekOf: string, n: number): string {
  const [y, m, d] = weekOf.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n * 7);
  return toLocalISODate(dt);
}

function formatWeekLabel(weekOf: string): string {
  const [y, m, d] = weekOf.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(y, m - 1, d + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("default", { month: "short", day: "numeric" });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function parseCell(raw: string): string | null {
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return null;
  const num = parseFloat(normalized);
  if (isNaN(num)) return null;
  return String(Math.round(num * 100) / 100);
}

function displayCell(val: string | null | undefined): string {
  if (val === null || val === undefined) return "";
  const n = parseFloat(val);
  return isNaN(n) ? val : String(n);
}

function getDayValue(row: Record<string, unknown>, day: DayKey): string | null {
  return (row[day] as string | null) ?? null;
}

function CellInput({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [local, setLocal] = useState(displayCell(value));

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onSave(parseCell(local))}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      onFocus={(e) => {
        setLocal(displayCell(value));
        e.target.select();
      }}
      className="w-full h-8 text-center text-sm bg-transparent outline-none focus:bg-primary/5 rounded px-1 tabular-nums placeholder:text-muted-foreground/30 transition-colors"
      placeholder="—"
    />
  );
}

function LabelInput({ value, onSave }: { value: string | null; onSave: (v: string) => void }) {
  const [local, setLocal] = useState(value ?? "");

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onSave(local)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="w-full h-8 text-sm bg-transparent outline-none focus:bg-primary/5 rounded px-2 placeholder:text-muted-foreground/40 transition-colors"
      placeholder="Row label…"
    />
  );
}

function WeekGrid({
  block,
  weekOf,
  isNavigable = false,
  isPast = false,
  onPrev,
  onNext,
  onToday,
  showToday = false,
}: {
  block: Block;
  weekOf: string;
  isNavigable?: boolean;
  isPast?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  showToday?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useListGridRows(block.id, weekOf);
  const createGridRow = useCreateGridRow();
  const updateGridRow = useUpdateGridRow();
  const deleteGridRow = useDeleteGridRow();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListGridRowsQueryKey(block.id, weekOf) });
  }, [queryClient, block.id, weekOf]);

  const addRow = () => {
    createGridRow.mutate(
      { blockId: block.id, data: { weekOf } },
      { onSuccess: invalidate }
    );
  };

  const updateCell = (rowId: number, day: DayKey, value: string | null) => {
    updateGridRow.mutate({ id: rowId, data: { [day]: value } }, { onSuccess: invalidate });
  };

  const updateLabel = (rowId: number, label: string) => {
    updateGridRow.mutate(
      { id: rowId, data: { label: label.trim() || null } },
      { onSuccess: invalidate }
    );
  };

  const deleteRow = (rowId: number) => {
    deleteGridRow.mutate({ id: rowId }, { onSuccess: invalidate });
  };

  return (
    <div className={cn("space-y-2", isPast && "opacity-80")}>
      {/* Week header */}
      <div className="flex items-center justify-between gap-2">
        {isNavigable ? (
          <>
            <button
              onClick={onPrev}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{formatWeekLabel(weekOf)}</span>
            </div>
            <div className="flex items-center gap-1">
              {showToday && (
                <button
                  onClick={onToday}
                  className="text-xs text-primary hover:underline px-1"
                >
                  Today
                </button>
              )}
              <button
                onClick={onNext}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Next week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="w-3 h-3" />
            <span>{formatWeekLabel(weekOf)}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-10 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className={cn("bg-muted/40", isPast && "bg-muted/20")}>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-36 border-r border-border">
                  Row
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground px-2 py-2 border-r border-border last:border-r-0 w-[62px]"
                  >
                    {DAY_LABELS[day]}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-sm text-muted-foreground py-6 italic">
                    No rows for this week.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-t border-border hover:bg-muted/20 transition-colors"
                  >
                    <td className="border-r border-border px-1">
                      <LabelInput
                        value={row.label}
                        onSave={(label) => updateLabel(row.id, label)}
                      />
                    </td>
                    {DAYS.map((day) => (
                      <td key={day} className="border-r border-border last:border-r-0 px-0.5">
                        <CellInput
                          value={getDayValue(row as unknown as Record<string, unknown>, day)}
                          onSave={(v) => updateCell(row.id, day, v)}
                        />
                      </td>
                    ))}
                    <td className="px-1 text-center w-8">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all rounded"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={addRow}
        disabled={createGridRow.isPending}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
      >
        <Plus className="w-3.5 h-3.5" />
        Add row
      </button>
    </div>
  );
}

export function GridBlock({ block }: { block: Block }) {
  const [selectedWeek, setSelectedWeek] = useState(() => getMondayOfWeek(new Date()));
  const currentWeek = getMondayOfWeek(new Date());

  const prevWeek = addWeeks(selectedWeek, -1);
  const prevPrevWeek = addWeeks(selectedWeek, -2);
  const isCurrentWeek = selectedWeek === currentWeek;

  return (
    <div className="space-y-5">
      {/* Two weeks ago */}
      <WeekGrid block={block} weekOf={prevPrevWeek} isPast />

      {/* Subtle divider */}
      <div className="border-t border-border/50" />

      {/* Previous week */}
      <WeekGrid block={block} weekOf={prevWeek} isPast />

      <div className="border-t border-border/50" />

      {/* Current / selected week — navigable */}
      <WeekGrid
        block={block}
        weekOf={selectedWeek}
        isNavigable
        showToday={!isCurrentWeek}
        onPrev={() => setSelectedWeek((w) => addWeeks(w, -1))}
        onNext={() => setSelectedWeek((w) => addWeeks(w, 1))}
        onToday={() => setSelectedWeek(currentWeek)}
      />
    </div>
  );
}
