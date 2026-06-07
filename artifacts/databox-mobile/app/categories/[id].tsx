import { useGetCategory, useListInstances } from "@workspace/api-client-react";
import type { Instance } from "@workspace/api-client-react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = parseInt(id ?? "0", 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Category hero */}
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
                  Add instances in the web app to see them here
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
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  heroTitle: {
    fontSize: 22,
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
  list: { padding: 16 },
  listEmpty: { flex: 1 },
  card: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
  },
  cardDescription: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
