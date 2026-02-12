import * as Location from "expo-location";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
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
  const now = useNow(1000);
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lon: number }>();
  const requests = useAppStore((s) => s.requests);
  const user = useAppStore((s) => s.user);
  const workers = useAppStore((s) => s.workers);
  const replaceRequests = useAppStore((s) => s.replaceRequests);
  const replaceWorkers = useAppStore((s) => s.replaceWorkers);
  const isOverdue = useAppStore((s) => s.isRequestOverdue);

  // Backend already returns tasks for the current worker.
  const tasks = requests.filter((r) => r.status === "ASSIGNED" || r.status === "IN_PROGRESS");
  const high = tasks.filter((r) => r.priority === "HIGH").length;
  const medium = tasks.filter((r) => r.priority === "MEDIUM").length;
  const low = tasks.filter((r) => r.priority === "LOW").length;
  const overdue = tasks.filter((r) => isOverdue(r, now)).length;
  const dueSoon = tasks.filter((r) => {
    if (!r.slaDeadline) return false;
    const remain = r.slaDeadline - now;
    return remain > 0 && remain <= 60 * 60 * 1000;
  }).length;

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
        data={tasks}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.top}>
              <View style={styles.topRow}>
                <Text style={styles.h1}>Задачи ({tasks.length})</Text>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>⭐ {myRating}</Text>
                </View>
              </View>
              <Text style={styles.p}>Приоритет, адрес/координаты и текущий статус.</Text>

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
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Сводка исполнителя</Text>
              <View style={styles.metricsRow}>
                <MetricBadge label="Высокий" value={high} tone="high" />
                <MetricBadge label="Средний" value={medium} tone="medium" />
                <MetricBadge label="Низкий" value={low} tone="low" />
                <MetricBadge label="Просрочено" value={overdue} danger />
              </View>
            </View>

            <AIAssistant role="WORKER" worker={{ tasks, now, isOverdue, workerLocation }} />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Карта задач исполнителя</Text>
              <HotspotsMap requests={tasks} colorBy="priority" />
            </View>
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
            <Text style={styles.emptyText}>Нет назначенных задач</Text>
          </View>
        )}
      />
    </Screen>
  );
}

function MetricBadge(props: { label: string; value: number; danger?: boolean; tone?: "high" | "medium" | "low" }) {
  const toneStyle =
    props.tone === "high"
      ? styles.metricBadgeHigh
      : props.tone === "medium"
        ? styles.metricBadgeMedium
        : props.tone === "low"
          ? styles.metricBadgeLow
          : null;

  const toneTextStyle =
    props.tone === "high"
      ? styles.metricLabelHigh
      : props.tone === "medium"
        ? styles.metricLabelMedium
        : props.tone === "low"
          ? styles.metricLabelLow
          : null;

  return (
    <View style={[styles.metricBadge, toneStyle, props.danger && styles.metricBadgeDanger]}>
      <Text style={[styles.metricLabel, toneTextStyle, props.danger && styles.metricLabelDanger]}>{props.label}</Text>
      <Text style={[styles.metricValue, toneTextStyle, props.danger && styles.metricLabelDanger]}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { gap: 12, marginBottom: 12 },
  top: { padding: 16, gap: 6 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  h1: { fontSize: 20, fontWeight: "900", color: ui.colors.text },
  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.primarySoft,
  },
  ratingText: { fontSize: 12, fontWeight: "900", color: ui.colors.primary },
  p: { fontSize: 13, color: ui.colors.textMuted },
  notice: { marginTop: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  noticeDanger: { borderColor: ui.colors.danger, backgroundColor: ui.colors.dangerSoft },
  noticeWarn: { borderColor: ui.colors.warning, backgroundColor: "#fff7ea" },
  noticeText: { fontSize: 12, fontWeight: "900", color: ui.colors.text },
  card: { borderRadius: 14, borderWidth: 1, borderColor: ui.colors.border, backgroundColor: ui.colors.surface, padding: 12, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: "900", color: ui.colors.text },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricBadgeHigh: { borderColor: "#f0d0d0", backgroundColor: "#fdeeee" },
  metricBadgeMedium: { borderColor: "#ead8bc", backgroundColor: "#f7efe3" },
  metricBadgeLow: { borderColor: "#cde8d7", backgroundColor: ui.colors.primarySoft },
  metricBadgeDanger: { borderColor: "#f0d0d0", backgroundColor: "#fdeeee" },
  metricLabel: { fontSize: 12, fontWeight: "800", color: ui.colors.textMuted },
  metricLabelHigh: { color: ui.colors.danger },
  metricLabelMedium: { color: ui.colors.warning },
  metricLabelLow: { color: ui.colors.primary },
  metricLabelDanger: { color: ui.colors.danger },
  metricValue: { fontSize: 12, fontWeight: "900", color: ui.colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { fontWeight: "800", color: ui.colors.textMuted },
});
