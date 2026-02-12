import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { ACTIVE_CITIZEN_BADGE_THRESHOLD } from "@/constants/sla";
import { useNow } from "@/hooks/useNow";
import { useAppStore } from "@/store/useAppStore";

export default function CitizenRequestsScreen() {
  const now = useNow(1000);
  const requests = useAppStore((s) => s.requests);
  const getWorkerById = useAppStore((s) => s.getWorkerById);
  const isOverdue = useAppStore((s) => s.isRequestOverdue);
  const points = useAppStore((s) => s.citizenPoints);

  const hasBadge = points >= ACTIVE_CITIZEN_BADGE_THRESHOLD;

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <View style={styles.gamification}>
          <Text style={styles.points}>Баллы: {points}</Text>
          <Text style={[styles.badge, hasBadge && styles.badgeActive]}>
            {hasBadge ? "🏅 Активный житель" : `До badge: ${ACTIVE_CITIZEN_BADGE_THRESHOLD - points}`}
          </Text>
        </View>

        <Link href="/(citizen)/new" asChild>
          <Pressable style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
            <Text style={styles.ctaText}>Подать заявку</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const worker = getWorkerById(item.assignedWorkerId);
          const overdue = isOverdue(item, now);
          return (
            <Link href={`/(citizen)/requests/${item.id}`} asChild>
              <Pressable>
                <RequestCard request={item} worker={worker} overdue={overdue} />
              </Pressable>
            </Link>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { padding: 16, gap: 12 },
  gamification: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa", gap: 6 },
  points: { fontSize: 16, fontWeight: "900", color: "#111" },
  badge: { fontSize: 12, fontWeight: "800", color: "#666" },
  badgeActive: { color: "#111" },
  cta: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#111", alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "900" },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
});
