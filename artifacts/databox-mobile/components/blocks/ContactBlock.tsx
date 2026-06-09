import {
  useListContactCards,
} from "@workspace/api-client-react";
import type { Block, ContactCard } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const domain = process.env.EXPO_PUBLIC_DOMAIN;

function avatarUri(card: ContactCard): string | null {
  if (!card.photoPath) return null;
  return `https://${domain}/api/storage${card.photoPath}`;
}

function getInitials(first: string, last: string): string {
  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "?";
}

function textOnColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  return l < 0.85 ? "#ffffff" : "#1a1a1a";
}

function ContactAvatar({ card, size = 44 }: { card: ContactCard; size?: number }) {
  const uri = avatarUri(card);
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
      />
    );
  }

  const initials = getInitials(card.firstName, card.lastName);
  const fg = textOnColor(card.color);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: card.color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: fg, fontSize: size * 0.38, fontFamily: "Inter_600SemiBold" }}>
        {initials}
      </Text>
    </View>
  );
}

function ContactCardRow({ card }: { card: ContactCard }) {
  const colors = useColors();

  const handleEmail = () => {
    if (card.email) Linking.openURL(`mailto:${card.email}`);
  };

  const handlePhone = () => {
    if (card.phone) Linking.openURL(`tel:${card.phone}`);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <ContactAvatar card={card} size={46} />

      <View style={styles.cardBody}>
        <Text
          style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
          numberOfLines={1}
        >
          {card.firstName} {card.lastName}
        </Text>

        {card.description ? (
          <Text
            style={[styles.description, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
            numberOfLines={2}
          >
            {card.description}
          </Text>
        ) : null}

        {(card.email || card.phone) ? (
          <View style={styles.contacts}>
            {card.email ? (
              <Pressable
                onPress={handleEmail}
                style={({ pressed }) => [styles.contactRow, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Feather name="mail" size={11} color={colors.primary} />
                <Text
                  style={[styles.contactText, { color: colors.primary, fontFamily: "Inter_400Regular" }]}
                  numberOfLines={1}
                >
                  {card.email}
                </Text>
              </Pressable>
            ) : null}
            {card.phone ? (
              <Pressable
                onPress={handlePhone}
                style={({ pressed }) => [styles.contactRow, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Feather name="phone" size={11} color={colors.primary} />
                <Text
                  style={[styles.contactText, { color: colors.primary, fontFamily: "Inter_400Regular" }]}
                >
                  {card.phone}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function ContactBlock({ block }: { block: Block }) {
  const colors = useColors();
  const { data: cards, isLoading } = useListContactCards(block.id, {
    query: { enabled: !!block.id },
  });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <Text
        style={[styles.empty, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
      >
        No contacts
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {cards.map((card) => (
        <ContactCardRow key={card.id} card={card} />
      ))}
      <Text
        style={[styles.count, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
      >
        {cards.length} {cards.length === 1 ? "contact" : "contacts"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  loading: { paddingVertical: 8, alignItems: "center" },
  empty: { fontSize: 14, fontStyle: "italic" },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardBody: { flex: 1, gap: 2 },
  name: { fontSize: 14, lineHeight: 20 },
  description: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  contacts: { marginTop: 5, gap: 4 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  contactText: { fontSize: 12, flex: 1 },
  count: { fontSize: 12, marginTop: 2 },
});
