import type { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

type Props = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
}>;

export function Screen({ children, scroll = true, padded = true }: Props) {
  const content = <View style={[styles.content, padded && styles.padded]}>{children}</View>;

  return (
    <SafeAreaView style={styles.root}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  scroll: { flexGrow: 1 },
  content: { flex: 1 },
  padded: { padding: 16, gap: 12 },
});
