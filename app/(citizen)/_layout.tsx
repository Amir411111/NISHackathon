import { Stack, router } from "expo-router";
import { View } from "react-native";

import { HeaderButton } from "@/components/HeaderButton";
import { ui } from "@/constants/ui";
import { useAppStore } from "@/store/useAppStore";

export default function CitizenLayout() {
  const logout = useAppStore((s) => s.logout);

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerBackTitle: "",
        headerStyle: { backgroundColor: ui.colors.surface },
        headerShadowVisible: false,
        headerTintColor: ui.colors.primary,
        headerTitleStyle: { color: ui.colors.text, fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "eQala",
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginRight: 8 }}>
              <HeaderButton compact icon="trophy-outline" onPress={() => router.push("/(citizen)/leaderboard")} />
              <HeaderButton compact icon="person" onPress={() => router.push("/(citizen)/user")} />
            </View>
          ),
          headerLeft: () => (
            <View style={{ marginLeft: 8 }}>
              <HeaderButton
                compact
                icon="log-out-outline"
                onPress={() => {
                  logout();
                  router.replace("/(auth)/login");
                }}
              />
            </View>
          ),
        }}
      />
      <Stack.Screen name="new" options={{ title: "Подать заявку" }} />
      <Stack.Screen name="requests/[id]" options={{ title: "Заявка" }} />
      <Stack.Screen name="user" options={{ title: "Профиль" }} />
      <Stack.Screen name="leaderboard" options={{ title: "Рейтинг" }} />
    </Stack>
  );
}
