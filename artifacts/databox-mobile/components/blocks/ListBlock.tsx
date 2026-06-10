import {
  useListListItems,
  useCreateListItem,
  useUpdateListItem,
  useDeleteListItem,
  getListListItemsQueryKey,
} from "@workspace/api-client-react";
import type { Block, ListItem } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

function ListItemRow({
  item,
  onEdit,
  onDelete,
  isDeletingId,
}: {
  item: ListItem;
  onEdit: (item: ListItem) => void;
  onDelete: (id: number) => void;
  isDeletingId: number | null;
}) {
  const colors = useColors();
  const hasDetail = !!(item.description || item.notes);
  const [expanded, setExpanded] = useState(false);
  const isDeleting = isDeletingId === item.id;

  return (
    <Pressable
      onPress={() => hasDetail && setExpanded((v) => !v)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius / 1.5,
          opacity: pressed && hasDetail ? 0.75 : 1,
        },
      ]}
    >
      <View style={styles.rowMain}>
        <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
        <Text
          style={[styles.title, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
          numberOfLines={expanded ? undefined : 2}
        >
          {item.title}
        </Text>
        {hasDetail && (
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.mutedForeground}
          />
        )}
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
            {isDeleting
              ? <ActivityIndicator size="small" color={colors.mutedForeground} />
              : <Feather name="trash-2" size={13} color="#EF4444" />}
          </Pressable>
        </View>
      </View>

      {expanded && hasDetail && (
        <View style={styles.detail}>
          {item.description ? (
            <Text style={[styles.description, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {item.description}
            </Text>
          ) : null}
          {item.notes ? (
            <Text style={[styles.notes, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {item.notes}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function ItemForm({
  initialTitle = "",
  initialDescription = "",
  initialNotes = "",
  onSave,
  onCancel,
  isSaving,
  label,
  onScrollRequest,
}: {
  initialTitle?: string;
  initialDescription?: string;
  initialNotes?: string;
  onSave: (title: string, description: string, notes: string) => void;
  onCancel: () => void;
  isSaving: boolean;
  label: string;
  onScrollRequest?: () => void;
}) {
  const colors = useColors();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [notes, setNotes] = useState(initialNotes);
  const canSave = title.trim().length > 0;

  return (
    <View style={[styles.form, { borderColor: colors.border, borderRadius: colors.radius }]}>
      <Text style={[styles.formLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius, fontFamily: "Inter_400Regular" }]}
        placeholder="Title"
        placeholderTextColor={colors.mutedForeground}
        value={title}
        onChangeText={setTitle}
        returnKeyType="next"
        autoFocus
        onFocus={onScrollRequest}
      />
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius, fontFamily: "Inter_400Regular" }]}
        placeholder="Description (optional)"
        placeholderTextColor={colors.mutedForeground}
        value={description}
        onChangeText={setDescription}
        returnKeyType="next"
        onFocus={onScrollRequest}
      />
      <TextInput
        style={[styles.input, styles.inputMulti, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius, fontFamily: "Inter_400Regular" }]}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.mutedForeground}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={2}
        onFocus={onScrollRequest}
      />
      <View style={styles.formButtons}>
        <Pressable
          onPress={onCancel}
          style={[styles.btnSecondary, { borderColor: colors.border, borderRadius: colors.radius }]}
        >
          <Text style={[styles.btnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => onSave(title.trim(), description.trim(), notes.trim())}
          disabled={!canSave || isSaving}
          style={[styles.btnPrimary, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: !canSave || isSaving ? 0.5 : 1 }]}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[styles.btnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Save</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export function ListBlock({ block, onScrollRequest }: { block: Block; onScrollRequest?: () => void }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useListListItems(block.id, {
    query: { enabled: !!block.id },
  });

  const createItem = useCreateListItem();
  const updateItem = useUpdateListItem();
  const deleteItem = useDeleteListItem();

  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: getListListItemsQueryKey(block.id) }),
    [queryClient, block.id],
  );

  const handleAdd = (title: string, description: string, notes: string) => {
    createItem.mutate(
      { blockId: block.id, data: { title, description: description || null, notes: notes || null } },
      {
        onSuccess: () => { invalidate(); setAdding(false); },
        onError: () => Alert.alert("Error", "Could not add item."),
      },
    );
  };

  const handleSave = (title: string, description: string, notes: string) => {
    if (!editingItem) return;
    updateItem.mutate(
      { id: editingItem.id, data: { title, description: description || null, notes: notes || null } },
      {
        onSuccess: () => { invalidate(); setEditingItem(null); },
        onError: () => Alert.alert("Error", "Could not update item."),
      },
    );
  };

  const handleDelete = (id: number) => {
    Alert.alert("Delete Item", "Delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => {
          setDeletingId(id);
          deleteItem.mutate(
            { id },
            {
              onSuccess: () => { invalidate(); setDeletingId(null); },
              onError: () => { setDeletingId(null); Alert.alert("Error", "Could not delete item."); },
            },
          );
        },
      },
    ]);
  };

  const handleEditStart = (item: ListItem) => {
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

  return (
    <View style={styles.container}>
      {(!items || items.length === 0) && !adding ? (
        <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          No items
        </Text>
      ) : (
        <View style={styles.list}>
          {(items ?? []).map((item) =>
            editingItem?.id === item.id ? (
              <ItemForm
                key={item.id}
                initialTitle={item.title}
                initialDescription={item.description ?? ""}
                initialNotes={item.notes ?? ""}
                onSave={handleSave}
                onCancel={() => setEditingItem(null)}
                isSaving={updateItem.isPending}
                label="Edit item"
                onScrollRequest={onScrollRequest}
              />
            ) : (
              <ListItemRow
                key={item.id}
                item={item}
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
          isSaving={createItem.isPending}
          label="New item"
          onScrollRequest={onScrollRequest}
        />
      ) : (
        <Pressable
          onPress={() => { setAdding(true); onScrollRequest?.(); }}
          style={({ pressed }) => [
            styles.addBtn,
            { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="plus" size={14} color={colors.mutedForeground} />
          <Text style={[styles.addBtnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Add item
          </Text>
        </Pressable>
      )}

      {items && items.length > 0 && !adding && !editingItem && (
        <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {items.length} {items.length === 1 ? "item" : "items"}
          {items.some((i) => i.description || i.notes) ? " · tap to expand" : ""}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  loading: { paddingVertical: 8, alignItems: "center" },
  empty: { fontSize: 14, fontStyle: "italic" },
  list: { gap: 6 },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconBtn: { padding: 4 },
  detail: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingLeft: 28,
    gap: 4,
  },
  description: { fontSize: 13, lineHeight: 19 },
  notes: { fontSize: 12, lineHeight: 17, fontStyle: "italic", opacity: 0.7 },
  count: { fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  addBtnText: { fontSize: 13 },
  form: {
    gap: 8,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  formLabel: { fontSize: 12, marginBottom: 2 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    height: 40,
  },
  inputMulti: {
    height: 64,
    textAlignVertical: "top",
  },
  formButtons: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  btnSecondary: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  btnPrimary: { paddingHorizontal: 16, paddingVertical: 8, minWidth: 60, alignItems: "center" },
  btnText: { fontSize: 14 },
});
