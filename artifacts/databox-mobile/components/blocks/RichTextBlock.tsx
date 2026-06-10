import {
  useUpdateBlock,
  getListBlocksQueryKey,
} from "@workspace/api-client-react";
import type { Block } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState, useCallback } from "react";
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

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textToHtml(plain: string): string {
  return plain
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function RichTextBlock({
  block,
  onScrollRequest,
}: {
  block: Block;
  onScrollRequest?: () => void;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const updateBlock = useUpdateBlock();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const text = useMemo(() => {
    if (!block.content) return "";
    const content = block.content as Record<string, unknown>;
    if (typeof content.html === "string") return stripHtml(content.html);
    if (typeof content.text === "string") return content.text;
    return "";
  }, [block.content]);

  const startEdit = useCallback(() => {
    setDraft(text);
    setEditing(true);
    onScrollRequest?.();
  }, [text, onScrollRequest]);

  const handleSave = () => {
    const trimmed = draft.trim();
    updateBlock.mutate(
      {
        id: block.id,
        data: { content: trimmed ? { html: textToHtml(trimmed) } : null },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListBlocksQueryKey(block.instanceId),
          });
          setEditing(false);
        },
        onError: () => Alert.alert("Error", "Could not save note."),
      },
    );
  };

  const handleCancel = () => {
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={styles.editContainer}>
        <TextInput
          style={[
            styles.textInput,
            {
              color: colors.foreground,
              borderColor: colors.border,
              borderRadius: colors.radius,
              fontFamily: "Inter_400Regular",
            },
          ]}
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          placeholder="Write your note…"
          placeholderTextColor={colors.mutedForeground}
          textAlignVertical="top"
          onFocus={onScrollRequest}
        />
        <View style={styles.editButtons}>
          <Pressable
            onPress={handleCancel}
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
            onPress={handleSave}
            disabled={updateBlock.isPending}
            style={[
              styles.btnPrimary,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: updateBlock.isPending ? 0.6 : 1,
              },
            ]}
          >
            {updateBlock.isPending ? (
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

  return (
    <Pressable
      onPress={startEdit}
      style={({ pressed }) => [styles.readContainer, { opacity: pressed ? 0.75 : 1 }]}
    >
      {text ? (
        <Text
          style={[
            styles.text,
            { color: colors.foreground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {text}
        </Text>
      ) : (
        <Text
          style={[
            styles.emptyText,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Empty note — tap to edit
        </Text>
      )}
      <View style={styles.editHint}>
        <Feather name="edit-2" size={12} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  readContainer: {
    position: "relative",
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    paddingRight: 20,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  editHint: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  editContainer: {
    gap: 8,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
  },
  editButtons: {
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
