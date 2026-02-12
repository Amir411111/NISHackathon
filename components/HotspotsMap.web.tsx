import "leaflet/dist/leaflet.css";

import { CATEGORIES } from "@/constants/domain";
import type { Request } from "@/types/domain";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type LeafletParts = {
  MapContainer: any;
  TileLayer: any;
  CircleMarker: any;
  Popup: any;
};

type ColorMode = "status" | "priority";

function markerColorHex(r: Request, mode: ColorMode) {
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
  const [leaflet, setLeaflet] = useState<LeafletParts | null>(null);
  const mode = props.colorBy ?? "status";

  useEffect(() => {
    let active = true;

    if (typeof window === "undefined") return;

    import("react-leaflet")
      .then((mod) => {
        if (!active) return;
        setLeaflet({
          MapContainer: mod.MapContainer,
          TileLayer: mod.TileLayer,
          CircleMarker: mod.CircleMarker,
          Popup: mod.Popup,
        });
      })
      .catch(() => {
        if (!active) return;
        setLeaflet(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const center = useMemo<[number, number]>(() => {
    const avgLat = points.reduce((sum, r) => sum + r.location!.lat, 0) / points.length;
    const avgLon = points.reduce((sum, r) => sum + r.location!.lon, 0) / points.length;
    return [avgLat, avgLon];
  }, [points]);

  if (points.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Карта горячих точек</Text>
        <Text style={styles.metricMuted}>Нет заявок с координатами.</Text>
      </View>
    );
  }

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
      <Text style={styles.title}>Карта горячих точек</Text>

      <View style={styles.mapArea}>
        {leaflet ? (
          <leaflet.MapContainer center={center} zoom={12} scrollWheelZoom style={styles.leafletMap as any}>
            <leaflet.TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {points.map((r) => {
              const category = CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category;
              return (
                <leaflet.CircleMarker
                  key={r.id}
                  center={[r.location!.lat, r.location!.lon]}
                  radius={7}
                  pathOptions={{ color: markerColorHex(r, mode), fillColor: markerColorHex(r, mode), fillOpacity: 0.9 }}
                >
                  <leaflet.Popup>
                    <div>
                      <strong>{category}</strong>
                      <br />
                      {r.description}
                      <br />
                      Статус: {r.status}
                      <br />
                      Приоритет: {r.priority}
                    </div>
                  </leaflet.Popup>
                </leaflet.CircleMarker>
              );
            })}
          </leaflet.MapContainer>
        ) : (
          <View style={styles.loadingFallback}>
            <Text style={styles.metricMuted}>Загрузка интерактивной карты...</Text>
          </View>
        )}
      </View>

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

      <View style={styles.box}>
        <Text style={styles.metric}>Точек с координатами: {points.length}</Text>
        {top.length ? <Text style={styles.metric}>Топ категории: {top.join(" · ")}</Text> : null}
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
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    padding: 12,
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: "900", color: "#111" },
  mapArea: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ececec",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  leafletMap: { width: "100%", height: "100%" },
  loadingFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  legendText: { fontSize: 12, fontWeight: "700", color: "#555" },
  box: { marginTop: 4, gap: 6 },
  metric: { fontSize: 12, color: "#111", fontWeight: "800" },
  metricMuted: { fontSize: 12, color: "#666", fontWeight: "700" },
});
