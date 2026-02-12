import { StatusBar } from "@/components/Status";
import { CATEGORIES } from "@/constants/domain";
import type { Request, Worker } from "@/types/domain";
import { StyleSheet, Text, View } from "react-native";

export function RequestCard(props: {
  request: Request;
  worker?: Worker;
  overdue?: boolean;
}) {
  const categoryLabel = CATEGORIES.find((c) => c.value === props.request.category)?.label ?? props.request.category;
  const coordLabel = props.request.location
    ? `${props.request.location.lat.toFixed(5)}, ${props.request.location.lon.toFixed(5)}`
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{categoryLabel}</Text>
        <View style={styles.badges}>
          <Badge text={priorityLabel(props.request.priority)} tone={props.request.priority === "HIGH" ? "danger" : "neutral"} />
          {props.overdue ? <Badge text="Просрочено" tone="danger" /> : null}
        </View>
      </View>

      {props.request.addressLabel ? <Text style={styles.sub}>{props.request.addressLabel}</Text> : null}
      {coordLabel ? <Text style={styles.coord}>Коорд.: {coordLabel}</Text> : null}
      <Text style={styles.desc} numberOfLines={2}>
        {props.request.description}
      </Text>

      {props.worker ? <Text style={styles.meta}>Исполнитель: {props.worker.name}</Text> : null}

      <StatusBar status={props.request.status} />
    </View>
  );
}

function priorityLabel(p: Request["priority"]) {
  if (p === "HIGH") return "Высокий";
  if (p === "MEDIUM") return "Средний";
  return "Низкий";
}

function Badge(props: { text: string; tone: "neutral" | "danger" }) {
  return (
    <View style={[styles.badge, props.tone === "danger" && styles.badgeDanger]}>
      <Text style={[styles.badgeText, props.tone === "danger" && styles.badgeTextDanger]}>{props.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    gap: 10,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 16, fontWeight: "900", color: "#111" },
  sub: { fontSize: 13, color: "#666" },
  coord: { fontSize: 12, color: "#666", fontWeight: "700" },
  desc: { fontSize: 14, color: "#222" },
  meta: { fontSize: 12, color: "#444" },
  badges: { flexDirection: "row", gap: 8, alignItems: "center" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#f2f2f2" },
  badgeDanger: { backgroundColor: "#ffe9ea" },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#444" },
  badgeTextDanger: { color: "#b00020" },
});
