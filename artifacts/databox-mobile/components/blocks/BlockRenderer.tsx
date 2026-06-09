import type { Block } from "@workspace/api-client-react";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { RichTextBlock } from "./RichTextBlock";
import { TodoBlock } from "./TodoBlock";
import { CalendarBlock } from "./CalendarBlock";
import { PhotoBlock } from "./PhotoBlock";
import { PdfBlock } from "./PdfBlock";
import { ListBlock } from "./ListBlock";

const BLOCK_TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  richtext: "file-text",
  todo: "check-square",
  calendar: "calendar",
  photo: "image",
  pdf: "book-open",
  list: "list",
};

function importanceBadgeColor(imp: number): { bg: string; text: string } {
  if (imp <= 2) return { bg: "#F1F5F9", text: "#64748B" };
  if (imp <= 4) return { bg: "#EFF6FF", text: "#3B82F6" };
  if (imp <= 6) return { bg: "#F0FDF9", text: "#0D9488" };
  if (imp <= 8) return { bg: "#FFFBEB", text: "#D97706" };
  return { bg: "#FFF1EE", text: "#E87A50" };
}

export function BlockRenderer({
  block,
  highlightEventId,
}: {
  block: Block;
  highlightEventId?: number;
}) {
  const colors = useColors();
  const icon = BLOCK_TYPE_ICONS[block.type] ?? "box";
  const imp = block.importance;
  const badgeColors = imp ? importanceBadgeColor(imp) : null;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Feather name={icon} size={14} color={colors.mutedForeground} />
        <Text
          style={[
            styles.title,
            { color: block.title ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
          ]}
          numberOfLines={1}
        >
          {block.title || `Untitled ${block.type}`}
        </Text>
        {badgeColors && (
          <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
            <Feather name="zap" size={9} color={badgeColors.text} />
            <Text style={[styles.badgeText, { color: badgeColors.text, fontFamily: "Inter_700Bold" }]}>
              {imp}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {block.type === "richtext" && <RichTextBlock block={block} />}
        {block.type === "todo" && <TodoBlock block={block} />}
        {block.type === "calendar" && (
          <CalendarBlock block={block} highlightEventId={highlightEventId} />
        )}
        {block.type === "photo" && <PhotoBlock block={block} />}
        {block.type === "pdf" && <PdfBlock block={block} />}
        {block.type === "list" && <ListBlock block={block} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 14,
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
  },
  content: {
    padding: 14,
  },
});
