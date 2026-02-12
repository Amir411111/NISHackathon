import { Stack, router } from "expo-router";

import { HeaderButton } from "@/components/HeaderButton";
import { useAppStore } from "@/store/useAppStore";

export default function AdminLayout() {
  const logout = useAppStore((s) => s.logout);

  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen
        name="index"
        options={{
          title: "Диспетчер",
          headerRight: () => <HeaderButton title="Дашборд" onPress={() => router.push("/(admin)/dashboard")} />,
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
      <Stack.Screen name="dashboard" options={{ title: "Аналитика" }} />
    </Stack>
  );
}
