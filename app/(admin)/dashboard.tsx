import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { HotspotsMap } from "@/components/HotspotsMap";
import { Screen } from "@/components/Screen";
import { useAppStore } from "@/store/useAppStore";

export default function AdminDashboardScreen() {
  const requests = useAppStore((s) => s.requests);
  const workers = useAppStore((s) => s.workers);
  const avgClosure = useAppStore((s) => s.getAverageClosureMinutes());

  const total = requests.length;
  const done = requests.filter((r) => r.status === "DONE").length;
  const inProgress = requests.filter((r) => r.status === "IN_PROGRESS").length;

  const contractorRatings = summarizeContractors(workers);

  return (
    <Screen>
      <Card title="Сводка">
        <Metric label="Заявок всего" value={String(total)} />
        <Metric label="В работе" value={String(inProgress)} />
        <Metric label="Выполнено" value={String(done)} />
        <Metric label="Среднее время закрытия" value={avgClosure === null ? "—" : `${avgClosure} мин`} />
      </Card>

      <Card title="Рейтинг подрядчиков (mock)">
        {contractorRatings.map((c) => (
          <View key={c.contractorName} style={styles.row}>
            <Text style={styles.contractor}>{c.contractorName}</Text>
            <Text style={styles.value}>⭐ {c.avgRating.toFixed(1)}</Text>
          </View>
        ))}
      </Card>

      <Card title="Карта горячих точек (заглушка MapView)">
        <HotspotsMap requests={requests} />
      </Card>
    </Screen>
  );
}

function summarizeContractors(workers: { contractorName: string; rating: number }[]) {
  const map = new Map<string, { sum: number; count: number }>();
  for (const w of workers) {
    const cur = map.get(w.contractorName) ?? { sum: 0, count: 0 };
    map.set(w.contractorName, { sum: cur.sum + w.rating, count: cur.count + 1 });
  }
  return [...map.entries()].map(([contractorName, v]) => ({
    contractorName,
    avgRating: v.sum / v.count,
  }));
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
  card: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fff", gap: 12 },
  title: { fontSize: 14, fontWeight: "900", color: "#111" },
  body: { gap: 10 },
  metric: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  label: { fontSize: 13, color: "#666", fontWeight: "700" },
  metricValue: { fontSize: 14, color: "#111", fontWeight: "900" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  contractor: { fontSize: 13, fontWeight: "800", color: "#111" },
  value: { fontSize: 13, fontWeight: "900", color: "#111" },
});
