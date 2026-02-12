import { Stack, router } from "expo-router";

import { HeaderButton } from "@/components/HeaderButton";
import { ui } from "@/constants/ui";
import { useAppStore } from "@/store/useAppStore";

export default function CitizenLayout() {
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
          title: "eQala",
          headerRight: () => <HeaderButton title="Профиль" onPress={() => router.push("/(citizen)/user")} />,
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
      <Stack.Screen name="new" options={{ title: "Подать заявку" }} />
      <Stack.Screen name="requests/[id]" options={{ title: "Заявка" }} />
      <Stack.Screen name="user" options={{ title: "Профиль" }} />
    </Stack>
  );
}
