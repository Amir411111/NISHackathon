import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";

export function PhotoPicker(props: {
  label: string;
  uri?: string;
  onChange: (uri: string | undefined) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function captureFromWebStream(): Promise<string | undefined> {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const mediaDevices = (navigator as any)?.mediaDevices;
    if (!mediaDevices?.getUserMedia) return undefined;

    let stream: MediaStream | null = null;
    let videoEl: HTMLVideoElement | null = null;
    let canvasEl: HTMLCanvasElement | null = null;

    const cleanup = () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoEl?.parentNode) videoEl.parentNode.removeChild(videoEl);
      if (canvasEl?.parentNode) canvasEl.parentNode.removeChild(canvasEl);
    };

    try {
      stream = await mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      videoEl = document.createElement("video");
      videoEl.setAttribute("playsinline", "true");
      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.style.position = "fixed";
      videoEl.style.left = "-9999px";
      videoEl.srcObject = stream;
      document.body.appendChild(videoEl);

      await videoEl.play();
      await new Promise((r) => setTimeout(r, 250));

      const confirmed = window.confirm("Камера включена. Нажмите OK, чтобы сделать снимок.");
      if (!confirmed) {
        cleanup();
        return undefined;
      }

      canvasEl = document.createElement("canvas");
      const width = videoEl.videoWidth || 1280;
      const height = videoEl.videoHeight || 720;
      canvasEl.width = width;
      canvasEl.height = height;
      canvasEl.style.position = "fixed";
      canvasEl.style.left = "-9999px";
      document.body.appendChild(canvasEl);

      const ctx = canvasEl.getContext("2d");
      if (!ctx) {
        cleanup();
        return undefined;
      }

      ctx.drawImage(videoEl, 0, 0, width, height);
      const dataUri = canvasEl.toDataURL("image/jpeg", 0.85);
      cleanup();
      return dataUri;
    } catch {
      cleanup();
      return undefined;
    }
  }

  async function pickFromWebCamera(): Promise<string | undefined> {
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;

    return new Promise((resolve) => {
      const input = document.createElement("input");
      let settled = false;

      const finish = (uri?: string) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("focus", onFocusBack);
        input.onchange = null;
        (input as any).oncancel = null;
        if (input.parentNode) input.parentNode.removeChild(input);
        resolve(uri);
      };

      const onFocusBack = () => {
        // If picker was closed without selecting a file, many browsers emit only focus.
        setTimeout(() => {
          const file = input.files?.[0];
          if (!file) finish(undefined);
        }, 250);
      };

      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
      (input as any).capture = "environment";
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          finish(undefined);
          return;
        }
        finish(URL.createObjectURL(file));
      };
      (input as any).oncancel = () => finish(undefined);

      window.addEventListener("focus", onFocusBack);
      input.click();
    });
  }

  async function pick(source: "library" | "camera") {
    try {
      setBusy(true);

      if (Platform.OS === "web" && source === "camera") {
        let cameraUri = await captureFromWebStream();
        if (!cameraUri) cameraUri = await pickFromWebCamera();
        if (!cameraUri) return;
        props.onChange(cameraUri);
        return;
      }

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
          Камера
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
