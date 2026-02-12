import { Link } from "expo-router";
import { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { useNow } from "@/hooks/useNow";
import { getTasks } from "@/services/requestService";
import { useAppStore } from "@/store/useAppStore";

export default function WorkerWorklistScreen() {
  const now = useNow(1000);
  const requests = useAppStore((s) => s.requests);
  const replaceRequests = useAppStore((s) => s.replaceRequests);
  const isOverdue = useAppStore((s) => s.isRequestOverdue);

  // Backend already returns tasks for the current worker.
  const tasks = requests.filter((r) => r.status === "ASSIGNED" || r.status === "IN_PROGRESS");

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

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Text style={styles.h1}>Задачи ({tasks.length})</Text>
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
  h1: { fontSize: 18, fontWeight: "900", color: "#111" },
  p: { fontSize: 13, color: "#666" },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { fontWeight: "800", color: "#666" },
});
