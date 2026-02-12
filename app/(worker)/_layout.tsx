import { Stack, router } from "expo-router";

import { HeaderButton } from "@/components/HeaderButton";
import { ui } from "@/constants/ui";
import { useAppStore } from "@/store/useAppStore";

export default function WorkerLayout() {
  const logout = useAppStore((s) => s.logout);

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: ui.colors.surface },
        headerShadowVisible: false,
        headerTintColor: ui.colors.primary,
        headerTitleStyle: { color: ui.colors.text, fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Рабочий лист",
          headerRight: () => <HeaderButton title="Профиль" onPress={() => router.push("/(worker)/user")} />,
          headerLeft: () => (
            <HeaderButton
              title="Выйти"
              onPress={() => {
                logout();
                router.replace("/(auth)/login");
              }}
            />
          ),
        }}
      />
      <Stack.Screen name="tasks/[id]" options={{ title: "Выполнение" }} />
      <Stack.Screen name="user" options={{ title: "Профиль" }} />
    </Stack>
  );
}
