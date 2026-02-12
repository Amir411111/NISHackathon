import { Stack } from "expo-router";

import { ui } from "@/constants/ui";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: ui.colors.surface },
        headerShadowVisible: false,
        headerTintColor: ui.colors.primary,
        headerTitleStyle: { color: ui.colors.text, fontWeight: "700" },
      }}
    />
  );
}
