import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ui } from "@/constants/ui";
import { getLeaderboard, type LeaderboardItem } from "@/services/userService";
import type { UserRole } from "@/types/domain";

type TabKey = "USERS" | "WORKERS";

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<TabKey>("USERS");
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setItems([]);

    (async () => {
      try {
        const role: UserRole = tab === "WORKERS" ? "WORKER" : "CITIZEN";
        const res = await getLeaderboard(20, role);
        if (!alive) return;
        setItems(res.items);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tab]);

  return (
    <Screen>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Рейтинг eQala</Text>
        <Text style={styles.heroSubtitle}>Следите за активностью жителей и эффективностью рабочих команд.</Text>
      </View>

      <View style={styles.tabsRow}>
        <TabButton title="Рейтинг пользователей" active={tab === "USERS"} onPress={() => setTab("USERS")} />
        <TabButton title="Рейтинг рабочих" active={tab === "WORKERS"} onPress={() => setTab("WORKERS")} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{tab === "USERS" ? "Топ пользователей" : "Топ рабочих"}</Text>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={ui.colors.primary} />
          </View>
        ) : null}

        {!loading && items.length === 0 ? <Text style={styles.empty}>Пока нет данных</Text> : null}
        {!loading && items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <View style={styles.userCol}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <Text style={styles.points}>{tab === "WORKERS" ? `${(item.ratingAvg ?? 0).toFixed(1)}★` : item.points}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function TabButton(props: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabBtn, props.active && styles.tabBtnActive]} onPress={props.onPress}>
      <Text style={[styles.tabText, props.active && styles.tabTextActive]}>{props.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.primarySoft,
    gap: 4,
  },
  heroTitle: { fontSize: 18, fontWeight: "900", color: ui.colors.primary },
  heroSubtitle: { fontSize: 13, lineHeight: 18, color: ui.colors.textMuted, fontWeight: "700" },
  tabsRow: { flexDirection: "row", gap: 8 },
  tabBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  tabBtnActive: { backgroundColor: ui.colors.primary, borderColor: ui.colors.primary },
  tabText: { fontSize: 12, fontWeight: "900", color: ui.colors.textMuted, textAlign: "center" },
  tabTextActive: { color: ui.colors.surface },
  card: {
    padding: 14,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    gap: 8,
  },
  loaderWrap: { minHeight: 80, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: ui.colors.text },
  empty: { fontSize: 12, color: ui.colors.textMuted, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  rank: { minWidth: 34, fontSize: 12, fontWeight: "900", color: ui.colors.text },
  userCol: { flex: 1, gap: 2 },
  name: { fontSize: 13, fontWeight: "900", color: ui.colors.text },
  email: { fontSize: 12, color: ui.colors.textMuted },
  points: { fontSize: 13, fontWeight: "900", color: ui.colors.text },
});
