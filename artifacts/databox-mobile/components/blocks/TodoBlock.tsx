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
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
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
