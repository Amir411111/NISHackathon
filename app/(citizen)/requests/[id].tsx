import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { StatusTimeline } from "@/components/Status";
import { useNow } from "@/hooks/useNow";
import { citizenConfirm, citizenReject } from "@/services/requestService";
import { useAppStore } from "@/store/useAppStore";

export default function CitizenRequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow(1000);

  const request = useAppStore((s) => s.getRequestById(String(id)));
  const getWorkerById = useAppStore((s) => s.getWorkerById);
  const overdue = useAppStore((s) => (request ? s.isRequestOverdue(request, now) : false));

  const confirmDone = useAppStore((s) => s.citizenConfirmDone);
  const sendRework = useAppStore((s) => s.citizenSendRework);
  const upsertRequest = useAppStore((s) => s.upsertRequest);
  const syncMe = useAppStore((s) => s.syncMe);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rating, setRating] = useState<number>(5);

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

  const requestId = request.id;

  const worker = getWorkerById(request.assignedWorkerId);
  const canCitizenDecide = request.status === "DONE" && !request.citizenConfirmedAt;

  async function onConfirm() {
    if (confirming || rejecting) return;
    try {
      setConfirming(true);
      const updated = await citizenConfirm(requestId, rating);
      upsertRequest(updated);
      confirmDone(requestId, rating);
      await syncMe();
      return;
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Не удалось сохранить оценку и подтвердить выполнение.";
      Alert.alert("Ошибка", String(msg));
      return;
    } finally {
      setConfirming(false);
    }
  }

  async function onReject() {
    if (rejecting || confirming) return;
    try {
      setRejecting(true);
      const updated = await citizenReject(requestId);
      upsertRequest(updated);
      sendRework(requestId);
      return;
    } catch {
      // fallback to mock-only
    } finally {
      setRejecting(false);
    }
    sendRework(requestId);
  }

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
          <Text style={styles.rateLabel}>Оцените работу исполнителя *</Text>
          <View style={styles.rateRow}>
            {[1, 2, 3, 4, 5].map((v) => (
              <Button key={v} onPress={() => setRating(v)} variant={rating === v ? "primary" : "secondary"} disabled={confirming || rejecting}>
                {v}★
              </Button>
            ))}
          </View>

          <Button onPress={onConfirm} loading={confirming} disabled={confirming || rejecting || !rating}>✅ Подтвердить выполнение</Button>
          <Button onPress={onReject} variant="secondary" loading={rejecting} disabled={confirming || rejecting}>
            🔁 Отправить на доработку
          </Button>
        </Section>
      ) : null}

      {request.citizenConfirmedAt ? (
        <View style={styles.confirmed}>
          <Text style={styles.confirmedText}>Подтверждено жителем ✅</Text>
          <Text style={styles.confirmedRate}>Оценка исполнителю: {request.citizenRating ?? 5} / 5</Text>
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
  rateLabel: { fontSize: 13, fontWeight: "800", color: "#333" },
  rateRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  confirmed: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#f7f7f7" },
  confirmedText: { fontWeight: "900", color: "#111" },
  confirmedRate: { marginTop: 6, fontWeight: "800", color: "#333" },
});
