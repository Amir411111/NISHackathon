import { Link, router } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { ACTIVE_CITIZEN_BADGE_THRESHOLD } from "@/constants/sla";
import { useNow } from "@/hooks/useNow";
import { getMyRequests } from "@/services/requestService";
import { useAppStore } from "@/store/useAppStore";

export default function CitizenRequestsScreen() {
  const now = useNow(1000);
  const requests = useAppStore((s) => s.requests);
  const replaceRequests = useAppStore((s) => s.replaceRequests);
  const getWorkerById = useAppStore((s) => s.getWorkerById);
  const isOverdue = useAppStore((s) => s.isRequestOverdue);
  const points = useAppStore((s) => s.citizenPoints);

  useEffect(() => {
    let alive = true;
    getMyRequests()
      .then((items) => {
        if (!alive) return;
        replaceRequests(items);
      })
      .catch(() => {
        // stay compatible with mock-only mode
      });
    return () => {
      alive = false;
    };
  }, [replaceRequests]);

  const hasBadge = points >= ACTIVE_CITIZEN_BADGE_THRESHOLD;
  const incompleteRequests = requests.filter((r) => r.status !== "DONE");
  const completedRequests = requests.filter((r) => r.status === "DONE");

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <View style={styles.gamification}>
          <Text style={styles.points}>Баллы: {points}</Text>
          <Text style={[styles.badge, hasBadge && styles.badgeActive]}>
            {hasBadge ? "🏅 Активный житель" : `До badge: ${ACTIVE_CITIZEN_BADGE_THRESHOLD - points}`}
          </Text>
        </View>

        <Button onPress={() => router.push("/(citizen)/new")}>Создать заявку</Button>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <SectionTitle text="Не выполненные" count={incompleteRequests.length} />
        {incompleteRequests.length === 0 ? <Text style={styles.empty}>Нет активных заявок</Text> : null}
        {incompleteRequests.map((item) => {
          const worker = getWorkerById(item.assignedWorkerId);
          const overdue = isOverdue(item, now);
          return (
            <Link key={item.id} href={`/(citizen)/requests/${item.id}`} asChild>
              <Pressable>
                <RequestCard request={item} worker={worker} overdue={overdue} />
              </Pressable>
            </Link>
          );
        })}

        <SectionTitle text="Выполненные" count={completedRequests.length} />
        {completedRequests.length === 0 ? <Text style={styles.empty}>Выполненных заявок пока нет</Text> : null}
        {completedRequests.map((item) => {
          const worker = getWorkerById(item.assignedWorkerId);
          const overdue = isOverdue(item, now);
          return (
            <Link key={item.id} href={`/(citizen)/requests/${item.id}`} asChild>
              <Pressable>
                <RequestCard request={item} worker={worker} overdue={overdue} />
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
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
  top: { padding: 16, gap: 12 },
  gamification: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa", gap: 6 },
  points: { fontSize: 16, fontWeight: "900", color: "#111" },
  badge: { fontSize: 12, fontWeight: "800", color: "#666" },
  badgeActive: { color: "#111" },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  sectionHead: {
    marginTop: 8,
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
});
