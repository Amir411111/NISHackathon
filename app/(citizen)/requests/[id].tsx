import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { StatusTimeline } from "@/components/Status";
import { ui } from "@/constants/ui";
import { useNow } from "@/hooks/useNow";
import { analyzeWorkPhotos, type WorkAnalysisResult } from "@/services/aiService";
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
  const [analyzingPhotos, setAnalyzingPhotos] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<WorkAnalysisResult | null>(null);

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
  const beforePhotoUri = request.beforePhotoUri || request.photoUri;
  const afterPhotoUri = request.afterPhotoUri;
  const requestCategory = request.category;
  const requestDescription = request.description;
  const requestStatus = request.status;

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

  async function toDataUrl(uri: string): Promise<string> {
    if (uri.startsWith("data:image/")) return uri;

    const response = await fetch(uri);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("READ_IMAGE_FAILED"));
      reader.readAsDataURL(blob);
    });
  }

  async function onAnalyzeWork() {
    if (!beforePhotoUri || !afterPhotoUri) {
      Alert.alert("Недостаточно данных", "Для анализа нужны оба фото: до и после.");
      return;
    }
    if (beforePhotoUri.startsWith("mock://") || afterPhotoUri.startsWith("mock://")) {
      Alert.alert("Недоступно", "AI-анализ недоступен для mock-фото.");
      return;
    }

    try {
      setAnalyzingPhotos(true);
      setAiAnalysis(null);

      const beforeImageDataUrl = await toDataUrl(beforePhotoUri);
      const afterImageDataUrl = await toDataUrl(afterPhotoUri);

      const analysis = await analyzeWorkPhotos({
        beforeImageDataUrl,
        afterImageDataUrl,
        context: {
          requestId,
          category: requestCategory,
          description: requestDescription,
          status: requestStatus,
        },
      });

      setAiAnalysis(analysis);
      setRating(analysis.suggestedRating);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Не удалось проанализировать фото.";
      Alert.alert("Ошибка AI", String(msg));
    } finally {
      setAnalyzingPhotos(false);
    }
  }

  return (
    <Screen>
      <RequestCard request={request} worker={worker} overdue={overdue} />

      <Section title="Фото до">
        <ReadonlyPhoto uri={request.beforePhotoUri || request.photoUri} emptyText="Фото до не прикреплено" />
      </Section>

      <Section title="Фото после">
        <ReadonlyPhoto uri={request.afterPhotoUri} emptyText="Исполнитель еще не загрузил фото после" />
      </Section>

      <Section title="Таймлайн статусов">
        <StatusTimeline history={request.statusHistory} />
      </Section>

      {canCitizenDecide ? (
        <Section title="Действия жителя">
          <Button onPress={onAnalyzeWork} variant="secondary" loading={analyzingPhotos} disabled={analyzingPhotos || confirming || rejecting}>
            🤖 Анализировать фото до/после
          </Button>

          {aiAnalysis ? (
            <View style={[styles.aiAnalysisBox, aiAnalysis.recommendation === "REWORK" && styles.aiAnalysisBoxWarning]}>
              <Text style={styles.aiAnalysisTitle}>Результат AI-анализа</Text>
              <Text style={styles.aiAnalysisText}>{aiAnalysis.answer}</Text>
              <Text style={[styles.aiRecommendation, aiAnalysis.recommendation === "REWORK" ? styles.aiRecommendationWarn : styles.aiRecommendationOk]}>
                Рекомендация: {aiAnalysis.recommendation === "REWORK" ? "Отправить на доработку" : "Можно подтвердить"}
              </Text>
              <Text style={styles.aiMeta}>Рекомендуемая оценка: {aiAnalysis.suggestedRating}★</Text>
              <Text style={styles.aiMeta}>Уверенность анализа: {aiAnalysis.confidence === "CLEAR" ? "Высокая" : "Низкая (видимость ограничена)"}</Text>
            </View>
          ) : null}

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

function ReadonlyPhoto(props: { uri?: string; emptyText: string }) {
  if (!props.uri) {
    return (
      <View style={styles.photoEmpty}>
        <Text style={styles.photoEmptyText}>{props.emptyText}</Text>
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
  rateLabel: { fontSize: 13, fontWeight: "800", color: ui.colors.text },
  rateRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  aiAnalysisBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    padding: 10,
    gap: 6,
  },
  aiAnalysisBoxWarning: {
    borderColor: ui.colors.warning,
  },
  aiAnalysisTitle: { fontSize: 13, fontWeight: "900", color: ui.colors.primary },
  aiAnalysisText: { fontSize: 13, lineHeight: 18, color: ui.colors.text, fontWeight: "600" },
  aiRecommendation: { fontSize: 13, fontWeight: "900" },
  aiRecommendationWarn: { color: ui.colors.warning },
  aiRecommendationOk: { color: ui.colors.primary },
  aiMeta: { fontSize: 12, fontWeight: "700", color: ui.colors.textMuted },
  confirmed: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: ui.colors.border, backgroundColor: ui.colors.primarySoft },
  confirmedText: { fontWeight: "900", color: ui.colors.primary },
  confirmedRate: { marginTop: 6, fontWeight: "800", color: ui.colors.text },
  rejected: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: ui.colors.danger, backgroundColor: ui.colors.dangerSoft },
  rejectedText: { fontWeight: "900", color: ui.colors.danger },
  rejectedMeta: { marginTop: 6, fontWeight: "800", color: ui.colors.text },
});
