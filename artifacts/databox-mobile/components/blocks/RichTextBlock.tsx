import type { Block } from "@workspace/api-client-react";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

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

export function RichTextBlock({ block }: { block: Block }) {
  const colors = useColors();

  const text = useMemo(() => {
    if (!block.content) return "";
    const content = block.content as Record<string, unknown>;
    if (typeof content.html === "string") {
      return stripHtml(content.html);
    }
    if (typeof content.text === "string") {
      return content.text;
    }
    return "";
  }, [block.content]);

  if (!text) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Empty note
        </Text>
      </View>
    );
  }

  return (
    <Text
      style={[
        styles.text,
        { color: colors.foreground, fontFamily: "Inter_400Regular" },
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  empty: {
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
});
