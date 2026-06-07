import {
  useListCalendarEvents,
  useCreateCalendarEvent,
  getListCalendarEventsQueryKey,
} from "@workspace/api-client-react";
import type { Block, CalendarEvent } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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

function EventRow({ event }: { event: CalendarEvent }) {
  const colors = useColors();
  return (
    <View style={[styles.eventRow, { borderLeftColor: colors.primary }]}>
      <Text style={[styles.eventDate, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        {formatDate(event.date)}
      </Text>
      <Text style={[styles.eventTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
        {event.title}
      </Text>
      {event.description ? (
        <Text style={[styles.eventDescription, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {event.description}
        </Text>
      ) : null}
    </View>
  );
}

export function CalendarBlock({ block }: { block: Block }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useListCalendarEvents(block.id, {
    query: { enabled: !!block.id },
  });
  const createEvent = useCreateCalendarEvent();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dateInput, setDateInput] = useState(
    new Date().toISOString().split("T")[0]
  );

  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const handleAdd = () => {
    if (!title.trim() || !dateInput.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    createEvent.mutate(
      {
        blockId: block.id,
        data: { title: title.trim(), date: dateInput.trim() },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListCalendarEventsQueryKey(block.id),
          });
          setTitle("");
          setDateInput(new Date().toISOString().split("T")[0]);
          setAdding(false);
        },
        onError: () => {
          Alert.alert("Error", "Could not save event. Check date format (YYYY-MM-DD).");
        },
      }
    );
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
          {sorted.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
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
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
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
            value={dateInput}
            onChangeText={setDateInput}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <View style={styles.formButtons}>
            <Pressable
              onPress={() => { setAdding(false); setTitle(""); }}
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
    gap: 2,
  },
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
  input: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    height: 40,
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
