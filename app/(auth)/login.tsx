import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { Field } from "@/components/Form";
import { Screen } from "@/components/Screen";
import { useAppStore } from "@/store/useAppStore";
import type { UserRole } from "@/types/domain";

export default function LoginScreen() {
  const workers = useAppStore((s) => s.workers);
  const loginAs = useAppStore((s) => s.loginAs);

  const [role, setRole] = useState<UserRole>("CITIZEN");
  const [workerId, setWorkerId] = useState<string>(workers[0]?.id ?? "");

  const canProceed = role !== "WORKER" || Boolean(workerId);

  const roleTitle = useMemo(() => {
    if (role === "CITIZEN") return "Житель";
    if (role === "WORKER") return "Полевой сотрудник";
    return "Диспетчер / Акимат";
  }, [role]);

  function proceed() {
    if (!canProceed) return;

    loginAs(role, role === "WORKER" ? { workerId } : undefined);

    if (role === "CITIZEN") router.replace("/(citizen)");
    if (role === "WORKER") router.replace("/(worker)");
    if (role === "ADMIN") router.replace("/(admin)");
  }

  return (
    <Screen>
      <Text style={styles.h1}>Вход через Digital ID (eGov)</Text>
      <Text style={styles.p}>
        Это заглушка для MVP (frontend-only). Выберите роль, чтобы посмотреть модуль и навигацию.
      </Text>

      <Field label="Роль">
        <View style={styles.roleRow}>
          <RoleChip title="Citizen" subtitle="Житель" active={role === "CITIZEN"} onPress={() => setRole("CITIZEN")} />
          <RoleChip title="Worker" subtitle="Исполнитель" active={role === "WORKER"} onPress={() => setRole("WORKER")} />
          <RoleChip title="Admin" subtitle="Диспетчер" active={role === "ADMIN"} onPress={() => setRole("ADMIN")} />
        </View>
      </Field>

      {role === "WORKER" ? (
        <Field label="Выбор исполнителя (mock)">
          <View style={styles.workerList}>
            {workers.map((w) => {
              const active = w.id === workerId;
              return (
                <Pressable key={w.id} onPress={() => setWorkerId(w.id)} style={[styles.workerItem, active && styles.workerItemActive]}>
                  <Text style={[styles.workerName, active && styles.workerNameActive]}>{w.name}</Text>
                  <Text style={styles.workerMeta}>{w.contractorName} · ⭐ {w.rating.toFixed(1)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      ) : null}

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Выбрано:</Text>
        <Text style={styles.summaryValue}>{roleTitle}</Text>
      </View>

      <Button onPress={proceed} disabled={!canProceed}>
        Войти (mock)
      </Button>
    </Screen>
  );
}

function RoleChip(props: { title: string; subtitle: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.roleChip, props.active && styles.roleChipActive]}>
      <Text style={[styles.roleTitle, props.active && styles.roleTitleActive]}>{props.title}</Text>
      <Text style={[styles.roleSub, props.active && styles.roleSubActive]}>{props.subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "900", color: "#111" },
  p: { fontSize: 14, color: "#444", lineHeight: 20 },
  roleRow: { flexDirection: "row", gap: 10 },
  roleChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
    backgroundColor: "#fff",
  },
  roleChipActive: { borderColor: "#111", backgroundColor: "#f7f7f7" },
  roleTitle: { fontSize: 14, fontWeight: "900", color: "#555" },
  roleTitleActive: { color: "#111" },
  roleSub: { fontSize: 12, fontWeight: "700", color: "#777" },
  roleSubActive: { color: "#111" },
  workerList: { gap: 10 },
  workerItem: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fff", gap: 4 },
  workerItemActive: { borderColor: "#111" },
  workerName: { fontSize: 14, fontWeight: "900", color: "#111" },
  workerNameActive: { color: "#111" },
  workerMeta: { fontSize: 12, color: "#666" },
  summary: { padding: 12, borderRadius: 14, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee" },
  summaryTitle: { fontSize: 12, color: "#666", fontWeight: "800" },
  summaryValue: { marginTop: 4, fontSize: 16, fontWeight: "900", color: "#111" },
});
