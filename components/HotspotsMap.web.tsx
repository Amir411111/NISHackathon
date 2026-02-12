import { CATEGORIES } from "@/constants/domain";
import type { Request } from "@/types/domain";
import { StyleSheet, Text, View } from "react-native";

export function HotspotsMap(props: { requests: Request[] }) {
  const points = props.requests.filter((r) => r.location);

  const byCategory = points.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  const top = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => {
      const label = CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
      return `${label}: ${count}`;
    });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Карта на web: заглушка</Text>
      <Text style={styles.sub}>
        react-native-maps использует нативные модули и не поддерживается в web-сборке этого MVP.
      </Text>

      <View style={styles.box}>
        <Text style={styles.metric}>Точек с координатами: {points.length}</Text>
        {top.length ? <Text style={styles.metric}>Топ категории: {top.join(" · ")}</Text> : null}
        {!top.length ? <Text style={styles.metricMuted}>Добавьте координаты в заявках, чтобы увидеть статистику.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    padding: 12,
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: "900", color: "#111" },
  sub: { fontSize: 12, color: "#666", fontWeight: "700", lineHeight: 16 },
  box: { marginTop: 4, gap: 6 },
  metric: { fontSize: 12, color: "#111", fontWeight: "800" },
  metricMuted: { fontSize: 12, color: "#666", fontWeight: "700" },
});
