import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ui } from "@/constants/ui";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function HeaderButton(props: { title?: string; icon?: IconName; onPress: () => void; compact?: boolean }) {
  const iconOnly = !!props.icon && !props.title;

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [styles.btn, props.compact && styles.btnCompact, iconOnly && styles.btnIconOnly, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        {props.icon ? <Ionicons name={props.icon} size={props.compact ? 14 : 16} color={ui.colors.primary} /> : null}
        {props.title ? <Text style={[styles.text, props.compact && styles.textCompact]}>{props.title}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCompact: {
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  btnIconOnly: {
    minWidth: 28,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  pressed: { opacity: 0.6 },
  text: { fontSize: 13, fontWeight: "800", color: ui.colors.primary },
  textCompact: { fontSize: 12 },
});
