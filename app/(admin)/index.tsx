import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { useNow } from "@/hooks/useNow";
import { useAppStore } from "@/store/useAppStore";

export default function AdminDispatcherScreen() {
  const now = useNow(1000);
  const requests = useAppStore((s) => s.requests);
  const workers = useAppStore((s) => s.workers);
  const getWorkerById = useAppStore((s) => s.getWorkerById);
  const assignWorker = useAppStore((s) => s.assignWorker);
  const isOverdue = useAppStore((s) => s.isRequestOverdue);

  const [assignFor, setAssignFor] = useState<string | null>(null);

  const selectedRequest = useMemo(() => (assignFor ? requests.find((r) => r.id === assignFor) : null), [assignFor, requests]);

  return (
    <Screen scroll={false}>
      <FlatList
        data={requests}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const worker = getWorkerById(item.assignedWorkerId);
          return (
            <View style={{ gap: 10 }}>
              <RequestCard request={item} worker={worker} overdue={isOverdue(item, now)} />
              <View style={styles.row}>
                <Button onPress={() => setAssignFor(item.id)} variant="secondary">
                  Назначить исполнителя
                </Button>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={Boolean(assignFor)} transparent animationType="fade" onRequestClose={() => setAssignFor(null)}>
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
                  style={({ pressed }) => [styles.workerItem, pressed && { opacity: 0.8 }]}
                  onPress={() => {
                    if (!assignFor) return;
                    assignWorker({ requestId: assignFor, workerId: w.id });
                    setAssignFor(null);
                  }}
                >
                  <Text style={styles.workerName}>{w.name}</Text>
                  <Text style={styles.workerMeta}>{w.contractorName} · ⭐ {w.rating.toFixed(1)}</Text>
                </Pressable>
              ))}
            </View>

            <Button onPress={() => setAssignFor(null)} variant="secondary">
              Закрыть
            </Button>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  row: { flexDirection: "row", justifyContent: "flex-end" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", borderRadius: 16, backgroundColor: "#fff", padding: 16, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  modalSub: { fontSize: 12, color: "#666", fontWeight: "700" },
  workerList: { gap: 10, maxHeight: 360 },
  workerItem: { borderRadius: 14, borderWidth: 1, borderColor: "#eee", padding: 12, gap: 4 },
  workerName: { fontSize: 14, fontWeight: "900", color: "#111" },
  workerMeta: { fontSize: 12, color: "#666" },
});
