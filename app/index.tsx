import { Redirect } from "expo-router";

import { useAppStore } from "@/store/useAppStore";

export default function Index() {
  const user = useAppStore((s) => s.user);

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === "CITIZEN") return <Redirect href="/(citizen)" />;
  if (user.role === "WORKER") return <Redirect href="/(worker)" />;
  return <Redirect href="/(admin)" />;
}
