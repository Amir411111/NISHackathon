import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AIAssistant } from "@/components/AIAssistant";
import { Button } from "@/components/Buttons";
import { CategorySelector } from "@/components/CategorySelector";
import { Field, Input } from "@/components/Form";
import { LocationPicker } from "@/components/LocationPicker";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Screen } from "@/components/Screen";
import { ui } from "@/constants/ui";
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
  const [priority, setPriority] = useState<RequestPriority>("MEDIUM");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (description.trim().length < 8) {
      Alert.alert("Недостаточно данных", "Добавьте описание (минимум 8 символов).");
      return;
    }
    if (!photoUri) {
      Alert.alert("Обязательное поле", "Добавьте фото проблемы.");
      return;
    }
    if (!location) {
      Alert.alert("Обязательное поле", "Укажите местоположение проблемы.");
      return;
    }

    const effectiveLocation: RequestLocation = location;

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

    const id = createRequest({ category, description: description.trim(), priority, photoUri, location: effectiveLocation });
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

      <Field label="Срочность">
        <View style={styles.priorityRow}>
          <PriorityChip title="Low" subtitle="Низкая" active={priority === "LOW"} onPress={() => setPriority("LOW")} />
          <PriorityChip title="Med" subtitle="Стандарт" active={priority === "MEDIUM"} onPress={() => setPriority("MEDIUM")} />
          <PriorityChip title="High" subtitle="Срочно" active={priority === "HIGH"} onPress={() => setPriority("HIGH")} />
        </View>
      </Field>

      <PhotoPicker label="Фото проблемы *" uri={photoUri} onChange={setPhotoUri} />

      <Field label="Местоположение *">
        <LocationPicker value={location} onChange={setLocation} />
      </Field>

      <AIAssistant
        role="CITIZEN"
        citizen={{
          description,
          hasPhoto: Boolean(photoUri),
          hasLocation: Boolean(location),
          photoUri,
          onApplyDescription: setDescription,
        }}
      />

      <View style={{ height: 6 }} />

      <Button onPress={submit} disabled={busy} loading={busy}>
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
  h1: { fontSize: 22, fontWeight: "900", color: ui.colors.text },
  priorityRow: { flexDirection: "row", gap: 10 },
  priChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
    backgroundColor: ui.colors.surfaceMuted,
  },
  priChipActive: { borderColor: ui.colors.primary, backgroundColor: ui.colors.primarySoft },
  priTitle: { fontSize: 13, fontWeight: "900", color: ui.colors.textMuted },
  priTitleActive: { color: ui.colors.primary },
  priSub: { fontSize: 11, fontWeight: "700", color: ui.colors.textMuted },
  priSubActive: { color: ui.colors.primary },
});
