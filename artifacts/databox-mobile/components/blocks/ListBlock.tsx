import {
  useListListItems,
  getListListItemsQueryKey,
} from "@workspace/api-client-react";
import type { Block, ListItem } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

function ListItemRow({ item }: { item: ListItem }) {
  const colors = useColors();
  const hasDetail = !!(item.description || item.notes);
  const [expanded, setExpanded] = useState(false);

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
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "Inter_500Medium" },
          ]}
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
      </View>

      {expanded && hasDetail && (
        <View style={styles.detail}>
          {item.description ? (
            <Text
              style={[
                styles.description,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              {item.description}
            </Text>
          ) : null}
          {item.notes ? (
            <Text
              style={[
                styles.notes,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              {item.notes}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export function ListBlock({ block }: { block: Block }) {
  const colors = useColors();
  const { data: items, isLoading } = useListListItems(block.id, {
    query: { enabled: !!block.id },
  });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Text
        style={[
          styles.empty,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        No items
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <ListItemRow key={item.id} item={item} />
      ))}
      <Text
        style={[
          styles.count,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        {items.length} {items.length === 1 ? "item" : "items"}
        {items.some((i) => i.description || i.notes) ? " · tap to expand" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  loading: { paddingVertical: 8, alignItems: "center" },
  empty: { fontSize: 14, fontStyle: "italic" },
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
  detail: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingLeft: 28,
    gap: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  notes: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
    opacity: 0.7,
  },
  count: {
    fontSize: 12,
    marginTop: 2,
  },
});
