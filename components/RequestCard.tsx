import { StatusBar } from "@/components/Status";
import { CATEGORIES } from "@/constants/domain";
import { ui } from "@/constants/ui";
import type { Request, Worker } from "@/types/domain";
import { formatDateTime } from "@/utils/time";
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
      {props.request.slaDeadline ? <Text style={styles.deadline}>Дедлайн: {formatDateTime(props.request.slaDeadline)}</Text> : null}
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
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    gap: 10,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 16, fontWeight: "900", color: ui.colors.text },
  sub: { fontSize: 13, color: ui.colors.textMuted },
  coord: { fontSize: 12, color: ui.colors.textMuted, fontWeight: "700" },
  deadline: { fontSize: 12, color: ui.colors.warning, fontWeight: "900" },
  desc: { fontSize: 14, color: ui.colors.text },
  meta: { fontSize: 12, color: ui.colors.textMuted },
  badges: { flexDirection: "row", gap: 8, alignItems: "center" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: ui.radius.pill, backgroundColor: ui.colors.surfaceMuted },
  badgeDanger: { backgroundColor: ui.colors.dangerSoft },
  badgeText: { fontSize: 11, fontWeight: "800", color: ui.colors.textMuted },
  badgeTextDanger: { color: ui.colors.danger },
});
