import {
  useListPhotos,
  getListPhotosQueryKey,
} from "@workspace/api-client-react";
import type { Block, Photo } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

const THUMB_SIZE = (Dimensions.get("window").width - 32 - 28 - 8 - 14 * 2) / 3;

function PhotoThumb({ photo, onPress }: { photo: Photo; onPress: () => void }) {
  const colors = useColors();
  const uri = photo.url ?? "";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.thumb,
        {
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: colors.radius,
          backgroundColor: colors.muted,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.thumbImage, { borderRadius: colors.radius }]}
          resizeMode="cover"
        />
      ) : (
        <Feather name="image" size={24} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export function PhotoBlock({ block }: { block: Block }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: photos, isLoading } = useListPhotos(block.id, {
    query: { enabled: !!block.id },
  });
  const [uploading, setUploading] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as unknown as Blob);

      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const res = await fetch(
        `https://${domain}/api/blocks/${block.id}/photos/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Upload failed");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey(block.id) });
    } catch {
      Alert.alert("Upload failed", "Could not upload the photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your photo library in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not available", "Camera is not available in the web preview.");
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow camera access in Settings.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(photos ?? []).length > 0 ? (
        <View style={styles.grid}>
          {(photos ?? []).map((photo) => (
            <PhotoThumb
              key={photo.id}
              photo={photo}
              onPress={() => setLightboxUri(photo.url ?? null)}
            />
          ))}
          {uploading && (
            <View
              style={[
                styles.thumb,
                styles.uploadingThumb,
                {
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: colors.radius,
                  backgroundColor: colors.muted,
                },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>
      ) : uploading ? (
        <View style={[styles.uploading, { borderRadius: colors.radius, backgroundColor: colors.muted }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.uploadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Uploading...
          </Text>
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          No photos yet
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={pickFromCamera}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: colors.border,
              borderRadius: colors.radius,
              backgroundColor: colors.card,
              opacity: pressed || uploading ? 0.6 : 1,
            },
          ]}
          disabled={uploading}
          testID="camera-btn"
        >
          <Feather name="camera" size={16} color={colors.foreground} />
          <Text style={[styles.actionText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            Camera
          </Text>
        </Pressable>
        <Pressable
          onPress={pickFromLibrary}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: colors.border,
              borderRadius: colors.radius,
              backgroundColor: colors.card,
              opacity: pressed || uploading ? 0.6 : 1,
            },
          ]}
          disabled={uploading}
          testID="library-btn"
        >
          <Feather name="image" size={16} color={colors.foreground} />
          <Text style={[styles.actionText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            Library
          </Text>
        </Pressable>
      </View>

      {/* Lightbox */}
      <Modal
        visible={!!lightboxUri}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setLightboxUri(null)}
        >
          {lightboxUri ? (
            <Image
              source={{ uri: lightboxUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  loading: { paddingVertical: 8, alignItems: "center" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  thumb: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  uploadingThumb: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploading: {
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  uploadingText: { fontSize: 13 },
  emptyText: { fontSize: 14, fontStyle: "italic" },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontSize: 13 },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "80%",
  },
});
