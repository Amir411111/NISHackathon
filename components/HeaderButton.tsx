import { Pressable, StyleSheet, Text } from "react-native";

import { ui } from "@/constants/ui";

export function HeaderButton(props: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <Text style={styles.text}>{props.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 12, paddingVertical: 6 },
  pressed: { opacity: 0.6 },
  text: { fontSize: 14, fontWeight: "700", color: ui.colors.primary },
});
