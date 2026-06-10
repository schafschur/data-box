import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import type { Block, GridRow } from "@workspace/api-client-react";
import {
  useListGridRows,
  useCreateGridRow,
  useUpdateGridRow,
  useDeleteGridRow,
  getListGridRowsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

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

const LABEL_W = 88;
const CELL_W = 56;

function parseCell(raw: string): string | null {
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return null;
  const num = parseFloat(normalized);
  if (isNaN(num)) return null;
  return String(Math.round(num * 100) / 100);
}

function displayCell(val: string | null): string {
  if (!val) return "";
  const n = parseFloat(val);
  return isNaN(n) ? val : String(n);
}

function getDayValue(row: GridRow, day: DayKey): string | null {
  return (row as unknown as Record<string, string | null>)[day] ?? null;
}

export function GridBlock({ block }: { block: Block }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useListGridRows(block.id);
  const createGridRow = useCreateGridRow();
  const updateGridRow = useUpdateGridRow();
  const deleteGridRow = useDeleteGridRow();

  const [localLabels, setLocalLabels] = useState<Record<number, string>>({});
  const [localCells, setLocalCells] = useState<Record<string, string>>({});

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListGridRowsQueryKey(block.id) });
  }, [queryClient, block.id]);

  const addRow = () => {
    createGridRow.mutate({ blockId: block.id, data: {} }, { onSuccess: invalidate });
  };

  const saveLabel = (rowId: number) => {
    const val = localLabels[rowId] ?? "";
    updateGridRow.mutate(
      { id: rowId, data: { label: val.trim() || null } },
      { onSuccess: invalidate }
    );
  };

  const saveCell = (rowId: number, day: DayKey) => {
    const key = `${rowId}-${day}`;
    const raw = localCells[key] ?? "";
    updateGridRow.mutate(
      { id: rowId, data: { [day]: parseCell(raw) } },
      { onSuccess: invalidate }
    );
  };

  const deleteRow = (rowId: number) => {
    deleteGridRow.mutate({ id: rowId }, { onSuccess: invalidate });
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header */}
          <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={[styles.labelCell, { borderRightColor: colors.border, borderRightWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[styles.headerText, { color: colors.mutedForeground }]}>Row</Text>
            </View>
            {DAYS.map((day) => (
              <View
                key={day}
                style={[
                  styles.cell,
                  {
                    borderRightColor: colors.border,
                    borderRightWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[styles.headerText, { color: colors.mutedForeground }]}>
                  {DAY_LABELS[day]}
                </Text>
              </View>
            ))}
            <View style={styles.deleteCell} />
          </View>

          {/* Data rows */}
          {rows.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No rows yet
              </Text>
            </View>
          ) : (
            rows.map((row) => (
              <View
                key={row.id}
                style={[
                  styles.row,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View
                  style={[
                    styles.labelCell,
                    {
                      borderRightColor: colors.border,
                      borderRightWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.labelInput, { color: colors.foreground }]}
                    value={localLabels[row.id] ?? row.label ?? ""}
                    onChangeText={(v) => setLocalLabels((p) => ({ ...p, [row.id]: v }))}
                    onBlur={() => saveLabel(row.id)}
                    placeholder="Label…"
                    placeholderTextColor={colors.mutedForeground + "60"}
                  />
                </View>
                {DAYS.map((day) => {
                  const key = `${row.id}-${day}`;
                  return (
                    <View
                      key={day}
                      style={[
                        styles.cell,
                        {
                          borderRightColor: colors.border,
                          borderRightWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.cellInput, { color: colors.foreground }]}
                        value={localCells[key] ?? displayCell(getDayValue(row, day))}
                        onChangeText={(v) => setLocalCells((p) => ({ ...p, [key]: v }))}
                        onBlur={() => saveCell(row.id, day)}
                        keyboardType="decimal-pad"
                        placeholder="—"
                        placeholderTextColor={colors.mutedForeground + "40"}
                        textAlign="center"
                      />
                    </View>
                  );
                })}
                <TouchableOpacity
                  onPress={() => deleteRow(row.id)}
                  style={styles.deleteCell}
                >
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add row */}
      <TouchableOpacity
        onPress={addRow}
        disabled={createGridRow.isPending}
        style={styles.addRow}
      >
        <Feather name="plus" size={13} color={colors.mutedForeground} />
        <Text style={[styles.addRowText, { color: colors.mutedForeground }]}>Add row</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelCell: {
    width: LABEL_W,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cell: {
    width: CELL_W,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteCell: {
    width: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  labelInput: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cellInput: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingVertical: 6,
    width: CELL_W - 2,
  },
  emptyRow: {
    paddingVertical: 20,
    paddingHorizontal: LABEL_W,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 10,
    opacity: 1,
  },
  addRowText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
