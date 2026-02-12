import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";

export function PhotoPicker(props: {
  label: string;
  uri?: string;
  onChange: (uri: string | undefined) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function pick(source: "library" | "camera") {
    try {
      setBusy(true);
      const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Нет доступа", "Разрешение не выдано. Используем mock-фото.");
        props.onChange(`mock://photo/${Date.now()}`);
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      props.onChange(asset.uri);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{props.label}</Text>
      <View style={styles.preview}>
        {props.uri ? (
          props.uri.startsWith("mock://") ? (
            <MockImage uri={props.uri} />
          ) : (
            <Image source={{ uri: props.uri }} style={styles.image} contentFit="cover" />
          )
        ) : (
          <Text style={styles.placeholder}>Фото не выбрано</Text>
        )}
      </View>
      <View style={styles.actions}>
        <Button onPress={() => pick("camera")} loading={busy} variant="secondary">
          Камера (mock)
        </Button>
        <Button onPress={() => pick("library")} loading={busy} variant="secondary">
          Галерея
        </Button>
        {props.uri ? (
          <Pressable onPress={() => props.onChange(undefined)} style={styles.clear}>
            <Text style={styles.clearText}>Сбросить</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function MockImage(props: { uri: string }) {
  return (
    <View style={[styles.image, styles.mock]}>
      <Text style={styles.mockText}>MOCK
{props.uri.split("/").at(-1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, color: "#444", fontWeight: "600" },
  preview: {
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  placeholder: { color: "#777", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, flexWrap: "wrap", alignItems: "center" },
  clear: { paddingHorizontal: 8, paddingVertical: 6 },
  clearText: { color: "#b00020", fontWeight: "800" },
  mock: { alignItems: "center", justifyContent: "center" },
  mockText: { fontSize: 12, color: "#555", fontWeight: "900", textAlign: "center" },
});
