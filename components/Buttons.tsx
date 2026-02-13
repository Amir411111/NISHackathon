import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ui } from "@/constants/ui";

type ButtonVariant = "primary" | "secondary" | "danger";

type Props = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: "default" | "compact";
}>;

export function Button({ onPress, disabled, loading, variant = "primary", size = "default", children }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === "compact" && styles.baseCompact,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={variant === "primary" ? ui.colors.surface : ui.colors.primary} /> : null}
        <Text
          style={[
            styles.textBase,
            size === "compact" && styles.textCompact,
            variant === "secondary" ? styles.textSecondary : variant === "danger" ? styles.textDanger : styles.textPrimary,
          ]}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: ui.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  baseCompact: {
    minHeight: 42,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  primary: { backgroundColor: ui.colors.primary },
  secondary: { backgroundColor: ui.colors.surfaceMuted, borderWidth: 1, borderColor: ui.colors.border },
  danger: { backgroundColor: ui.colors.dangerSoft, borderWidth: 1, borderColor: "#f3c7c7" },
  textBase: { fontSize: 16, fontWeight: "600" },
  textCompact: { fontSize: 14, fontWeight: "700" },
  textPrimary: { color: ui.colors.surface },
  textSecondary: { color: ui.colors.primary },
  textDanger: { color: ui.colors.danger },
});
