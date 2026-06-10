import {
  useListCategories,
  useCreateCategory,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import type { Category } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

const COLOR_PALETTE = [
  "#5BC8C0", "#FF6B6B", "#4ECDC4", "#45B7D1",
  "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8",
];

interface UrgentTodo {
  id: number;
  text: string;
  deadline: string;
  blockId: number;
  blockTitle: string | null;
  instanceId: number;
  instanceName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
}

interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
  description: string | null;
  blockId: number;
  blockTitle: string | null;
  instanceId: number;
  instanceName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
  locationId: number | null;
  locationName: string | null;
  locationColor: string | null;
}

const AMBER = "#D97706";
const AMBER_LIGHT = "#FEF3C7";
const AMBER_CHIP_TODAY = "#F59E0B";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDeadlineChip(dateStr: string): { label: string; num: string } {
  try {
    const d = new Date(dateStr + "T00:00:00");
    const today = todayStr();
    const tmrw = tomorrowStr();
    return {
      label: dateStr === today ? "Today" : dateStr === tmrw ? "Tmrw" : d.toLocaleDateString(undefined, { weekday: "short" }),
      num: String(d.getDate()),
    };
  } catch {
    return { label: "?", num: "?" };
  }
}

function DueSoonSection({ onTodoPress }: { onTodoPress: (instanceId: number) => void }) {
  const colors = useColors();
  const [todos, setTodos] = useState<UrgentTodo[] | null>(null);

  useEffect(() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const base = domain ? `https://${domain}` : "";
    fetch(`${base}/api/urgent-todos`)
      .then((r) => r.json())
      .then(setTodos)
      .catch(() => setTodos([]));
  }, []);

  if (todos === null) {
    return (
      <View style={dueSoonStyles.container}>
        <View style={styles.sectionHeader}>
          <Feather name="clock" size={13} color={AMBER} />
          <Text style={[styles.sectionLabel, { color: AMBER, fontFamily: "Inter_600SemiBold" }]}>
            DUE SOON
          </Text>
        </View>
        <View style={[styles.skeleton, { backgroundColor: colors.muted, borderRadius: colors.radius }]} />
        <View style={[styles.skeleton, { backgroundColor: colors.muted, borderRadius: colors.radius, opacity: 0.6 }]} />
      </View>
    );
  }

  if (todos.length === 0) return null;

  return (
    <View style={dueSoonStyles.container}>
      <View style={styles.sectionHeader}>
        <Feather name="clock" size={13} color={AMBER} />
        <Text style={[styles.sectionLabel, { color: AMBER, fontFamily: "Inter_600SemiBold" }]}>
          DUE SOON
        </Text>
      </View>
      <View style={styles.eventList}>
        {todos.map((todo) => {
          const isToday = todo.deadline === todayStr();
          const { label, num } = formatDeadlineChip(todo.deadline);
          const dotColor = todo.categoryColor ?? colors.primary;
          return (
            <Pressable
              key={todo.id}
              onPress={() => onTodoPress(todo.instanceId)}
              style={({ pressed }) => [
                styles.eventRow,
                {
                  backgroundColor: isToday ? "#FEF3C7" : "#FFFBEB",
                  borderColor: isToday ? "#FCD34D" : "#FDE68A",
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isToday ? AMBER_CHIP_TODAY : AMBER_LIGHT,
                    borderRadius: colors.radius / 1.5,
                  },
                ]}
              >
                <Text style={[styles.dateChipDay, { color: isToday ? "#fff" : AMBER, fontFamily: "Inter_600SemiBold" }]}>
                  {label}
                </Text>
                <Text style={[styles.dateChipNum, { color: isToday ? "#fff" : AMBER, fontFamily: "Inter_700Bold" }]}>
                  {num}
                </Text>
              </View>
              <View style={styles.eventContent}>
                <Text
                  style={[styles.eventTitle, { color: isToday ? "#92400E" : "#78350F", fontFamily: "Inter_600SemiBold" }]}
                  numberOfLines={1}
                >
                  {todo.text}
                </Text>
                <Text
                  style={[styles.eventMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
                  numberOfLines={1}
                >
                  {todo.instanceName}
                  {todo.blockTitle ? ` · ${todo.blockTitle}` : ""}
                </Text>
              </View>
              <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const dueSoonStyles = StyleSheet.create({
  container: { marginBottom: 8 },
});

function isEventToday(dateStr: string): boolean {
  return dateStr === todayStr();
}

function formatEventDate(dateStr: string): { day: string; num: string } {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
      num: String(d.getDate()),
    };
  } catch {
    return { day: "?", num: "?" };
  }
}

function UpcomingEventRow({
  event,
  onPress,
}: {
  event: UpcomingEvent;
  onPress: () => void;
}) {
  const colors = useColors();
  const today = isEventToday(event.date);
  const { day, num } = formatEventDate(event.date);
  const dotColor = event.categoryColor ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.eventRow,
        {
          backgroundColor: today ? colors.primary + "10" : colors.card,
          borderColor: today ? colors.primary + "40" : colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {/* Date chip */}
      <View
        style={[
          styles.dateChip,
          {
            backgroundColor: today ? colors.primary : colors.muted,
            borderRadius: colors.radius / 1.5,
          },
        ]}
      >
        <Text
          style={[
            styles.dateChipDay,
            { color: today ? "#fff" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          {day}
        </Text>
        <Text
          style={[
            styles.dateChipNum,
            { color: today ? "#fff" : colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
        >
          {num}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.eventContent}>
        <Text
          style={[
            styles.eventTitle,
            { color: today ? colors.primary : colors.foreground, fontFamily: "Inter_600SemiBold" },
          ]}
          numberOfLines={1}
        >
          {event.title}
        </Text>
        <Text
          style={[styles.eventMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          numberOfLines={1}
        >
          {event.instanceName}
          {event.blockTitle ? ` · ${event.blockTitle}` : ""}
        </Text>
        {event.locationName ? (
          <View style={styles.locationBadge}>
            <View style={[styles.locationDot, { backgroundColor: event.locationColor ?? colors.primary }]} />
            <Text
              style={[styles.locationText, { color: event.locationColor ?? colors.primary, fontFamily: "Inter_500Medium" }]}
              numberOfLines={1}
            >
              {event.locationName}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Today badge + color dot */}
      <View style={styles.eventRight}>
        {today && (
          <View style={[styles.todayBadge, { backgroundColor: colors.primary + "25" }]}>
            <Text style={[styles.todayBadgeText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              TODAY
            </Text>
          </View>
        )}
        <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
      </View>
    </Pressable>
  );
}

function UpcomingSection({ onEventPress }: { onEventPress: (event: UpcomingEvent) => void }) {
  const colors = useColors();
  const [events, setEvents] = useState<UpcomingEvent[] | null>(null);

  useEffect(() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const base = domain ? `https://${domain}` : "";
    fetch(`${base}/api/upcoming-events`)
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  if (events === null) {
    return (
      <View style={styles.upcomingContainer}>
        <View style={styles.sectionHeader}>
          <Feather name="calendar" size={13} color={colors.mutedForeground} />
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            UPCOMING
          </Text>
        </View>
        <View style={[styles.skeleton, { backgroundColor: colors.muted, borderRadius: colors.radius }]} />
        <View style={[styles.skeleton, { backgroundColor: colors.muted, borderRadius: colors.radius, opacity: 0.6 }]} />
      </View>
    );
  }

  if (events.length === 0) return null;

  return (
    <View style={styles.upcomingContainer}>
      <View style={styles.sectionHeader}>
        <Feather name="calendar" size={13} color={colors.mutedForeground} />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          UPCOMING
        </Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          — next 7 days
        </Text>
      </View>
      <View style={styles.eventList}>
        {events.map((event) => (
          <UpcomingEventRow key={event.id} event={event} onPress={() => onEventPress(event)} />
        ))}
      </View>
    </View>
  );
}

function CategoryCard({ category, onPress }: { category: Category; onPress: () => void }) {
  const colors = useColors();
  const dotColor = category.color ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID={`category-card-${category.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text
          style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
          numberOfLines={1}
        >
          {category.name}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
      {category.description ? (
        <Text
          style={[styles.cardDescription, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          numberOfLines={2}
        >
          {category.description}
        </Text>
      ) : null}
      <Text style={[styles.cardMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {category.instanceCount} {category.instanceCount === 1 ? "instance" : "instances"}
      </Text>
    </Pressable>
  );
}

function NewCategoryModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { mutateAsync: createCategory, isPending } = useCreateCategory();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);

  const reset = () => {
    setName("");
    setDescription("");
    setSelectedColor(COLOR_PALETTE[0]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createCategory({
      data: { name: name.trim(), description: description.trim() || null, color: selectedColor },
    });
    await queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    reset();
    onCreated();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalBackdrop} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalKAV}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            New Category
          </Text>

          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Name *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                borderRadius: colors.radius,
                backgroundColor: colors.background,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="e.g. Books, Projects, Recipes"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Description
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.inputMulti,
              {
                color: colors.foreground,
                borderColor: colors.border,
                borderRadius: colors.radius,
                backgroundColor: colors.background,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="Optional description"
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />

          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Color
          </Text>
          <View style={styles.colorRow}>
            {COLOR_PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setSelectedColor(c)}
                style={[
                  styles.colorDotPicker,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>

          <View style={styles.sheetActions}>
            <Pressable
              onPress={handleClose}
              style={[styles.btn, styles.btnCancel, { borderColor: colors.border, borderRadius: colors.radius }]}
            >
              <Text style={[styles.btnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!name.trim() || isPending}
              style={[
                styles.btn,
                styles.btnPrimary,
                { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: !name.trim() || isPending ? 0.5 : 1 },
              ]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.btnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                  Create
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: categories, isLoading, refetch, isRefetching } = useListCategories();
  const [showModal, setShowModal] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const handleEventPress = (event: UpcomingEvent) => {
    router.push(`/instances/${event.instanceId}?eventId=${event.id}&blockId=${event.blockId}` as any);
  };

  const handleTodoPress = (instanceId: number) => {
    router.push(`/instances/${instanceId}` as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Databox
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Your personal data workspace
            </Text>
          </View>
          <Pressable
            onPress={() => setShowModal(true)}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
            ]}
            testID="new-category-btn"
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={categories ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 24 },
            (categories ?? []).length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              <DueSoonSection onTodoPress={handleTodoPress} />
              <UpcomingSection onEventPress={handleEventPress} />
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="folder" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                No categories yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Tap + to create your first category
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <>
              {index === 0 && (
                <View style={styles.sectionHeader}>
                  <Feather name="folder" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                    CATEGORIES
                  </Text>
                </View>
              )}
              <CategoryCard
                category={item}
                onPress={() => router.push(`/categories/${item.id}`)}
              />
            </>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      <NewCategoryModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => setShowModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 34, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 15, marginTop: 4 },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  list: { padding: 16 },
  listEmpty: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { padding: 16, borderWidth: StyleSheet.hairlineWidth },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { flex: 1, fontSize: 17 },
  cardDescription: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  cardMeta: { fontSize: 12, marginTop: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  // Modal / sheet
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  modalKAV: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 12, gap: 8 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 20, marginBottom: 8 },
  label: { fontSize: 13, marginBottom: 4, marginTop: 4 },
  input: { borderWidth: StyleSheet.hairlineWidth, padding: 12, fontSize: 15 },
  inputMulti: { height: 72, textAlignVertical: "top" },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginVertical: 4 },
  colorDotPicker: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnCancel: { borderWidth: StyleSheet.hairlineWidth },
  btnPrimary: {},
  btnText: { fontSize: 15 },
  // Upcoming section
  upcomingContainer: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionLabel: { fontSize: 11, letterSpacing: 1 },
  sectionSub: { fontSize: 11 },
  eventList: { gap: 8, marginBottom: 20 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateChip: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  dateChipDay: { fontSize: 9, letterSpacing: 0.5 },
  dateChipNum: { fontSize: 18, lineHeight: 20 },
  eventContent: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 14 },
  eventMeta: { fontSize: 12 },
  eventRight: { alignItems: "flex-end", gap: 6 },
  todayBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  todayBadgeText: { fontSize: 9, letterSpacing: 0.5 },
  colorDot: { width: 8, height: 8, borderRadius: 4, opacity: 0.5 },
  skeleton: { height: 56, marginBottom: 8 },
  locationBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  locationDot: { width: 6, height: 6, borderRadius: 3 },
  locationText: { fontSize: 11 },
});
