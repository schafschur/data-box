import {
  useListCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  getListCalendarEventsQueryKey,
} from "@workspace/api-client-react";
import type { Block, CalendarEvent } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function EventRow({
  event,
  highlighted,
  onEdit,
  onDelete,
  isDeletingId,
}: {
  event: CalendarEvent;
  highlighted: boolean;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: number) => void;
  isDeletingId: number | null;
}) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlighted) return;
    Animated.sequence([
      Animated.delay(200),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: false }),
        ]),
        { iterations: 3 },
      ),
    ]).start();
  }, [highlighted, pulse]);

  const highlightBg = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary + "00", colors.primary + "20"],
  });

  const isDeleting = isDeletingId === event.id;

  return (
    <Animated.View
      style={[
        styles.eventRow,
        {
          borderLeftColor: colors.primary,
          backgroundColor: highlighted ? highlightBg : "transparent",
          borderRadius: highlighted ? 4 : 0,
          paddingRight: 4,
        },
      ]}
    >
      <View style={styles.eventContent}>
        <Text style={[styles.eventDate, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          {formatDate(event.date)}
        </Text>
        <Text
          style={[
            styles.eventTitle,
            {
              color: highlighted ? colors.primary : colors.foreground,
              fontFamily: highlighted ? "Inter_700Bold" : "Inter_600SemiBold",
            },
          ]}
        >
          {event.title}
        </Text>
        {event.description ? (
          <Text style={[styles.eventDescription, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {event.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.eventActions}>
        <Pressable
          onPress={() => onEdit(event)}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          hitSlop={8}
        >
          <Feather name="edit-2" size={13} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          onPress={() => onDelete(event.id)}
          disabled={isDeleting}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed || isDeleting ? 0.4 : 1 }]}
          hitSlop={8}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} style={{ width: 13, height: 13 }} />
          ) : (
            <Feather name="trash-2" size={13} color={colors.mutedForeground} />
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

function EditForm({
  event,
  onSave,
  onCancel,
  isSaving,
}: {
  event: CalendarEvent;
  onSave: (title: string, date: string, description: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.date);
  const [description, setDescription] = useState(event.description ?? "");

  const canSave = title.trim().length > 0 && date.trim().length > 0;

  return (
    <View style={[styles.editForm, { borderColor: colors.border, borderRadius: colors.radius }]}>
      <Text style={[styles.editFormLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        Edit event
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
        placeholder="Event title"
        placeholderTextColor={colors.mutedForeground}
        value={title}
        onChangeText={setTitle}
        returnKeyType="next"
        autoFocus
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
        placeholder="Date (YYYY-MM-DD)"
        placeholderTextColor={colors.mutedForeground}
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
        returnKeyType="next"
      />
      <TextInput
        style={[
          styles.input,
          styles.inputMulti,
          {
            color: colors.foreground,
            borderColor: colors.border,
            borderRadius: colors.radius,
            fontFamily: "Inter_400Regular",
          },
        ]}
        placeholder="Description (optional)"
        placeholderTextColor={colors.mutedForeground}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={2}
      />
      <View style={styles.editFormButtons}>
        <Pressable
          onPress={onCancel}
          style={[styles.btnSecondary, { borderColor: colors.border, borderRadius: colors.radius }]}
        >
          <Text style={[styles.btnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSave(title.trim(), date.trim(), description.trim())}
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
            <Text style={[styles.btnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
              Save
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function CalendarBlock({
  block,
  highlightEventId,
}: {
  block: Block;
  highlightEventId?: number;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useListCalendarEvents(block.id, {
    query: { enabled: !!block.id },
  });

  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const [adding, setAdding] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().split("T")[0]);

  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey(block.id) });

  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const handleAdd = () => {
    if (!addTitle.trim() || !addDate.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createEvent.mutate(
      { blockId: block.id, data: { title: addTitle.trim(), date: addDate.trim() } },
      {
        onSuccess: () => {
          invalidate();
          setAddTitle("");
          setAddDate(new Date().toISOString().split("T")[0]);
          setAdding(false);
        },
        onError: () => {
          Alert.alert("Error", "Could not save event. Check date format (YYYY-MM-DD).");
        },
      },
    );
  };

  const handleSave = (title: string, date: string, description: string) => {
    if (!editingEvent) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateEvent.mutate(
      {
        id: editingEvent.id,
        data: { title, date, description: description || null },
      },
      {
        onSuccess: () => {
          invalidate();
          setEditingEvent(null);
        },
        onError: () => {
          Alert.alert("Error", "Could not update event.");
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setDeletingId(id);
          deleteEvent.mutate(
            { id },
            {
              onSuccess: () => {
                invalidate();
                setDeletingId(null);
              },
              onError: () => {
                setDeletingId(null);
                Alert.alert("Error", "Could not delete event.");
              },
            },
          );
        },
      },
    ]);
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
      {sorted.length === 0 && !adding ? (
        <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          No events
        </Text>
      ) : (
        <View style={styles.list}>
          {sorted.map((event) =>
            editingEvent?.id === event.id ? (
              <EditForm
                key={event.id}
                event={event}
                onSave={handleSave}
                onCancel={() => setEditingEvent(null)}
                isSaving={updateEvent.isPending}
              />
            ) : (
              <EventRow
                key={event.id}
                event={event}
                highlighted={highlightEventId === event.id}
                onEdit={setEditingEvent}
                onDelete={handleDelete}
                isDeletingId={deletingId}
              />
            ),
          )}
        </View>
      )}

      {adding ? (
        <View style={[styles.addForm, { borderColor: colors.border, borderRadius: colors.radius }]}>
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
            placeholder="Event title"
            placeholderTextColor={colors.mutedForeground}
            value={addTitle}
            onChangeText={setAddTitle}
            returnKeyType="next"
            autoFocus
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
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor={colors.mutedForeground}
            value={addDate}
            onChangeText={setAddDate}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <View style={styles.formButtons}>
            <Pressable
              onPress={() => { setAdding(false); setAddTitle(""); }}
              style={[styles.btnSecondary, { borderColor: colors.border, borderRadius: colors.radius }]}
            >
              <Text style={[styles.btnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              style={[styles.btnPrimary, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              disabled={createEvent.isPending}
            >
              {createEvent.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.btnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Add
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          style={({ pressed }) => [
            styles.addBtn,
            { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
          ]}
          testID="add-event-btn"
        >
          <Feather name="plus" size={14} color={colors.mutedForeground} />
          <Text style={[styles.addBtnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Add event
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  loading: { paddingVertical: 8, alignItems: "center" },
  list: { gap: 10 },
  eventRow: {
    paddingLeft: 12,
    borderLeftWidth: 3,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  eventContent: { flex: 1, gap: 2 },
  eventActions: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 2 },
  iconBtn: { padding: 4 },
  eventDate: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  eventTitle: { fontSize: 15 },
  eventDescription: { fontSize: 13, lineHeight: 18 },
  emptyText: { fontSize: 14, fontStyle: "italic" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  addBtnText: { fontSize: 13 },
  addForm: {
    gap: 8,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editForm: {
    gap: 8,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editFormLabel: { fontSize: 12, marginBottom: 2 },
  editFormButtons: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
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
  formButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
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
