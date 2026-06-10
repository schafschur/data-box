import {
  useListTodoItems,
  useCreateTodoItem,
  useUpdateTodoItem,
  useDeleteTodoItem,
  getListTodoItemsQueryKey,
} from "@workspace/api-client-react";
import type { Block, TodoItem } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

  return due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: due.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function deadlineColor(
  deadline: string,
  colors: ReturnType<typeof useColors>,
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + "T00:00:00");
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "#ef4444";
  if (diffDays <= 2) return "#f97316";
  return colors.mutedForeground;
}

function ItemForm({
  initialText = "",
  initialDeadline = "",
  onSave,
  onCancel,
  isSaving,
  label,
  onScrollRequest,
}: {
  initialText?: string;
  initialDeadline?: string;
  onSave: (text: string, deadline: string) => void;
  onCancel: () => void;
  isSaving: boolean;
  label: string;
  onScrollRequest?: () => void;
}) {
  const colors = useColors();
  const [text, setText] = useState(initialText);
  const [deadline, setDeadline] = useState(initialDeadline);
  const canSave = text.trim().length > 0;

  return (
    <View
      style={[
        styles.form,
        { borderColor: colors.border, borderRadius: colors.radius },
      ]}
    >
      <Text
        style={[
          styles.formLabel,
          { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
        ]}
      >
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            borderRadius: colors.radius,
            fontFamily: "Inter_400Regular",
          },
        ]}
        placeholder="Task text"
        placeholderTextColor={colors.mutedForeground}
        value={text}
        onChangeText={setText}
        returnKeyType="next"
        autoFocus
        onFocus={onScrollRequest}
      />
      <TextInput
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            borderRadius: colors.radius,
            fontFamily: "Inter_400Regular",
          },
        ]}
        placeholder="Deadline YYYY-MM-DD (optional)"
        placeholderTextColor={colors.mutedForeground}
        value={deadline}
        onChangeText={setDeadline}
        keyboardType="numbers-and-punctuation"
        returnKeyType="done"
        onFocus={onScrollRequest}
      />
      <View style={styles.formButtons}>
        <Pressable
          onPress={onCancel}
          style={[
            styles.btnSecondary,
            { borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Text
            style={[
              styles.btnText,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSave(text.trim(), deadline.trim())}
          disabled={!canSave || isSaving}
          style={[
            styles.btnPrimary,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: !canSave || isSaving ? 0.5 : 1,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                styles.btnText,
                { color: "#fff", fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function TodoItemRow({
  item,
  blockId,
  onEdit,
  onDelete,
  isDeletingId,
}: {
  item: TodoItem;
  blockId: number;
  onEdit: (item: TodoItem) => void;
  onDelete: (id: number) => void;
  isDeletingId: number | null;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const updateTodo = useUpdateTodoItem();
  const isDeleting = isDeletingId === item.id;

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
      },
    );
  };

  const dColor = item.deadline
    ? deadlineColor(item.deadline, colors)
    : colors.mutedForeground;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [styles.checkboxArea, { opacity: pressed ? 0.7 : 1 }]}
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
      </Pressable>

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
            <Text
              style={[
                styles.deadlineText,
                { color: dColor, fontFamily: "Inter_400Regular" },
              ]}
            >
              {formatDeadline(item.deadline)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rowActions}>
        <Pressable
          onPress={() => onEdit(item)}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Feather name="edit-2" size={13} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          onPress={() => onDelete(item.id)}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Feather name="trash-2" size={13} color="#EF4444" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function TodoBlock({
  block,
  onScrollRequest,
}: {
  block: Block;
  onScrollRequest?: () => void;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useListTodoItems(block.id, {
    query: { enabled: !!block.id },
  });

  const createTodo = useCreateTodoItem();
  const updateTodo = useUpdateTodoItem();
  const deleteTodo = useDeleteTodoItem();

  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const invalidate = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: getListTodoItemsQueryKey(block.id),
      }),
    [queryClient, block.id],
  );

  const handleAdd = (text: string, deadline: string) => {
    createTodo.mutate(
      {
        blockId: block.id,
        data: { text, deadline: deadline || null },
      },
      {
        onSuccess: () => {
          invalidate();
          setAdding(false);
        },
        onError: () => Alert.alert("Error", "Could not add item."),
      },
    );
  };

  const handleSave = (text: string, deadline: string) => {
    if (!editingItem) return;
    updateTodo.mutate(
      {
        id: editingItem.id,
        data: { text, deadline: deadline || null },
      },
      {
        onSuccess: () => {
          invalidate();
          setEditingItem(null);
        },
        onError: () => Alert.alert("Error", "Could not update item."),
      },
    );
  };

  const handleDelete = (id: number) => {
    Alert.alert("Delete Item", "Delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setDeletingId(id);
          deleteTodo.mutate(
            { id },
            {
              onSuccess: () => {
                invalidate();
                setDeletingId(null);
              },
              onError: () => {
                setDeletingId(null);
                Alert.alert("Error", "Could not delete item.");
              },
            },
          );
        },
      },
    ]);
  };

  const handleEditStart = (item: TodoItem) => {
    setEditingItem(item);
    onScrollRequest?.();
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const completed = (items ?? []).filter((i) => i.completed).length;

  return (
    <View style={styles.container}>
      {(!items || items.length === 0) && !adding ? (
        <Text
          style={[
            styles.emptyText,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          No items
        </Text>
      ) : (
        <View style={styles.list}>
          {(items ?? []).map((item) =>
            editingItem?.id === item.id ? (
              <ItemForm
                key={item.id}
                initialText={item.text}
                initialDeadline={item.deadline ?? ""}
                onSave={handleSave}
                onCancel={() => setEditingItem(null)}
                isSaving={updateTodo.isPending}
                label="Edit task"
                onScrollRequest={onScrollRequest}
              />
            ) : (
              <TodoItemRow
                key={item.id}
                item={item}
                blockId={block.id}
                onEdit={handleEditStart}
                onDelete={handleDelete}
                isDeletingId={deletingId}
              />
            ),
          )}
        </View>
      )}

      {adding ? (
        <ItemForm
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
          isSaving={createTodo.isPending}
          label="New task"
          onScrollRequest={onScrollRequest}
        />
      ) : (
        <Pressable
          onPress={() => {
            setAdding(true);
            onScrollRequest?.();
          }}
          style={({ pressed }) => [
            styles.addBtn,
            {
              borderColor: colors.border,
              borderRadius: colors.radius,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="plus" size={14} color={colors.mutedForeground} />
          <Text
            style={[
              styles.addBtnText,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            Add task
          </Text>
        </Pressable>
      )}

      {items && items.length > 0 && !adding && !editingItem && (
        <Text
          style={[
            styles.progress,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {completed}/{items.length} completed
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  loading: { paddingVertical: 8, alignItems: "center" },
  emptyText: { fontSize: 14, fontStyle: "italic" },
  list: { gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
  },
  checkboxArea: {
    paddingTop: 2,
    paddingRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
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
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 6,
  },
  iconBtn: { padding: 4 },
  progress: {
    fontSize: 12,
    marginTop: 8,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  addBtnText: { fontSize: 13 },
  form: {
    gap: 8,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  formLabel: { fontSize: 12, marginBottom: 2 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    height: 40,
  },
  formButtons: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  btnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  btnPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: "center",
  },
  btnText: { fontSize: 14 },
});
