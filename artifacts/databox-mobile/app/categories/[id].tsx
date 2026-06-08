import {
  useGetCategory,
  useListInstances,
  useCreateInstance,
  getListInstancesQueryKey,
} from "@workspace/api-client-react";
import type { Instance } from "@workspace/api-client-react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
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

function InstanceCard({ instance, onPress }: { instance: Instance; onPress: () => void }) {
  const colors = useColors();
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
      testID={`instance-card-${instance.id}`}
    >
      <View style={styles.cardHeader}>
        <Text
          style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
          numberOfLines={1}
        >
          {instance.name}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
      {instance.description ? (
        <Text
          style={[styles.cardDescription, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          numberOfLines={2}
        >
          {instance.description}
        </Text>
      ) : null}
      <Text style={[styles.cardMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {instance.blockCount} {instance.blockCount === 1 ? "block" : "blocks"}
      </Text>
    </Pressable>
  );
}

function NewInstanceModal({
  visible,
  categoryId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  categoryId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { mutateAsync: createInstance, isPending } = useCreateInstance();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setName("");
    setDescription("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createInstance({
      categoryId,
      data: { name: name.trim(), description: description.trim() || null },
    });
    await queryClient.invalidateQueries({ queryKey: getListInstancesQueryKey(categoryId) });
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
            New Instance
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
            placeholder="Instance name"
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

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = parseInt(id ?? "0", 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const { data: category } = useGetCategory(categoryId, {
    query: { enabled: !!categoryId },
  });
  const {
    data: instances,
    isLoading,
    refetch,
    isRefetching,
  } = useListInstances(categoryId, {
    query: { enabled: !!categoryId },
  });

  const isWeb = Platform.OS === "web";
  const bottomPad = isWeb ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen
        options={{
          title: category?.name ?? "Category",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
          headerRight: () => (
            <Pressable
              onPress={() => setShowModal(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: 4 })}
              testID="new-instance-btn"
            >
              <Feather name="plus" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {category && (
          <View
            style={[
              styles.hero,
              {
                borderBottomColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <View style={styles.heroRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: category.color ?? colors.primary },
                ]}
              />
              <Text
                style={[
                  styles.heroTitle,
                  { color: colors.foreground, fontFamily: "Inter_700Bold" },
                ]}
              >
                {category.name}
              </Text>
            </View>
            {category.description ? (
              <Text
                style={[
                  styles.heroDescription,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {category.description}
              </Text>
            ) : null}
          </View>
        )}

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={instances ?? []}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: bottomPad + 24 },
              (instances ?? []).length === 0 && styles.listEmpty,
            ]}
            scrollEnabled={!!(instances && instances.length > 0)}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="layers" size={48} color={colors.border} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  No instances yet
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Tap + to add the first one
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <InstanceCard
                instance={item}
                onPress={() => router.push(`/instances/${item.id}`)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </View>

      <NewInstanceModal
        visible={showModal}
        categoryId={categoryId}
        onClose={() => setShowModal(false)}
        onCreated={() => setShowModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  heroTitle: { fontSize: 22 },
  heroDescription: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16 },
  listEmpty: { flex: 1 },
  card: { padding: 16, borderWidth: StyleSheet.hairlineWidth },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { flex: 1, fontSize: 16 },
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
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnCancel: { borderWidth: StyleSheet.hairlineWidth },
  btnPrimary: {},
  btnText: { fontSize: 15 },
});
