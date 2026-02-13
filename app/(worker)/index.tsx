import * as Location from "expo-location";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AIAssistant } from "@/components/AIAssistant";
import { HotspotsMap } from "@/components/HotspotsMap";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { ui } from "@/constants/ui";
import { useNow } from "@/hooks/useNow";
import { getTasks } from "@/services/requestService";
import { getWorkers } from "@/services/workerService";
import { useAppStore } from "@/store/useAppStore";

export default function WorkerWorklistScreen() {
  type WorkerTab = "ACTIVE" | "OVERDUE" | "DUE_SOON";

  const now = useNow(1000);
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lon: number }>();
  const [selectedTab, setSelectedTab] = useState<WorkerTab>("ACTIVE");
  const [assistantVisible, setAssistantVisible] = useState(false);
  const requests = useAppStore((s) => s.requests);
  const user = useAppStore((s) => s.user);
  const workers = useAppStore((s) => s.workers);
  const replaceRequests = useAppStore((s) => s.replaceRequests);
  const replaceWorkers = useAppStore((s) => s.replaceWorkers);
  const isOverdue = useAppStore((s) => s.isRequestOverdue);

  // Backend already returns tasks for the current worker.
  const tasks = useMemo(() => requests.filter((r) => r.status === "ASSIGNED" || r.status === "IN_PROGRESS"), [requests]);
  const overdueTasks = useMemo(() => tasks.filter((r) => isOverdue(r, now)), [tasks, isOverdue, now]);
  const dueSoonTasks = useMemo(
    () =>
      tasks.filter((r) => {
        if (!r.slaDeadline) return false;
        const remain = r.slaDeadline - now;
        return remain > 0 && remain <= 60 * 60 * 1000;
      }),
    [tasks, now]
  );

  const overdue = overdueTasks.length;
  const dueSoon = dueSoonTasks.length;

  const me = workers.find((w) => w.id === user?.id) ?? (workers.length === 1 ? workers[0] : undefined);
  const profileRating = typeof user?.ratingAvg === "number" ? user.ratingAvg : undefined;
  const myRating = (profileRating ?? me?.rating ?? 5).toFixed(1);

  const tabItems = useMemo(
    () => [
      { key: "ACTIVE" as const, title: "Активные", count: tasks.length },
      { key: "OVERDUE" as const, title: "Просроченные", count: overdueTasks.length },
      { key: "DUE_SOON" as const, title: "Скоро дедлайн", count: dueSoonTasks.length },
    ],
    [tasks.length, overdueTasks.length, dueSoonTasks.length]
  );

  const visibleTasks = selectedTab === "ACTIVE" ? tasks : selectedTab === "OVERDUE" ? overdueTasks : dueSoonTasks;

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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted || !alive) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!alive) return;
        setWorkerLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch {
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <Screen scroll={false}>
      <FlatList
        data={visibleTasks}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.ratingTopRow}>
              <Text style={styles.ratingTopLabel}>Ваш рейтинг</Text>
              <View style={styles.ratingBadgeCompact}>
                <Text style={styles.ratingText}>⭐ {myRating}</Text>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <View style={styles.topRow}>
                <Text style={styles.overviewTitle}>Рабочий лист</Text>
              </View>
              <Text style={styles.overviewSub}>Сфокусируйтесь на просроченных и задачах с ближайшим дедлайном.</Text>

              <View style={styles.overviewStatsRow}>
                {tabItems.map((tab) => (
                  <Pressable key={tab.key} onPress={() => setSelectedTab(tab.key)} style={styles.statPressable}>
                    <StatBadge label={tab.title} value={tab.count} tone={selectedTab === tab.key ? "primary" : "default"} />
                  </Pressable>
                ))}
              </View>
            </View>

            {overdue > 0 ? (
              <View style={[styles.notice, styles.noticeDanger]}>
                <Text style={styles.noticeText}>SLA alert: у вас {overdue} просроченных задач.</Text>
              </View>
            ) : null}

            {overdue === 0 && dueSoon > 0 ? (
              <View style={[styles.notice, styles.noticeWarn]}>
                <Text style={styles.noticeText}>Напоминание: {dueSoon} задач истекают в течение часа.</Text>
              </View>
            ) : null}

            <SectionTitle
              text={selectedTab === "ACTIVE" ? "Все активные задачи" : selectedTab === "OVERDUE" ? "Просроченные задачи" : "Скоро дедлайн"}
              count={visibleTasks.length}
            />
          </View>
        }
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
            <Text style={styles.emptyText}>Нет задач в выбранном фильтре</Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footerWrap}>
            <Pressable onPress={() => setAssistantVisible((prev) => !prev)} style={styles.assistantToggle}>
              <Text style={styles.assistantToggleText}>{assistantVisible ? "Скрыть AI ассистента" : "Показать AI ассистента"}</Text>
            </Pressable>

            {assistantVisible ? <AIAssistant role="WORKER" worker={{ tasks, now, isOverdue, workerLocation }} /> : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Карта задач исполнителя</Text>
              <HotspotsMap requests={tasks} colorBy="priority" />
            </View>
          </View>
        }
      />
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

function StatBadge(props: { label: string; value: number; tone: "default" | "primary" }) {
  return (
    <View style={[styles.statBadge, props.tone === "primary" && styles.statBadgePrimary]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.statBadgeLabel, props.tone === "primary" && styles.statBadgeLabelPrimary]}>
        {props.label}
      </Text>
      <Text style={[styles.statBadgeValue, props.tone === "primary" && styles.statBadgeValuePrimary]}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { gap: 12, marginBottom: 12 },
  ratingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ratingTopLabel: { fontSize: 13, fontWeight: "800", color: ui.colors.textMuted },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
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
  statBadgeLabel: { fontSize: 10, fontWeight: "800", color: ui.colors.textMuted },
  statBadgeLabelPrimary: { color: ui.colors.primary },
  statBadgeValue: { fontSize: 16, fontWeight: "900", color: ui.colors.text },
  statBadgeValuePrimary: { color: ui.colors.primary },
  ratingBadgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.primarySoft,
  },
  ratingText: { fontSize: 12, fontWeight: "900", color: ui.colors.primary },
  notice: { marginTop: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  noticeDanger: { borderColor: ui.colors.danger, backgroundColor: ui.colors.dangerSoft },
  noticeWarn: { borderColor: ui.colors.warning, backgroundColor: "#fff7ea" },
  noticeText: { fontSize: 12, fontWeight: "900", color: ui.colors.text },
  card: { borderRadius: 14, borderWidth: 1, borderColor: ui.colors.border, backgroundColor: ui.colors.surface, padding: 12, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: "900", color: ui.colors.text },
  sectionHead: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: ui.colors.text },
  sectionCount: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: ui.colors.primarySoft,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: ui.colors.primary,
  },
  assistantToggle: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  assistantToggleText: { fontSize: 13, fontWeight: "800", color: ui.colors.primary },
  footerWrap: { gap: 12, marginTop: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { fontWeight: "800", color: ui.colors.textMuted },
});
