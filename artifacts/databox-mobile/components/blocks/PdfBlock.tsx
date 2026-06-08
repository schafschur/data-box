import type { Block } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface PdfEntry {
  objectPath: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

const domain = process.env.EXPO_PUBLIC_DOMAIN;

function pdfUrl(pdf: PdfEntry): string {
  return `https://${domain}/api/storage${pdf.objectPath}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PdfBlock({ block }: { block: Block }) {
  const colors = useColors();
  const content = block.content as { pdfs?: PdfEntry[] } | null;
  const pdfs = content?.pdfs ?? [];
  const [opening, setOpening] = React.useState<string | null>(null);

  const openPdf = async (pdf: PdfEntry) => {
    const url = pdfUrl(pdf);
    setOpening(pdf.objectPath);
    try {
      await WebBrowser.openBrowserAsync(url);
    } finally {
      setOpening(null);
    }
  };

  if (pdfs.length === 0) {
    return (
      <Text
        style={[
          styles.emptyText,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        No PDFs uploaded yet
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {pdfs.map((pdf) => {
        const isOpening = opening === pdf.objectPath;
        return (
          <Pressable
            key={pdf.objectPath}
            onPress={() => openPdf(pdf)}
            disabled={!!opening}
            style={({ pressed }) => [
              styles.row,
              {
                borderColor: colors.border,
                borderRadius: colors.radius,
                backgroundColor: colors.card,
                opacity: pressed || isOpening ? 0.65 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: "#FEF2F2", borderRadius: colors.radius - 2 },
              ]}
            >
              <Feather name="file-text" size={16} color="#EF4444" />
            </View>

            <View style={styles.info}>
              <Text
                style={[
                  styles.filename,
                  { color: colors.foreground, fontFamily: "Inter_500Medium" },
                ]}
                numberOfLines={1}
              >
                {pdf.filename}
              </Text>
              <Text
                style={[
                  styles.meta,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {formatSize(pdf.size)} · {formatDate(pdf.uploadedAt)}
              </Text>
            </View>

            {isOpening ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather
                name="external-link"
                size={14}
                color={colors.mutedForeground}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  filename: {
    fontSize: 13,
  },
  meta: {
    fontSize: 11,
  },
});
