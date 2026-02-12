import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { PhotoPicker } from "@/components/PhotoPicker";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { StatusTimeline } from "@/components/Status";
import { useNow } from "@/hooks/useNow";
import { startTask as apiStartTask, completeTask } from "@/services/requestService";
import { getWorkSeconds, useAppStore } from "@/store/useAppStore";
import { formatDuration } from "@/utils/time";

export default function WorkerTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow(1000);

  const request = useAppStore((s) => s.getRequestById(String(id)));
  const isOverdue = useAppStore((s) => (request ? s.isRequestOverdue(request, now) : false));

  const startWork = useAppStore((s) => s.startWork);
  const finishWork = useAppStore((s) => s.finishWork);
  const setAfterPhoto = useAppStore((s) => s.setAfterPhoto);
  const upsertRequest = useAppStore((s) => s.upsertRequest);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);

  if (!request) {
    return (
      <Screen>
        <Text style={styles.h1}>Задача не найдена</Text>
        <Button onPress={() => router.replace("/(worker)")} variant="secondary">
          К списку
        </Button>
      </Screen>
    );
  }

  const requestId = request.id;
  const afterPhotoUri = request.afterPhotoUri;

  const elapsed = getWorkSeconds(request, now);
  const canStart = request.status === "ASSIGNED";
  const canFinish = request.status === "IN_PROGRESS";

  async function onStart() {
    if (starting || completing) return;
    try {
      setStarting(true);
      const updated = await apiStartTask(requestId);
      upsertRequest(updated);
      startWork(requestId);
      return;
    } catch {
      // fallback
    } finally {
      setStarting(false);
    }
    startWork(requestId);
  }

  async function onComplete() {
    if (completing || starting) return;
    if (!afterPhotoUri) return;
    if (afterPhotoUri.startsWith("mock://")) {
      Alert.alert("Нужно реальное фото", "Для backend-загрузки приложите фото из камеры/галереи.");
      return;
    }

    try {
      setCompleting(true);
      const updated = await completeTask(requestId, afterPhotoUri);
      upsertRequest(updated);
      finishWork(requestId);
      return;
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "Не удалось завершить задачу. Проверьте, что backend запущен и фото прикрепилось.";
      Alert.alert("Ошибка", String(msg));
      return;
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Screen>
      <RequestCard request={request} overdue={isOverdue} />

      <Section title="Фото 'До'">
        <PhotoPreview uri={request.beforePhotoUri} />
      </Section>

      <Section title="Фото 'После'">
        {request.status === "DONE" ? (
          <PhotoPreview uri={request.afterPhotoUri} />
        ) : (
          <PhotoPicker label="После" uri={request.afterPhotoUri} onChange={(u) => setAfterPhoto(request.id, u)} />
        )}
      </Section>

      <Section title="Таймер учета времени">
        <View style={styles.timerBox}>
          <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
          <Text style={styles.timerMeta}>
            {request.status === "IN_PROGRESS" ? "Идет работа" : request.workEndedAt ? "Завершено" : "Не запущено"}
          </Text>
        </View>
        {canStart ? (
          <Button onPress={onStart} loading={starting} disabled={starting || completing}>
            Начать работу
          </Button>
        ) : null}
      </Section>

      {canFinish ? (
        <Section title="Завершение">
          <Button onPress={onComplete} loading={completing} disabled={!request.afterPhotoUri || completing || starting}>
            Завершить
          </Button>
          {!request.afterPhotoUri ? <Text style={styles.hint}>Для завершения приложите фото «После» (mock).</Text> : null}
        </Section>
      ) : null}

      <Section title="История">
        <StatusTimeline history={request.statusHistory} />
      </Section>
    </Screen>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}

function PhotoPreview(props: { uri?: string }) {
  if (!props.uri) {
    return (
      <View style={styles.photoEmpty}>
        <Text style={styles.photoEmptyText}>Фото не прикреплено</Text>
      </View>
    );
  }

  if (props.uri.startsWith("mock://")) {
    return (
      <View style={[styles.photo, styles.mockPhoto]}>
        <Text style={styles.mockText}>MOCK PHOTO</Text>
      </View>
    );
  }

  return <Image source={{ uri: props.uri }} style={styles.photo} contentFit="cover" />;
}

const styles = StyleSheet.create({
  h1: { fontSize: 18, fontWeight: "900" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  timerBox: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa", alignItems: "center", gap: 6 },
  timer: { fontSize: 34, fontWeight: "900", color: "#111" },
  timerMeta: { fontSize: 12, fontWeight: "800", color: "#666" },
  hint: { fontSize: 12, color: "#666", fontWeight: "700" },
  photo: { height: 180, borderRadius: 14, overflow: "hidden" },
  photoEmpty: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmptyText: { fontWeight: "800", color: "#666" },
  mockPhoto: { backgroundColor: "#fafafa", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#eee" },
  mockText: { fontWeight: "900", color: "#666" },
});
