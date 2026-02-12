import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { PhotoPicker } from "@/components/PhotoPicker";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { StatusTimeline } from "@/components/Status";
import { useNow } from "@/hooks/useNow";
import { getWorkSeconds, useAppStore } from "@/store/useAppStore";
import { formatDuration } from "@/utils/time";

export default function WorkerTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow(1000);

  const request = useAppStore((s) => s.getRequestById(String(id)));
  const isOverdue = useAppStore((s) => (request ? s.isRequestOverdue(request, now) : false));

  const startWork = useAppStore((s) => s.startWork);
  const finishWork = useAppStore((s) => s.finishWork);
  const setBeforePhoto = useAppStore((s) => s.setBeforePhoto);
  const setAfterPhoto = useAppStore((s) => s.setAfterPhoto);

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

  const elapsed = getWorkSeconds(request, now);
  const canStart = request.status === "ASSIGNED";
  const canFinish = request.status === "IN_PROGRESS";

  return (
    <Screen>
      <RequestCard request={request} overdue={isOverdue} />

      <Section title="Фото 'До'">
        <PhotoPicker label="До (mock)" uri={request.beforePhotoUri} onChange={(u) => setBeforePhoto(request.id, u)} />
      </Section>

      <Section title="Фото 'После'">
        <PhotoPicker label="После (mock)" uri={request.afterPhotoUri} onChange={(u) => setAfterPhoto(request.id, u)} />
      </Section>

      <Section title="Таймер учета времени">
        <View style={styles.timerBox}>
          <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
          <Text style={styles.timerMeta}>
            {request.status === "IN_PROGRESS" ? "Идет работа" : request.workEndedAt ? "Завершено" : "Не запущено"}
          </Text>
        </View>
        {canStart ? (
          <Button onPress={() => startWork(request.id)}>
            Начать работу
          </Button>
        ) : null}
      </Section>

      {canFinish ? (
        <Section title="Завершение">
          <Button onPress={() => finishWork(request.id)} disabled={!request.afterPhotoUri}>
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

const styles = StyleSheet.create({
  h1: { fontSize: 18, fontWeight: "900" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  timerBox: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa", alignItems: "center", gap: 6 },
  timer: { fontSize: 34, fontWeight: "900", color: "#111" },
  timerMeta: { fontSize: 12, fontWeight: "800", color: "#666" },
  hint: { fontSize: 12, color: "#666", fontWeight: "700" },
});
