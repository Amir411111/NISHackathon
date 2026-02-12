import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAppStore } from "@/store/useAppStore";

export default function Index() {
  const user = useAppStore((s) => s.user);
  const authBootstrapped = useAppStore((s) => s.authBootstrapped);
  const bootstrapAuth = useAppStore((s) => s.bootstrapAuth);

  useEffect(() => {
    if (!authBootstrapped) bootstrapAuth();
  }, [authBootstrapped, bootstrapAuth]);

  if (!authBootstrapped) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === "CITIZEN") return <Redirect href="/(citizen)" />;
  if (user.role === "WORKER") return <Redirect href="/(worker)" />;
  return <Redirect href="/(admin)" />;
}
