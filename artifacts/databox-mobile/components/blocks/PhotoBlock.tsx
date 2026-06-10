import {
  useListPhotos,
  useUpdatePhoto,
  useDeletePhoto,
  getListPhotosQueryKey,
} from "@workspace/api-client-react";
import type { Block, Photo } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const THUMB_SIZE = (Dimensions.get("window").width - 32 - 28 - 8 - 14 * 2) / 3;

const domain = process.env.EXPO_PUBLIC_DOMAIN;

function photoUri(photo: Photo): string {
  if (!photo.objectPath) return "";
  return `https://${domain}/api/storage${photo.objectPath}`;
}

function PhotoThumb({ photo, onPress }: { photo: Photo; onPress: () => void }) {
  const colors = useColors();
  const uri = photoUri(photo);

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

type ExtPhoto = Photo & { notes?: string | null; displayDate?: string | null; photoCategory?: string | null };

function PhotoLightbox({
  photo,
  onClose,
  onDeleted,
  onUpdated,
}: {
  photo: ExtPhoto;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();

  const [caption, setCaption] = useState(photo.caption ?? "");
  const [notes, setNotes] = useState(photo.notes ?? "");
  const [displayDate, setDisplayDate] = useState(
    photo.displayDate ?? photo.createdAt.slice(0, 10)
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCaption(photo.caption ?? "");
    setNotes(photo.notes ?? "");
    setDisplayDate(photo.displayDate ?? photo.createdAt.slice(0, 10));
    setConfirmDelete(false);
  }, [photo.id]);

  function saveField(field: string, value: string) {
    setSaving(true);
    updatePhoto.mutate(
      { id: photo.id, data: { [field]: value.trim() || null } as Record<string, string | null> },
      {
        onSuccess: () => { onUpdated(); setSaving(false); },
        onError: () => setSaving(false),
      }
    );
  }

  function handleDelete() {
    setDeleting(true);
    deletePhoto.mutate(
      { id: photo.id },
      {
        onSuccess: () => {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          onDeleted();
        },
        onError: () => {
          setDeleting(false);
          Alert.alert("Error", "Could not delete the photo. Please try again.");
        },
      }
    );
  }

  const uri = photoUri(photo);

  return (
    <Modal
      visible
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.lbContainer, { backgroundColor: "#0a0a0a" }]}>
        {/* Top bar */}
        <View style={[styles.lbTopBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.lbIconBtn} hitSlop={8}>
            <Feather name="x" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          {saving && (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
          )}
          {confirmDelete ? (
            <View style={styles.lbDeleteConfirm}>
              <TouchableOpacity onPress={() => setConfirmDelete(false)} style={styles.lbCancelBtn}>
                <Text style={styles.lbCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                style={styles.lbConfirmBtn}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#f87171" />
                  : <Text style={styles.lbConfirmText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setConfirmDelete(true)}
              style={styles.lbIconBtn}
              hitSlop={8}
            >
              <Feather name="trash-2" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Image */}
        <View style={styles.lbImageArea}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.lbImage}
              resizeMode="contain"
            />
          ) : (
            <Feather name="image" size={48} color="rgba(255,255,255,0.2)" />
          )}
        </View>

        {/* Metadata panel */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.lbPanel}
        >
          <ScrollView
            style={[styles.lbScroll, { backgroundColor: "#161616" }]}
            contentContainerStyle={[
              styles.lbScrollContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <LbField
              label="Caption"
              value={caption}
              onChange={setCaption}
              onBlur={() => saveField("caption", caption)}
              placeholder="Add a caption…"
            />
            <LbField
              label="Notes"
              value={notes}
              onChange={setNotes}
              onBlur={() => saveField("notes", notes)}
              placeholder="Add notes…"
              multiline
            />
            <LbField
              label="Date"
              value={displayDate}
              onChange={setDisplayDate}
              onBlur={() => saveField("displayDate", displayDate)}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function LbField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numbers-and-punctuation";
}) {
  return (
    <View style={styles.lbFieldRow}>
      <Text style={styles.lbFieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        style={[
          styles.lbFieldInput,
          multiline && styles.lbFieldInputMulti,
        ]}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.2)"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        returnKeyType={multiline ? "default" : "done"}
        onSubmitEditing={multiline ? undefined : onBlur}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

export function PhotoBlock({ block }: { block: Block }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: photos, isLoading } = useListPhotos(block.id, {
    query: { enabled: !!block.id },
  });
  const [uploading, setUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<ExtPhoto | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey(block.id) });

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
        { method: "POST", body: formData }
      );

      if (!res.ok) throw new Error("Upload failed");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      invalidate();
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
              onPress={() => setLightboxPhoto(photo as ExtPhoto)}
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

      {lightboxPhoto && (
        <PhotoLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onDeleted={() => {
            setLightboxPhoto(null);
            invalidate();
          }}
          onUpdated={invalidate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  loading: { paddingVertical: 8, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  thumb: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  uploadingThumb: { alignItems: "center", justifyContent: "center" },
  uploading: { padding: 16, alignItems: "center", gap: 8 },
  uploadingText: { fontSize: 13 },
  emptyText: { fontSize: 14, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 8 },
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

  lbContainer: { flex: 1 },
  lbTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  lbIconBtn: { padding: 6 },
  lbDeleteConfirm: { flexDirection: "row", alignItems: "center", gap: 12 },
  lbCancelBtn: { padding: 6 },
  lbCancelText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  lbConfirmBtn: { padding: 6 },
  lbConfirmText: { color: "#f87171", fontSize: 14, fontWeight: "600" },
  lbImageArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
  },
  lbImage: { width: "100%", height: "100%" },
  lbPanel: { flexShrink: 0, maxHeight: "42%" },
  lbScroll: { flexGrow: 0 },
  lbScrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  lbFieldRow: { gap: 4 },
  lbFieldLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "600",
  },
  lbFieldInput: {
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  lbFieldInputMulti: {
    minHeight: 72,
    textAlignVertical: "top",
    paddingTop: 8,
  },
});
