import { Link, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { RequestCard } from "@/components/RequestCard";
import { Screen } from "@/components/Screen";
import { ACTIVE_CITIZEN_BADGE_THRESHOLD } from "@/constants/sla";
import { ui } from "@/constants/ui";
import { useNow } from "@/hooks/useNow";
import { getMyRequests } from "@/services/requestService";
import { useAppStore } from "@/store/useAppStore";

export default function CitizenRequestsScreen() {
  type CitizenTab = "ACTIVE" | "PENDING_CONFIRM" | "CLOSED";

  const now = useNow(1000);
  const requests = useAppStore((s) => s.requests);
  const replaceRequests = useAppStore((s) => s.replaceRequests);
  const syncMe = useAppStore((s) => s.syncMe);
  const getWorkerById = useAppStore((s) => s.getWorkerById);
  const isOverdue = useAppStore((s) => s.isRequestOverdue);
  const points = useAppStore((s) => s.citizenPoints);
  const [selectedTab, setSelectedTab] = useState<CitizenTab>("ACTIVE");

  useEffect(() => {
    let alive = true;
    getMyRequests()
      .then((items) => {
        if (!alive) return;
        replaceRequests(items);
        syncMe().catch(() => {});
      })
      .catch(() => {
        // stay compatible with mock-only mode
      });
    return () => {
      alive = false;
    };
  }, [replaceRequests, syncMe]);

  const hasBadge = points >= ACTIVE_CITIZEN_BADGE_THRESHOLD;
  const activeRequests = useMemo(() => requests.filter((r) => r.status !== "DONE" && r.status !== "REJECTED"), [requests]);
  const pendingConfirmationRequests = useMemo(() => requests.filter((r) => r.status === "DONE" && !r.citizenConfirmedAt), [requests]);
  const closedRequests = useMemo(() => requests.filter((r) => (r.status === "DONE" && Boolean(r.citizenConfirmedAt)) || r.status === "REJECTED"), [requests]);

  const tabItems = useMemo(
    () => [
      { key: "ACTIVE" as const, title: "Активные", count: activeRequests.length },
      { key: "PENDING_CONFIRM" as const, title: "Ждут подтверждения", count: pendingConfirmationRequests.length },
      { key: "CLOSED" as const, title: "Закрытые", count: closedRequests.length },
    ],
    [activeRequests.length, pendingConfirmationRequests.length, closedRequests.length]
  );

  const visibleRequests = selectedTab === "ACTIVE" ? activeRequests : selectedTab === "PENDING_CONFIRM" ? pendingConfirmationRequests : closedRequests;
  const overdueMine = activeRequests.filter((r) => isOverdue(r, now));
  const nearDeadlineMine = activeRequests.filter((r) => {
    if (!r.slaDeadline) return false;
    const remain = r.slaDeadline - now;
    return remain > 0 && remain <= 60 * 60 * 1000;
  });

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.top}>
          {overdueMine.length > 0 ? (
            <View style={[styles.slaBanner, styles.slaDanger]}>
              <Text style={styles.slaTitle}>SLA уведомление</Text>
              <Text style={styles.slaText}>Есть просроченные заявки: {overdueMine.length}. Диспетчер уже уведомлён.</Text>
            </View>
          ) : null}

          {overdueMine.length === 0 && nearDeadlineMine.length > 0 ? (
            <View style={[styles.slaBanner, styles.slaWarn]}>
              <Text style={styles.slaTitle}>SLA уведомление</Text>
              <Text style={styles.slaText}>По {nearDeadlineMine.length} заявкам дедлайн скоро истечёт.</Text>
            </View>
          ) : null}

          <View style={styles.gamification}>
            <Text style={styles.points}>Баллы: {points}</Text>
            <Text style={[styles.badge, hasBadge && styles.badgeActive]}>
              {hasBadge ? "🏅 Активный житель" : `До badge: ${ACTIVE_CITIZEN_BADGE_THRESHOLD - points}`}
            </Text>
          </View>

          <Button onPress={() => router.push("/(citizen)/new")}>Создать заявку</Button>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Мои заявки</Text>
          <Text style={styles.overviewSub}>Выберите фильтр: активные, ждут подтверждения или закрытые.</Text>
          <View style={styles.overviewStatsRow}>
            {tabItems.map((tab) => (
              <Pressable key={tab.key} onPress={() => setSelectedTab(tab.key)} style={styles.statPressable}>
                <StatBadge label={tab.title} value={tab.count} tone={selectedTab === tab.key ? "primary" : "default"} />
              </Pressable>
            ))}
          </View>
        </View>

        <SectionTitle text={selectedTab === "ACTIVE" ? "Активные заявки" : selectedTab === "PENDING_CONFIRM" ? "Выполнены, ждут подтверждения" : "Закрытые заявки"} count={visibleRequests.length} />
        {visibleRequests.length === 0 ? <Text style={styles.empty}>Пока нет заявок в этой вкладке</Text> : null}
        {visibleRequests.map((item) => {
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
  top: { padding: 16, gap: 12 },
  slaBanner: { borderRadius: 12, borderWidth: 1, padding: 10, gap: 2 },
  slaDanger: { borderColor: ui.colors.danger, backgroundColor: ui.colors.dangerSoft },
  slaWarn: { borderColor: ui.colors.warning, backgroundColor: "#fff7ea" },
  slaTitle: { fontSize: 12, fontWeight: "900", color: ui.colors.text },
  slaText: { fontSize: 12, fontWeight: "700", color: ui.colors.text },
  gamification: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: ui.colors.border, backgroundColor: ui.colors.surfaceMuted, gap: 6 },
  points: { fontSize: 16, fontWeight: "900", color: ui.colors.text },
  badge: { fontSize: 12, fontWeight: "800", color: ui.colors.textMuted },
  badgeActive: { color: ui.colors.primary },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
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
  sectionHead: {
    marginTop: 8,
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
  empty: { color: ui.colors.textMuted, fontWeight: "700", marginBottom: 4 },
});
