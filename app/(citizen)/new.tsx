import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { CategorySelector } from "@/components/CategorySelector";
import { Field, Input } from "@/components/Form";
import { LocationPicker } from "@/components/LocationPicker";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Screen } from "@/components/Screen";
import { createRequest as apiCreateRequest } from "@/services/requestService";
import { useAppStore } from "@/store/useAppStore";
import type { Category, RequestLocation, RequestPriority } from "@/types/domain";

export default function CitizenNewRequestScreen() {
  const createRequest = useAppStore((s) => s.createRequest);
  const upsertRequest = useAppStore((s) => s.upsertRequest);

  const [category, setCategory] = useState<Category>("LIGHTING");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [location, setLocation] = useState<RequestLocation | undefined>();
  const [addressLabel, setAddressLabel] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("MEDIUM");
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => description.trim().length >= 8, [description]);

  async function submit() {
    if (!canSubmit) {
      Alert.alert("Недостаточно данных", "Добавьте описание (минимум 8 символов).");
      return;
    }

    // Backend requires coordinates; if user didn't pick location, use a mock fallback.
    const effectiveLocation: RequestLocation = location ?? { lat: 43.238949, lon: 76.889709, accuracy: 999 };

    try {
      setBusy(true);
      const created = await apiCreateRequest({
        category,
        description: description.trim(),
        priority,
        location: effectiveLocation,
        photoUri,
      });
      upsertRequest(created);
      router.replace(`/(citizen)/requests/${created.id}`);
      return;
    } catch {
      // fallback to mock-only flow
    } finally {
      setBusy(false);
    }

    const id = createRequest({ category, description: description.trim(), priority, photoUri, location: effectiveLocation, addressLabel: addressLabel.trim() || undefined });
    router.replace(`/(citizen)/requests/${id}`);
  }

  return (
    <Screen>
      <Text style={styles.h1}>Подача заявки</Text>

      <Field label="Категория">
        <CategorySelector value={category} onChange={setCategory} />
      </Field>

      <Field label="Описание">
        <Input value={description} onChangeText={setDescription} placeholder="Опишите проблему…" multiline />
      </Field>

      <Field label="Адрес (опционально)">
        <Input value={addressLabel} onChangeText={setAddressLabel} placeholder="Напр.: ул. Абая, 10" />
      </Field>

      <Field label="Срочность">
        <View style={styles.priorityRow}>
          <PriorityChip title="Low" subtitle="Низкая" active={priority === "LOW"} onPress={() => setPriority("LOW")} />
          <PriorityChip title="Med" subtitle="Стандарт" active={priority === "MEDIUM"} onPress={() => setPriority("MEDIUM")} />
          <PriorityChip title="High" subtitle="Срочно" active={priority === "HIGH"} onPress={() => setPriority("HIGH")} />
        </View>
      </Field>

      <PhotoPicker label="Фото проблемы (mock)" uri={photoUri} onChange={setPhotoUri} />

      <LocationPicker value={location} onChange={setLocation} />

      <View style={{ height: 6 }} />

      <Button onPress={submit} disabled={!canSubmit} loading={busy}>
        Отправить
      </Button>
    </Screen>
  );
}

function PriorityChip(props: { title: string; subtitle: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.priChip, props.active && styles.priChipActive]} onPress={props.onPress}>
      <Text style={[styles.priTitle, props.active && styles.priTitleActive]}>{props.title}</Text>
      <Text style={[styles.priSub, props.active && styles.priSubActive]}>{props.subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 18, fontWeight: "900", color: "#111" },
  priorityRow: { flexDirection: "row", gap: 10 },
  priChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
    backgroundColor: "#fff",
  },
  priChipActive: { borderColor: "#111", backgroundColor: "#f7f7f7" },
  priTitle: { fontSize: 13, fontWeight: "900", color: "#555" },
  priTitleActive: { color: "#111" },
  priSub: { fontSize: 11, fontWeight: "700", color: "#777" },
  priSubActive: { color: "#111" },
});
