import type { PropsWithChildren } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export function Field({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export function Input(props: { value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      multiline={props.multiline}
      style={[styles.input, props.multiline && styles.inputMultiline]}
      textAlignVertical={props.multiline ? "top" : "center"}
    />
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, color: "#444", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 96 },
});
