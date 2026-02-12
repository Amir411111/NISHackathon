import { Link } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AIAssistant } from "@/components/AIAssistant";
import { Button } from "@/components/Buttons";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { ui } from "@/constants/ui";
import { useNow } from "@/hooks/useNow";
import { adminAssign, adminListAll, adminReject } from "@/services/requestService";
import { getWorkers } from "@/services/workerService";
import { useAppStore } from "@/store/useAppStore";
import { requestDisplayName } from "@/utils/requestPresentation";

export default function AdminDispatcherScreen() {
  type AdminTab = "ACTIVE" | "OVERDUE" | "COMPLETED";

  const now = useNow(1000);
  const requests = useAppStore((s) => s.requests);
  const replaceRequests = useAppStore((s) => s.replaceRequests);
  const upsertRequest = useAppStore((s) => s.upsertRequest);
  const replaceWorkers = useAppStore((s) => s.replaceWorkers);
  const workers = useAppStore((s) => s.workers);
  const getWorkerById = useAppStore((s) => s.getWorkerById);
  const assignWorker = useAppStore((s) => s.assignWorker);
  const isOverdue = useAppStore((s) => s.isRequestOverdue);

  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assigningWorkerId, setAssigningWorkerId] = useState<string | null>(null);
  const [deadlineHoursInput, setDeadlineHoursInput] = useState("24");
  const [assignedWorkerId, setAssignedWorkerId] = useState<string | null>(null);
  const [assignedWorkerName, setAssignedWorkerName] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<AdminTab>("ACTIVE");

  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [penaltyInput, setPenaltyInput] = useState("0");
  const [rejecting, setRejecting] = useState(false);
  const assignInFlightRef = useRef(false);
  const escalatedRef = useRef<Set<string>>(new Set());

  const selectedRequest = useMemo(() => (assignFor ? requests.find((r) => r.id === assignFor) : null), [assignFor, requests]);
  const activeRequests = useMemo(() => requests.filter((r) => r.status !== "DONE" && r.status !== "REJECTED"), [requests]);
  const overdueRequests = useMemo(() => activeRequests.filter((r) => isOverdue(r, now)), [activeRequests, isOverdue, now]);
  const completedRequests = useMemo(() => requests.filter((r) => r.status === "DONE" || r.status === "REJECTED"), [requests]);

  const tabItems = useMemo(
    () => [
      { key: "ACTIVE" as const, title: "Активные", count: activeRequests.length },
      { key: "OVERDUE" as const, title: "Просроченные", count: overdueRequests.length },
      { key: "COMPLETED" as const, title: "Завершенные", count: completedRequests.length },
    ],
    [activeRequests.length, overdueRequests.length, completedRequests.length]
  );

  const visibleRequests = selectedTab === "ACTIVE" ? activeRequests : selectedTab === "OVERDUE" ? overdueRequests : completedRequests;

  useEffect(() => {
    let alive = true;
    adminListAll()
      .then((items) => {
        if (!alive) return;
        replaceRequests(items);
      })
      .catch(() => {
        // keep mock-only mode
      });
    return () => {
      alive = false;
    };
  }, [replaceRequests]);

  useEffect(() => {
    let alive = true;
    getWorkers()
      .then((items) => {
        if (!alive) return;
        replaceWorkers(items);
      })
      .catch(() => {
        // keep fallback (empty list)
      });
    return () => {
      alive = false;
    };
  }, [replaceWorkers]);

  useEffect(() => {
    const overdueNow = requests.filter((r) => isOverdue(r, now));
    const newOverdue = overdueNow.filter((r) => !escalatedRef.current.has(r.id));
    if (newOverdue.length > 0) {
      for (const item of newOverdue) escalatedRef.current.add(item.id);
      const top = newOverdue[0];
      Alert.alert("Эскалация SLA", `Есть просроченные заявки (${overdueNow.length}). Проверьте: ${requestDisplayName(top)}.`);
    }
  }, [requests, isOverdue, now]);

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.list}>
        <AIAssistant role="ADMIN" admin={{ requests, workers, now, isOverdue }} />

        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Панель диспетчера</Text>
          <Text style={styles.overviewSub}>Выберите фильтр: активные, просроченные или завершенные заявки.</Text>
          <View style={styles.overviewStatsRow}>
            {tabItems.map((tab) => (
              <Pressable key={tab.key} onPress={() => setSelectedTab(tab.key)} style={styles.statPressable}>
                <StatBadge label={tab.title} value={tab.count} tone={selectedTab === tab.key ? "primary" : "default"} />
              </Pressable>
            ))}
          </View>
        </View>
        {visibleRequests.length === 0 ? <Text style={styles.empty}>Пока нет заявок в этой вкладке</Text> : null}
        {visibleRequests.map((item) => {
          const worker = getWorkerById(item.assignedWorkerId);
          return (
            <View key={item.id} style={styles.requestBlock}>
              <Link href={`/(admin)/requests/${item.id}`} asChild>
                <Pressable>
                  <RequestCard request={item} worker={worker} overdue={isOverdue(item, now)} />
                </Pressable>
              </Link>
              {selectedTab === "ACTIVE" ? (
                <View style={styles.actionsRow}>
                  <View style={styles.actionBtnWrap}>
                    <Button onPress={() => setAssignFor(item.id)} disabled={Boolean(assigningWorkerId) || rejecting}>
                    Назначить исполнителя
                    </Button>
                  </View>
                  <View style={styles.actionBtnWrap}>
                    <Button onPress={() => setRejectFor(item.id)} variant="danger" disabled={Boolean(assigningWorkerId) || rejecting}>
                      Отклонить заявку
                    </Button>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={Boolean(assignFor)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (assignInFlightRef.current) return;
          setAssignFor(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Назначение исполнителя (mock dropdown)</Text>
            {selectedRequest ? (
              <Text style={styles.modalSub}>Заявка: {requestDisplayName(selectedRequest)}</Text>
            ) : null}

            <Text style={styles.modalSub}>Дедлайн (часы от текущего времени, 1..720)</Text>
            <TextInput
              value={deadlineHoursInput}
              onChangeText={(txt) => setDeadlineHoursInput(txt.replace(/[^\d]/g, ""))}
              keyboardType="number-pad"
              style={styles.input}
              editable={!assigningWorkerId}
              placeholder="24"
              placeholderTextColor={ui.colors.textMuted}
            />

            <View style={styles.workerList}>
              {workers.map((w) => (
                <Pressable
                  key={w.id}
                  disabled={Boolean(assigningWorkerId)}
                  style={({ pressed }) => [styles.workerItem, pressed && !assigningWorkerId && { opacity: 0.8 }]}
                  onPress={async () => {
                    if (!assignFor || selectedRequest?.status === "DONE" || selectedRequest?.status === "REJECTED" || assigningWorkerId || assignInFlightRef.current) return;

                    assignInFlightRef.current = true;
                    setAssignedWorkerId(null);
                    setAssignedWorkerName(null);
                    setAssigningWorkerId(w.id);

                    const deadlineHours = Number(deadlineHoursInput);
                    if (!Number.isInteger(deadlineHours) || deadlineHours < 1 || deadlineHours > 720) {
                      Alert.alert("Некорректный дедлайн", "Введите целое число часов от 1 до 720.");
                      setAssigningWorkerId(null);
                      assignInFlightRef.current = false;
                      return;
                    }

                    try {
                      const updated = await adminAssign(assignFor, w.id, deadlineHours);
                      upsertRequest(updated);
                    } catch {
                      assignWorker({ requestId: assignFor, workerId: w.id, deadlineHours });
                    } finally {
                      setAssigningWorkerId(null);
                    }

                    setAssignedWorkerId(w.id);
                    setAssignedWorkerName(w.name);
                    setTimeout(() => {
                      assignInFlightRef.current = false;
                      setDeadlineHoursInput("24");
                      setAssignedWorkerId(null);
                      setAssignedWorkerName(null);
                      setAssignFor(null);
                    }, 800);
                  }}
                >
                  <Text style={styles.workerName}>{w.name}</Text>
                  <Text style={styles.workerMeta}>{w.contractorName} · ⭐ {w.rating.toFixed(1)}</Text>
                  {assigningWorkerId === w.id ? (
                    <View style={styles.assignState}>
                      <ActivityIndicator size="small" color="#111" />
                      <Text style={styles.assignStateText}>Назначаем...</Text>
                    </View>
                  ) : null}
                  {assignedWorkerId === w.id ? <Text style={styles.assignSuccess}>Успешно назначен: {assignedWorkerName ?? w.name}</Text> : null}
                </Pressable>
              ))}
            </View>

            <Button
              onPress={() => {
                if (assignInFlightRef.current) return;
                setAssignFor(null);
              }}
              variant="secondary"
              disabled={Boolean(assigningWorkerId)}
            >
              Закрыть
            </Button>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(rejectFor)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (rejecting) return;
          setRejectFor(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Отклонить заявку</Text>

            <Text style={styles.modalSub}>Сколько баллов списать у жителя (0..100)</Text>
            <TextInput
              value={penaltyInput}
              onChangeText={(txt) => setPenaltyInput(txt.replace(/[^\d]/g, ""))}
              keyboardType="number-pad"
              style={styles.input}
              editable={!rejecting}
              placeholder="0"
              placeholderTextColor={ui.colors.textMuted}
            />

            <View style={styles.row}>
              <Button
                variant="secondary"
                disabled={rejecting}
                onPress={() => {
                  if (rejecting) return;
                  setRejectFor(null);
                }}
              >
                Отмена
              </Button>
              <Button
                loading={rejecting}
                disabled={rejecting}
                onPress={async () => {
                  if (!rejectFor || rejecting) return;

                  const value = Number(penaltyInput);
                  if (!Number.isInteger(value) || value < 0 || value > 100) {
                    Alert.alert("Некорректное значение", "Введите целое число от 0 до 100.");
                    return;
                  }

                  try {
                    setRejecting(true);
                    const updated = await adminReject(rejectFor, value);
                    upsertRequest(updated);
                    setRejectFor(null);
                    setPenaltyInput("0");
                  } catch (e: any) {
                    const msg = e?.response?.data?.error || e?.message || "Не удалось отклонить заявку";
                    Alert.alert("Ошибка", String(msg));
                  } finally {
                    setRejecting(false);
                  }
                }}
              >
                Подтвердить отклонение
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function StatBadge(props: { label: string; value: number; tone: "default" | "primary" | "warning" }) {
  return (
    <View
      style={[
        styles.statBadge,
        props.tone === "primary" && styles.statBadgePrimary,
        props.tone === "warning" && styles.statBadgeWarning,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.statBadgeLabel, props.tone === "primary" && styles.statBadgeLabelPrimary]}
      >
        {props.label}
      </Text>
      <Text style={[styles.statBadgeValue, props.tone === "primary" && styles.statBadgeValuePrimary]}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    padding: 12,
    gap: 10,
  },
  overviewTitle: { fontSize: 18, fontWeight: "900", color: ui.colors.text },
  overviewSub: { fontSize: 13, lineHeight: 18, fontWeight: "700", color: ui.colors.textMuted },
  overviewStatsRow: { flexDirection: "row", gap: 8 },
  statPressable: { flex: 1 },
  statBadge: {
    minHeight: 80,
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2,
  },
  statBadgePrimary: {
    borderColor: ui.colors.primary,
    backgroundColor: ui.colors.primarySoft,
  },
  statBadgeWarning: {
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
  },
  statBadgeLabel: { fontSize: 10, fontWeight: "800", color: ui.colors.textMuted },
  statBadgeLabelPrimary: { color: ui.colors.primary },
  statBadgeValue: { fontSize: 16, fontWeight: "900", color: ui.colors.text },
  statBadgeValuePrimary: { color: ui.colors.primary },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  requestBlock: { gap: 10 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtnWrap: { flex: 1 },
  empty: { color: ui.colors.textMuted, fontWeight: "700", marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", borderRadius: 16, backgroundColor: ui.colors.surface, padding: 16, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: ui.colors.text },
  modalSub: { fontSize: 12, color: ui.colors.textMuted, fontWeight: "700" },
  workerList: { gap: 10, maxHeight: 360 },
  workerItem: { borderRadius: 14, borderWidth: 1, borderColor: ui.colors.border, backgroundColor: ui.colors.surfaceMuted, padding: 12, gap: 4 },
  workerName: { fontSize: 14, fontWeight: "900", color: ui.colors.text },
  workerMeta: { fontSize: 12, color: ui.colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: ui.colors.surfaceMuted,
    color: ui.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "800",
  },
  assignState: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 },
  assignStateText: { fontSize: 12, fontWeight: "800", color: ui.colors.textMuted },
  assignSuccess: { marginTop: 6, fontSize: 12, fontWeight: "900", color: ui.colors.primary },
});
