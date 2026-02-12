import { CATEGORIES } from "@/constants/domain";
import type { Category } from "@/types/domain";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function CategorySelector(props: { value: Category; onChange: (v: Category) => void }) {
  return (
    <View style={styles.wrap}>
      {CATEGORIES.map((c) => {
        const active = c.value === props.value;
        return (
          <Pressable key={c.value} onPress={() => props.onChange(c.value)} style={[styles.item, active && styles.itemActive]}>
            <Text style={[styles.text, active && styles.textActive]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 10 },
  item: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  itemActive: { borderColor: "#111", backgroundColor: "#f7f7f7" },
  text: { fontSize: 14, fontWeight: "700", color: "#555" },
  textActive: { color: "#111" },
});
