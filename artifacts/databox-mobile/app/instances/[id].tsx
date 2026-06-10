import {
  useGetInstance,
  useListBlocks,
  useCreateBlock,
  getListBlocksQueryKey,
} from "@workspace/api-client-react";
import type { Block } from "@workspace/api-client-react";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";

type BlockType = "richtext" | "todo" | "calendar" | "photo" | "list";

const BLOCK_TYPES: { type: BlockType; icon: string; label: string; description: string }[] = [
  { type: "richtext", icon: "file-text", label: "Note", description: "Rich text notes" },
  { type: "todo", icon: "check-square", label: "Checklist", description: "Tasks & to-dos" },
  { type: "calendar", icon: "calendar", label: "Calendar", description: "Events & dates" },
  { type: "photo", icon: "image", label: "Photos", description: "Photo gallery" },
  { type: "list", icon: "list", label: "List", description: "Structured list items" },
];

function NewBlockModal({
  visible,
  instanceId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  instanceId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { mutateAsync: createBlock, isPending } = useCreateBlock();

  const [selectedType, setSelectedType] = useState<BlockType>("richtext");
  const [title, setTitle] = useState("");
  const [importance, setImportance] = useState<number | null>(null);

  const reset = () => {
    setSelectedType("richtext");
    setTitle("");
    setImportance(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    await createBlock({
      instanceId,
      data: { type: selectedType, title: title.trim() || null, importance },
    });
    await queryClient.invalidateQueries({ queryKey: getListBlocksQueryKey(instanceId) });
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
            New Block
          </Text>

          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Type
          </Text>
          <View style={styles.typeGrid}>
            {BLOCK_TYPES.map(({ type, icon, label, description }) => {
              const selected = selectedType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setSelectedType(type)}
                  style={[
                    styles.typeCard,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      borderRadius: colors.radius,
                      backgroundColor: selected ? colors.primary + "15" : colors.background,
                    },
                  ]}
                >
                  <Feather
                    name={icon as any}
                    size={20}
                    color={selected ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      {
                        color: selected ? colors.primary : colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.typeDesc,
                      { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    {description}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Importance (optional)
          </Text>
          <View style={styles.importanceRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                onPress={() => setImportance(importance === n ? null : n)}
                style={[
                  styles.impBtn,
                  {
                    borderColor: importance === n ? colors.primary : colors.border,
                    backgroundColor: importance === n ? colors.primary : colors.background,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.impBtnText,
                    {
                      color: importance === n ? "#fff" : colors.mutedForeground,
                      fontFamily: importance === n ? "Inter_700Bold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Title (optional)
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
            placeholder="Block title"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
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
              disabled={isPending}
              style={[
                styles.btn,
                styles.btnPrimary,
                { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: isPending ? 0.5 : 1 },
              ]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.btnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                  Add Block
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function InstanceScreen() {
  const { id, eventId, blockId } = useLocalSearchParams<{
    id: string;
    eventId?: string;
    blockId?: string;
  }>();
  const instanceId = parseInt(id ?? "0", 10);
  const highlightEventId = eventId ? parseInt(eventId, 10) : undefined;
  const highlightBlockId = blockId ? parseInt(blockId, 10) : undefined;

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const blockRefs = useRef<Map<number, View | null>>(new Map());

  const { data: instance } = useGetInstance(instanceId, {
    query: { enabled: !!instanceId },
  });
  const {
    data: blocks,
    isLoading,
    refetch,
    isRefetching,
  } = useListBlocks(instanceId, {
    query: { enabled: !!instanceId },
  });

  const scrollToBlock = useCallback(() => {
    if (!highlightBlockId || !scrollViewRef.current) return;
    const ref = blockRefs.current.get(highlightBlockId);
    if (!ref) return;
    ref.measure((_x, _y, _w, _h, _pageX, blockPageY) => {
      scrollViewRef.current?.measure((_sx, _sy, _sw, _sh, _spageX, svPageY) => {
        const relativeY = blockPageY - svPageY;
        scrollViewRef.current?.scrollTo({ y: Math.max(0, relativeY - 20), animated: true });
      });
    });
  }, [highlightBlockId]);

  useEffect(() => {
    if (!highlightBlockId || !blocks) return;
    const timer = setTimeout(scrollToBlock, 400);
    return () => clearTimeout(timer);
  }, [blocks, highlightBlockId, scrollToBlock]);

  const isWeb = Platform.OS === "web";
  const bottomPad = isWeb ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen
        options={{
          title: instance?.name ?? "Instance",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {instance && (
          <View
            style={[
              styles.hero,
              { borderBottomColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <View style={styles.heroRow}>
              <Text
                style={[styles.heroTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", flex: 1 }]}
                numberOfLines={1}
              >
                {instance.name}
              </Text>
              <Pressable
                onPress={() => setShowModal(true)}
                style={({ pressed }) => [
                  styles.addBtn,
                  { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
                ]}
                testID="new-block-btn"
              >
                <Feather name="plus" size={20} color="#fff" />
              </Pressable>
            </View>
            {instance.description ? (
              <Text
                style={[
                  styles.heroDescription,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {instance.description}
              </Text>
            ) : null}
          </View>
        )}

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomPad + 32 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
          >
            {(blocks ?? []).length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="box" size={48} color={colors.border} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  No blocks yet
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Tap + to add the first block
                </Text>
              </View>
            ) : (
              <View style={styles.blockList}>
                {(blocks ?? []).map((block: Block) => (
                  <View
                    key={block.id}
                    ref={(r) => { blockRefs.current.set(block.id, r); }}
                  >
                    <BlockRenderer
                      block={block}
                      highlightEventId={
                        block.id === highlightBlockId ? highlightEventId : undefined
                      }
                    />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <NewBlockModal
        visible={showModal}
        instanceId={instanceId}
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
  heroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroTitle: { fontSize: 26, letterSpacing: -0.3 },
  heroDescription: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  addBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16 },
  blockList: { gap: 16 },
  emptyState: { marginTop: 80, alignItems: "center", gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  // Modal / sheet
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  modalKAV: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 12, gap: 8 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 20, marginBottom: 8 },
  label: { fontSize: 13, marginBottom: 4, marginTop: 4 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  importanceRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  impBtn: { flex: 1, height: 32, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  impBtnText: { fontSize: 12 },
  typeCard: {
    width: "47%",
    borderWidth: 1.5,
    padding: 12,
    gap: 4,
  },
  typeLabel: { fontSize: 14 },
  typeDesc: { fontSize: 12 },
  input: { borderWidth: StyleSheet.hairlineWidth, padding: 12, fontSize: 15 },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnCancel: { borderWidth: StyleSheet.hairlineWidth },
  btnPrimary: {},
  btnText: { fontSize: 15 },
});
