import * as Location from "expo-location";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import type { RequestLocation } from "@/types/domain";

const FALLBACK: RequestLocation = { lat: 43.238949, lon: 76.889709, accuracy: 999 };

export function LocationPicker(props: {
  value?: RequestLocation;
  onChange: (loc: RequestLocation) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function detect() {
    try {
      setBusy(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Нет доступа", "Разрешение на геолокацию не выдано. Используем mock-координаты.");
        props.onChange(FALLBACK);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      props.onChange({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy ?? undefined });
    } catch {
      props.onChange(FALLBACK);
    } finally {
      setBusy(false);
    }
  }

  const label = props.value ? `${props.value.lat.toFixed(5)}, ${props.value.lon.toFixed(5)} (±${Math.round(props.value.accuracy ?? 0)}м)` : "Не определено";

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Геолокация</Text>
      <Text style={styles.value}>{label}</Text>
      <Button onPress={detect} loading={busy} variant="secondary">
          Определить
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, color: "#444", fontWeight: "600" },
  value: { fontSize: 14, color: "#111", fontWeight: "700" },
});
