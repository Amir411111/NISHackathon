import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { HotspotsMap } from "@/components/HotspotsMap";
import { Screen } from "@/components/Screen";
import { ui } from "@/constants/ui";
import { adminListAll, analyticsSummary } from "@/services/requestService";
import { getWorkers } from "@/services/workerService";
import { useAppStore } from "@/store/useAppStore";

export default function AdminDashboardScreen() {
  const requests = useAppStore((s) => s.requests);
  const workers = useAppStore((s) => s.workers);
  const replaceRequests = useAppStore((s) => s.replaceRequests);
  const replaceWorkers = useAppStore((s) => s.replaceWorkers);
  const avgClosure = useAppStore((s) => s.getAverageClosureMinutes());

  const [summary, setSummary] = useState<null | { total: number; overdue: number; byStatus: Record<string, number>; avgCloseMinutes: number | null }>(null);

  useEffect(() => {
    let alive = true;
    analyticsSummary()
      .then((s) => {
        if (!alive) return;
        setSummary(s);
      })
      .catch(() => {
        // keep mock-only mode
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    adminListAll()
      .then((items) => {
        if (!alive) return;
        replaceRequests(items);
      })
      .catch(() => {
        // keep fallback from store
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

  const total = summary?.total ?? requests.length;
  const done = summary?.byStatus?.DONE ?? requests.filter((r) => r.status === "DONE").length;
  const inProgress = summary?.byStatus?.IN_PROGRESS ?? requests.filter((r) => r.status === "IN_PROGRESS").length;
  const overdue = summary?.overdue;
  const avgClose = summary?.avgCloseMinutes ?? avgClosure;

  const contractorRatings = workers;

  return (
    <Screen>
      <Card title="Сводка">
        <Metric label="Заявок всего" value={String(total)} />
        <Metric label="В работе" value={String(inProgress)} />
        <Metric label="Выполнено" value={String(done)} />
        {typeof overdue === "number" ? <Metric label="Просрочено" value={String(overdue)} /> : null}
        <Metric label="Среднее время закрытия" value={avgClose === null ? "—" : `${avgClose} мин`} />
      </Card>

      <Card title="Рейтинг подрядчиков">
        {contractorRatings.length === 0 ? <Text style={styles.empty}>Исполнители пока не найдены</Text> : null}
        {contractorRatings.map((w) => (
          <View key={w.id} style={styles.row}>
            <Text style={styles.contractor}>{w.name}</Text>
            <Text style={styles.value}>⭐ {w.rating.toFixed(1)}</Text>
          </View>
        ))}
      </Card>

      <Card title="Карта горячих точек города">
        <HotspotsMap requests={requests} />
      </Card>
    </Screen>
  );
}

function Card(props: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{props.title}</Text>
      <View style={styles.body}>{props.children}</View>
    </View>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{props.label}</Text>
      <Text style={styles.metricValue}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: ui.colors.border, backgroundColor: ui.colors.surface, gap: 12 },
  title: { fontSize: 14, fontWeight: "900", color: ui.colors.text },
  body: { gap: 10 },
  metric: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  label: { fontSize: 13, color: ui.colors.textMuted, fontWeight: "700" },
  metricValue: { fontSize: 14, color: ui.colors.text, fontWeight: "900" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  contractor: { fontSize: 13, fontWeight: "800", color: ui.colors.text },
  value: { fontSize: 13, fontWeight: "900", color: ui.colors.primary },
  empty: { color: ui.colors.textMuted, fontWeight: "700" },
});
