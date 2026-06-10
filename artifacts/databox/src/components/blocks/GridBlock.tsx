import { useState, useEffect, useCallback } from "react";
import type { Block, GridRow } from "@workspace/api-client-react";
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
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function addWeeks(weekOf: string, n: number): string {
  const [y, m, d] = weekOf.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n * 7);
  return dt.toISOString().split("T")[0];
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

function displayCell(val: string | null): string {
  if (val === null || val === undefined) return "";
  const n = parseFloat(val);
  return isNaN(n) ? val : String(n);
}

function CellInput({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
}) {
  const [local, setLocal] = useState(displayCell(value));

  useEffect(() => {
    setLocal(displayCell(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onSave(parseCell(local))}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      onFocus={(e) => e.target.select()}
      className="w-full h-8 text-center text-sm bg-transparent outline-none focus:bg-primary/5 rounded px-1 tabular-nums placeholder:text-muted-foreground/30 transition-colors"
      placeholder="—"
    />
  );
}

function LabelInput({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onSave(local)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-full h-8 text-sm bg-transparent outline-none focus:bg-primary/5 rounded px-2 placeholder:text-muted-foreground/40 transition-colors"
      placeholder="Row label…"
    />
  );
}

function getDayValue(row: GridRow, day: DayKey): string | null {
  return (row as unknown as Record<string, string | null>)[day] ?? null;
}

export function GridBlock({ block }: { block: Block }) {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(() => getMondayOfWeek(new Date()));
  const currentWeek = getMondayOfWeek(new Date());

  const { data: rows = [], isLoading } = useListGridRows(block.id, selectedWeek);
  const createGridRow = useCreateGridRow();
  const updateGridRow = useUpdateGridRow();
  const deleteGridRow = useDeleteGridRow();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListGridRowsQueryKey(block.id, selectedWeek) });
  }, [queryClient, block.id, selectedWeek]);

  const addRow = () => {
    createGridRow.mutate(
      { blockId: block.id, data: { weekOf: selectedWeek } },
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

  const isCurrentWeek = selectedWeek === currentWeek;

  if (isLoading) {
    return (
      <div className="h-12 flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Week navigation header */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setSelectedWeek((w) => addWeeks(w, -1))}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Previous week"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-sm font-medium">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{formatWeekLabel(selectedWeek)}</span>
        </div>

        <div className="flex items-center gap-1">
          {!isCurrentWeek && (
            <button
              onClick={() => setSelectedWeek(currentWeek)}
              className="text-xs text-primary hover:underline px-1"
            >
              Today
            </button>
          )}
          <button
            onClick={() => setSelectedWeek((w) => addWeeks(w, 1))}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/40">
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
                <td
                  colSpan={9}
                  className="text-center text-sm text-muted-foreground py-8 italic"
                >
                  No rows for this week — add one below.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "group border-t border-border transition-colors",
                    "hover:bg-muted/20"
                  )}
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
                        value={getDayValue(row, day)}
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
