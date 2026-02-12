import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { StatusTimeline } from "@/components/Status";
import { ui } from "@/constants/ui";
import { useNow } from "@/hooks/useNow";
import { useAppStore } from "@/store/useAppStore";

export default function AdminRequestReadOnlyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow(1000);

  const request = useAppStore((s) => s.getRequestById(String(id)));
  const getWorkerById = useAppStore((s) => s.getWorkerById);
  const overdue = useAppStore((s) => (request ? s.isRequestOverdue(request, now) : false));

  if (!request) {
    return (
      <Screen>
        <Text style={styles.h1}>Заявка не найдена</Text>
        <Button onPress={() => router.replace("/(admin)")} variant="secondary">
          К списку
        </Button>
      </Screen>
    );
  }

  const worker = getWorkerById(request.assignedWorkerId);

  return (
    <Screen>
      <RequestCard request={request} worker={worker} overdue={overdue} />

      <Section title="Фото 'До'">
        <PhotoPreview uri={request.beforePhotoUri ?? request.photoUri} />
      </Section>

      <Section title="Фото 'После'">
        <PhotoPreview uri={request.afterPhotoUri} />
      </Section>

      <Section title="Таймлайн статусов">
        <StatusTimeline history={request.statusHistory} />
      </Section>

      {request.status === "REJECTED" ? (
        <View style={styles.rejected}>
          <Text style={styles.rejectedText}>Заявка отклонена диспетчером</Text>
          <Text style={styles.rejectedMeta}>Списано баллов: {request.adminPenaltyPoints ?? 0}</Text>
        </View>
      ) : null}
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
  h1: { fontSize: 18, fontWeight: "900", color: ui.colors.text },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: ui.colors.text },
  photo: { height: 180, borderRadius: 14, overflow: "hidden" },
  photoEmpty: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmptyText: { fontWeight: "800", color: ui.colors.textMuted },
  mockPhoto: { backgroundColor: ui.colors.surfaceMuted, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: ui.colors.border },
  mockText: { fontWeight: "900", color: ui.colors.textMuted },
  rejected: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: ui.colors.danger, backgroundColor: ui.colors.dangerSoft },
  rejectedText: { fontWeight: "900", color: ui.colors.danger },
  rejectedMeta: { marginTop: 6, fontWeight: "800", color: ui.colors.text },
});
