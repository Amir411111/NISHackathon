import { CATEGORIES } from "@/constants/domain";
import type { Request } from "@/types/domain";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

type ColorMode = "status" | "priority";

function markerColor(r: Request, mode: ColorMode) {
  if (mode === "priority") {
    if (r.priority === "HIGH") return "#d32f2f";
    if (r.priority === "MEDIUM") return "#fb8c00";
    return "#2e7d32";
  }

  if (r.status === "DONE") return "#2e7d32";
  if (r.status === "IN_PROGRESS") return "#f9a825";
  if (r.status === "ASSIGNED") return "#fb8c00";
  return "#d32f2f";
}

export function HotspotsMap(props: { requests: Request[]; colorBy?: ColorMode }) {
  const points = props.requests.filter((r) => r.location);
  const mode = props.colorBy ?? "status";

  if (points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Карта: нет координат (mock)</Text>
      </View>
    );
  }

  const first = points[0]?.location!;

  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: first.lat,
          longitude: first.lon,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {points.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.location!.lat, longitude: r.location!.lon }}
            title={CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category}
            description={r.addressLabel ?? r.description}
            pinColor={markerColor(r, mode)}
          />
        ))}
      </MapView>

      <View style={styles.legendRow}>
        {mode === "priority" ? (
          <>
            <LegendDot color="#d32f2f" label="Высокий" />
            <LegendDot color="#fb8c00" label="Средний" />
            <LegendDot color="#2e7d32" label="Низкий" />
          </>
        ) : (
          <>
            <LegendDot color="#d32f2f" label="Новая" />
            <LegendDot color="#fb8c00" label="Назначена" />
            <LegendDot color="#f9a825" label="В работе" />
            <LegendDot color="#2e7d32" label="Выполнена" />
          </>
        )}
      </View>
    </View>
  );
}

function LegendDot(props: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: props.color }]} />
      <Text style={styles.legendText}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  map: { height: 220, borderRadius: 14, overflow: "hidden" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  legendText: { fontSize: 12, fontWeight: "700", color: "#555" },
  empty: {
    height: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontWeight: "800", color: "#666" },
});
