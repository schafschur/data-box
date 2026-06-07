import type { Block } from "@workspace/api-client-react";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { RichTextBlock } from "./RichTextBlock";
import { TodoBlock } from "./TodoBlock";
import { CalendarBlock } from "./CalendarBlock";
import { PhotoBlock } from "./PhotoBlock";

const BLOCK_TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  richtext: "file-text",
  todo: "check-square",
  calendar: "calendar",
  photo: "image",
};

export function BlockRenderer({ block }: { block: Block }) {
  const colors = useColors();
  const icon = BLOCK_TYPE_ICONS[block.type] ?? "box";

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
      {block.title ? (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Feather name={icon} size={14} color={colors.mutedForeground} />
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {block.title}
          </Text>
        </View>
      ) : null}

      <View style={styles.content}>
        {block.type === "richtext" && <RichTextBlock block={block} />}
        {block.type === "todo" && <TodoBlock block={block} />}
        {block.type === "calendar" && <CalendarBlock block={block} />}
        {block.type === "photo" && <PhotoBlock block={block} />}
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
  content: {
    padding: 14,
  },
});
