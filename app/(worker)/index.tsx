import { Link } from "expo-router";
import { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { useNow } from "@/hooks/useNow";
import { getTasks } from "@/services/requestService";
import { getWorkers } from "@/services/workerService";
import { useAppStore } from "@/store/useAppStore";

export default function WorkerWorklistScreen() {
  const now = useNow(1000);
  const requests = useAppStore((s) => s.requests);
  const user = useAppStore((s) => s.user);
  const workers = useAppStore((s) => s.workers);
  const replaceRequests = useAppStore((s) => s.replaceRequests);
  const replaceWorkers = useAppStore((s) => s.replaceWorkers);
  const isOverdue = useAppStore((s) => s.isRequestOverdue);

  // Backend already returns tasks for the current worker.
  const tasks = requests.filter((r) => r.status === "ASSIGNED" || r.status === "IN_PROGRESS");
  const me = workers.find((w) => w.id === user?.id) ?? (workers.length === 1 ? workers[0] : undefined);
  const profileRating = typeof user?.ratingAvg === "number" ? user.ratingAvg : undefined;
  const myRating = (profileRating ?? me?.rating ?? 5).toFixed(1);

  useEffect(() => {
    let alive = true;
    getTasks()
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
        // keep fallback
      });
    return () => {
      alive = false;
    };
  }, [replaceWorkers]);

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <Text style={styles.h1}>Задачи ({tasks.length})</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {myRating}</Text>
          </View>
        </View>
        <Text style={styles.p}>Приоритет, адрес/координаты и текущий статус.</Text>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Link href={`/(worker)/tasks/${item.id}`} asChild>
            <Pressable>
              <RequestCard request={item} overdue={isOverdue(item, now)} />
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет назначенных задач</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { padding: 16, gap: 6 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  h1: { fontSize: 18, fontWeight: "900", color: "#111" },
  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },
  ratingText: { fontSize: 12, fontWeight: "900", color: "#111" },
  p: { fontSize: 13, color: "#666" },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { fontWeight: "800", color: "#666" },
});
