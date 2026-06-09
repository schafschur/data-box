import {
  useListTodoItems,
  useUpdateTodoItem,
  getListTodoItemsQueryKey,
} from "@workspace/api-client-react";
import type { Block, TodoItem } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

function formatDeadline(deadline: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + "T00:00:00");
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays === -1) return "Due yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays <= 6) return `Due in ${diffDays}d`;

  return due.toLocaleDateString(undefined, { month: "short", day: "numeric", year: due.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

function deadlineColor(deadline: string, colors: ReturnType<typeof useColors>): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + "T00:00:00");
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "#ef4444";
  if (diffDays <= 2) return "#f97316";
  return colors.mutedForeground;
}

function TodoItemRow({ item, blockId }: { item: TodoItem; blockId: number }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const updateTodo = useUpdateTodoItem();

  const handleToggle = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    updateTodo.mutate(
      { id: item.id, data: { completed: !item.completed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListTodoItemsQueryKey(blockId),
          });
        },
      }
    );
  };

  const dColor = item.deadline ? deadlineColor(item.deadline, colors) : colors.mutedForeground;

  return (
    <Pressable
      onPress={handleToggle}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
      testID={`todo-item-${item.id}`}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: item.completed ? colors.primary : colors.border,
            backgroundColor: item.completed ? colors.primary : "transparent",
            borderRadius: 4,
          },
        ]}
      >
        {item.completed && (
          <Feather name="check" size={12} color={colors.primaryForeground} />
        )}
      </View>
      <View style={styles.itemBody}>
        <Text
          style={[
            styles.itemText,
            {
              color: item.completed ? colors.mutedForeground : colors.foreground,
              fontFamily: "Inter_400Regular",
              textDecorationLine: item.completed ? "line-through" : "none",
            },
          ]}
        >
          {item.text}
        </Text>
        {item.deadline && !item.completed && (
          <View style={styles.deadlineRow}>
            <Feather name="clock" size={11} color={dColor} />
            <Text style={[styles.deadlineText, { color: dColor, fontFamily: "Inter_400Regular" }]}>
              {formatDeadline(item.deadline)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function TodoBlock({ block }: { block: Block }) {
  const colors = useColors();
  const { data: items, isLoading } = useListTodoItems(block.id, {
    query: { enabled: !!block.id },
  });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        No items
      </Text>
    );
  }

  const completed = items.filter((i) => i.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.list}>
        {items.map((item) => (
          <TodoItemRow key={item.id} item={item} blockId={block.id} />
        ))}
      </View>
      <Text style={[styles.progress, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {completed}/{items.length} completed
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  loading: { paddingVertical: 8, alignItems: "center" },
  list: { gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  itemText: {
    fontSize: 15,
    lineHeight: 20,
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    lineHeight: 16,
  },
  progress: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
});
