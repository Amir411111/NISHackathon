import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { CategorySelector } from "@/components/CategorySelector";
import { Field, Input } from "@/components/Form";
import { LocationPicker } from "@/components/LocationPicker";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Screen } from "@/components/Screen";
import { useAppStore } from "@/store/useAppStore";
import type { Category, RequestLocation } from "@/types/domain";

export default function CitizenNewRequestScreen() {
  const createRequest = useAppStore((s) => s.createRequest);

  const [category, setCategory] = useState<Category>("LIGHTING");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [location, setLocation] = useState<RequestLocation | undefined>();
  const [addressLabel, setAddressLabel] = useState("");

  const canSubmit = useMemo(() => description.trim().length >= 8, [description]);

  function submit() {
    if (!canSubmit) {
      Alert.alert("Недостаточно данных", "Добавьте описание (минимум 8 символов).");
      return;
    }

    const id = createRequest({ category, description: description.trim(), photoUri, location, addressLabel: addressLabel.trim() || undefined });
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

      <PhotoPicker label="Фото проблемы (mock)" uri={photoUri} onChange={setPhotoUri} />

      <LocationPicker value={location} onChange={setLocation} />

      <View style={{ height: 6 }} />

      <Button onPress={submit} disabled={!canSubmit}>
        Отправить
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 18, fontWeight: "900", color: "#111" },
});
