import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type ButtonVariant = "primary" | "secondary" | "danger";

type Props = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
}>;

export function Button({ onPress, disabled, loading, variant = "primary", children }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={variant === "secondary" ? "#111" : "#fff"} /> : null}
        <Text style={[styles.textBase, variant === "secondary" ? styles.textSecondary : styles.textPrimary]}>{children}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  primary: { backgroundColor: "#111" },
  secondary: { backgroundColor: "#f2f2f2" },
  danger: { backgroundColor: "#b00020" },
  textBase: { fontSize: 16, fontWeight: "600" },
  textPrimary: { color: "#fff" },
  textSecondary: { color: "#111" },
});
