import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { StatusTimeline } from "@/components/Status";
import { useNow } from "@/hooks/useNow";
import { useAppStore } from "@/store/useAppStore";

export default function CitizenRequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow(1000);

  const request = useAppStore((s) => s.getRequestById(String(id)));
  const getWorkerById = useAppStore((s) => s.getWorkerById);
  const overdue = useAppStore((s) => (request ? s.isRequestOverdue(request, now) : false));

  const confirmDone = useAppStore((s) => s.citizenConfirmDone);
  const sendRework = useAppStore((s) => s.citizenSendRework);

  if (!request) {
    return (
      <Screen>
        <Text style={styles.h1}>Заявка не найдена</Text>
        <Button onPress={() => router.replace("/(citizen)")} variant="secondary">
          К списку
        </Button>
      </Screen>
    );
  }

  const worker = getWorkerById(request.assignedWorkerId);
  const canCitizenDecide = request.status === "DONE" && !request.citizenConfirmedAt;

  return (
    <Screen>
      <RequestCard request={request} worker={worker} overdue={overdue} />

      <Section title="Фото">
        {request.photoUri ? (
          request.photoUri.startsWith("mock://") ? (
            <View style={[styles.photo, styles.mockPhoto]}>
              <Text style={styles.mockText}>MOCK PHOTO</Text>
            </View>
          ) : (
            <Image source={{ uri: request.photoUri }} style={styles.photo} contentFit="cover" />
          )
        ) : (
          <View style={styles.photoEmpty}>
            <Text style={styles.photoEmptyText}>Фото не прикреплено</Text>
          </View>
        )}
      </Section>

      <Section title="Таймлайн статусов">
        <StatusTimeline history={request.statusHistory} />
      </Section>

      {canCitizenDecide ? (
        <Section title="Действия жителя">
          <Button onPress={() => confirmDone(request.id)}>✅ Подтвердить выполнение</Button>
          <Button onPress={() => sendRework(request.id)} variant="secondary">
            🔁 Отправить на доработку
          </Button>
        </Section>
      ) : null}

      {request.citizenConfirmedAt ? (
        <View style={styles.confirmed}>
          <Text style={styles.confirmedText}>Подтверждено жителем ✅</Text>
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

const styles = StyleSheet.create({
  h1: { fontSize: 18, fontWeight: "900" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
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
  confirmed: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#f7f7f7" },
  confirmedText: { fontWeight: "900", color: "#111" },
});
