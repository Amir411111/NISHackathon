import { Stack, router } from "expo-router";

import { HeaderButton } from "@/components/HeaderButton";
import { useAppStore } from "@/store/useAppStore";

export default function CitizenLayout() {
  const logout = useAppStore((s) => s.logout);

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "eOtinish",
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
