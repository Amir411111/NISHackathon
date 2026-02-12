import { STATUS_STEPS } from "@/constants/domain";
import { ui } from "@/constants/ui";
import type { RequestStatus, StatusHistoryItem } from "@/types/domain";
import { formatDateTime } from "@/utils/time";
import { StyleSheet, Text, View } from "react-native";

export function StatusBar(props: { status: RequestStatus }) {
  if (props.status === "REJECTED") {
    return (
      <View style={styles.rejectedWrap}>
        <Text style={styles.rejectedText}>Отклонено диспетчером</Text>
      </View>
    );
  }

  const linearSteps = STATUS_STEPS.filter((s) => s.value !== "REJECTED");
  const activeIndex = linearSteps.findIndex((s) => s.value === props.status);

  return (
    <View style={styles.row}>
      {linearSteps.map((s, idx) => {
        const isActive = idx <= activeIndex;
        return (
          <View key={s.value} style={styles.step}>
            <View style={[styles.dot, isActive && styles.dotActive]} />
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function StatusTimeline(props: { history: StatusHistoryItem[] }) {
  const items = [...props.history].sort((a, b) => a.at - b.at);
  return (
    <View style={styles.timeline}>
      {items.map((h) => (
        <View key={`${h.status}_${h.at}`} style={styles.timelineItem}>
          <Text style={styles.timelineStatus}>{STATUS_STEPS.find((s) => s.value === h.status)?.label ?? h.status}</Text>
          <Text style={styles.timelineMeta}>{formatDateTime(h.at)} · {roleLabel(h.by)}</Text>
        </View>
      ))}
    </View>
  );
}

function roleLabel(r: string) {
  if (r === "CITIZEN") return "Житель";
  if (r === "WORKER") return "Исполнитель";
  if (r === "ADMIN") return "Диспетчер";
  return r;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  rejectedWrap: {
    borderRadius: 999,
    alignSelf: "flex-start",
    backgroundColor: ui.colors.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rejectedText: { color: ui.colors.danger, fontSize: 12, fontWeight: "900" },
  step: { flex: 1, alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 10, backgroundColor: "#d7dbe0" },
  dotActive: { backgroundColor: ui.colors.primary },
  stepLabel: { fontSize: 11, color: ui.colors.textMuted },
  stepLabelActive: { color: ui.colors.primary, fontWeight: "700" },
  timeline: { gap: 10 },
  timelineItem: { padding: 12, borderRadius: 12, backgroundColor: ui.colors.surfaceMuted, borderWidth: 1, borderColor: ui.colors.border },
  timelineStatus: { fontSize: 14, fontWeight: "800", color: ui.colors.text },
  timelineMeta: { marginTop: 4, fontSize: 12, color: ui.colors.textMuted },
});
