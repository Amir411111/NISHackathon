import { CATEGORIES } from "@/constants/domain";
import type { Request } from "@/types/domain";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

export function HotspotsMap(props: { requests: Request[] }) {
  const points = props.requests.filter((r) => r.location);

  if (points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Карта: нет координат (mock)</Text>
      </View>
    );
  }

  const first = points[0]?.location!;

  return (
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
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 220, borderRadius: 14, overflow: "hidden" },
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
