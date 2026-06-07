import { useListCategories } from "@workspace/api-client-react";
import type { Category } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
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

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: categories, isLoading, refetch, isRefetching } = useListCategories();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Databox
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Your personal data workspace
        </Text>
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
          scrollEnabled={!!(categories && categories.length > 0)}
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
              <Feather name="folder" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                No categories yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Create categories in the web app to see them here
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <CategoryCard
              category={item}
              onPress={() => router.push(`/categories/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 34,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  listEmpty: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
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
  emptyTitle: {
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
