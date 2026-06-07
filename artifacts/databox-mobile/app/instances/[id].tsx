import { useGetInstance, useListBlocks } from "@workspace/api-client-react";
import type { Block } from "@workspace/api-client-react";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";

export default function InstanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const instanceId = parseInt(id ?? "0", 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();

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
        {/* Instance hero */}
        {instance && (
          <View
            style={[
              styles.hero,
              { borderBottomColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <Text
              style={[styles.heroTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
            >
              {instance.name}
            </Text>
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
                  Add blocks in the web app to see them here
                </Text>
              </View>
            ) : (
              <View style={styles.blockList}>
                {(blocks ?? []).map((block: Block) => (
                  <BlockRenderer key={block.id} block={block} />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
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
  heroTitle: {
    fontSize: 26,
    letterSpacing: -0.3,
  },
  heroDescription: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
  },
  blockList: {
    gap: 16,
  },
  emptyState: {
    marginTop: 80,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
