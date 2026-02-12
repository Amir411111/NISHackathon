import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { useNow } from "@/hooks/useNow";
import { adminAssign, adminListAll } from "@/services/requestService";
import { getWorkers } from "@/services/workerService";
import { useAppStore } from "@/store/useAppStore";

export default function AdminDispatcherScreen() {
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
  const [assignedWorkerId, setAssignedWorkerId] = useState<string | null>(null);
  const assignInFlightRef = useRef(false);

  const selectedRequest = useMemo(() => (assignFor ? requests.find((r) => r.id === assignFor) : null), [assignFor, requests]);
  const incompleteRequests = useMemo(() => requests.filter((r) => r.status !== "DONE"), [requests]);
  const completedRequests = useMemo(() => requests.filter((r) => r.status === "DONE"), [requests]);

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

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.list}>
        <SectionTitle text="Не выполненные" count={incompleteRequests.length} />
        {incompleteRequests.length === 0 ? <Text style={styles.empty}>Нет активных задач</Text> : null}
        {incompleteRequests.map((item) => {
          const worker = getWorkerById(item.assignedWorkerId);
          return (
            <View key={item.id} style={{ gap: 10 }}>
              <RequestCard request={item} worker={worker} overdue={isOverdue(item, now)} />
              <View style={styles.row}>
                <Button onPress={() => setAssignFor(item.id)} variant="secondary" disabled={Boolean(assigningWorkerId)}>
                  Назначить исполнителя
                </Button>
              </View>
            </View>
          );
        })}

        <SectionTitle text="Выполненные" count={completedRequests.length} />
        {completedRequests.length === 0 ? <Text style={styles.empty}>Выполненных задач пока нет</Text> : null}
        {completedRequests.map((item) => {
          const worker = getWorkerById(item.assignedWorkerId);
          return <RequestCard key={item.id} request={item} worker={worker} overdue={isOverdue(item, now)} />;
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
              <Text style={styles.modalSub}>Заявка: {selectedRequest.id}</Text>
            ) : null}

            <View style={styles.workerList}>
              {workers.map((w) => (
                <Pressable
                  key={w.id}
                  disabled={Boolean(assigningWorkerId)}
                  style={({ pressed }) => [styles.workerItem, pressed && !assigningWorkerId && { opacity: 0.8 }]}
                  onPress={async () => {
                    if (!assignFor || selectedRequest?.status === "DONE" || assigningWorkerId || assignInFlightRef.current) return;

                    assignInFlightRef.current = true;
                    setAssignedWorkerId(null);
                    setAssigningWorkerId(w.id);
                    try {
                      const updated = await adminAssign(assignFor, w.id);
                      upsertRequest(updated);
                    } catch {
                      assignWorker({ requestId: assignFor, workerId: w.id });
                    } finally {
                      setAssigningWorkerId(null);
                    }

                    setAssignedWorkerId(w.id);
                    setTimeout(() => {
                      assignInFlightRef.current = false;
                      setAssignedWorkerId(null);
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
                  {assignedWorkerId === w.id ? <Text style={styles.assignSuccess}>Успешно назначен</Text> : null}
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
    </Screen>
  );
}

function SectionTitle(props: { text: string; count: number }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{props.text}</Text>
      <Text style={styles.sectionCount}>{props.count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  row: { flexDirection: "row", justifyContent: "flex-end" },
  sectionHead: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#111" },
  sectionCount: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#f2f2f2",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "#444",
  },
  empty: { color: "#777", fontWeight: "700", marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", borderRadius: 16, backgroundColor: "#fff", padding: 16, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  modalSub: { fontSize: 12, color: "#666", fontWeight: "700" },
  workerList: { gap: 10, maxHeight: 360 },
  workerItem: { borderRadius: 14, borderWidth: 1, borderColor: "#eee", padding: 12, gap: 4 },
  workerName: { fontSize: 14, fontWeight: "900", color: "#111" },
  workerMeta: { fontSize: 12, color: "#666" },
  assignState: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 },
  assignStateText: { fontSize: 12, fontWeight: "800", color: "#444" },
  assignSuccess: { marginTop: 6, fontSize: 12, fontWeight: "900", color: "#111" },
});
