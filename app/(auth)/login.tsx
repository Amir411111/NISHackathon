import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Buttons";
import { Field } from "@/components/Form";
import { Screen } from "@/components/Screen";
import { logout as apiLogout, getMe, login, register } from "@/services/authService";
import { useAppStore } from "@/store/useAppStore";
import type { UserRole } from "@/types/domain";

export default function LoginScreen() {
  const loginAs = useAppStore((s) => s.loginAs);
  const syncMe = useAppStore((s) => s.syncMe);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<UserRole>("CITIZEN");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canProceed = useMemo(() => {
    if (mode === "login") return identifier.trim().length > 2 && password.length >= 6;
    return email.trim().includes("@") && password.length >= 6;
  }, [mode, identifier, email, password]);

  const roleTitle = useMemo(() => {
    if (role === "CITIZEN") return "Житель";
    if (role === "WORKER") return "Полевой сотрудник";
    return "Диспетчер / Акимат";
  }, [role]);

  async function proceed() {
    if (!canProceed) return;

    setIssuedKey(null);
    await apiLogout().catch(() => {});

    try {
      setBusy(true);

      if (mode === "login") {
        const session = await login({ email: identifier.trim(), password });
        loginAs(session.role);
      } else {
        const session = await register({ email: email.trim(), password, role });
        loginAs(session.role);
        const me = await getMe();
        setIssuedKey(me.digitalIdKey);
      }

      await syncMe();

      const sessionRole = useAppStore.getState().user?.role ?? role;
      if (sessionRole === "CITIZEN") router.replace("/(citizen)");
      if (sessionRole === "WORKER") router.replace("/(worker)");
      if (sessionRole === "ADMIN") router.replace("/(admin)");
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error;
      Alert.alert("Ошибка авторизации", msg || `HTTP ${status ?? "?"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.h1}>Digital ID (eGov) · Auth</Text>
      <Text style={styles.p}>Регистрация по роли + вход по Email или Digital ID key.</Text>

      <View style={styles.modeRow}>
        <ModeChip title="Вход" active={mode === "login"} onPress={() => setMode("login")} />
        <ModeChip title="Регистрация" active={mode === "register"} onPress={() => setMode("register")} />
      </View>

      {mode === "register" ? (
        <Field label="Роль">
          <View style={styles.roleRow}>
            <RoleChip title="Citizen" subtitle="Житель" active={role === "CITIZEN"} onPress={() => setRole("CITIZEN")} />
            <RoleChip title="Worker" subtitle="Исполнитель" active={role === "WORKER"} onPress={() => setRole("WORKER")} />
            <RoleChip title="Admin" subtitle="Диспетчер" active={role === "ADMIN"} onPress={() => setRole("ADMIN")} />
          </View>
        </Field>
      ) : null}

      {mode === "login" ? (
        <Field label="Email или Digital ID key">
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="user@mail.com или did_..."
            style={styles.input}
          />
        </Field>
      ) : (
        <Field label="Email">
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="user@mail.com"
            style={styles.input}
          />
        </Field>
      )}

      <Field label="Пароль">
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="минимум 6 символов" style={styles.input} />
      </Field>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Статус:</Text>
        <Text style={styles.summaryValue}>{mode === "register" ? `Регистрация: ${roleTitle}` : "Вход"}</Text>
        {issuedKey ? (
          <Pressable onPress={() => Alert.alert("Digital ID key", issuedKey)}>
            <Text style={styles.key}>Digital ID key: {issuedKey}</Text>
            <Text style={styles.keyHint}>Нажмите, чтобы показать/скопировать</Text>
          </Pressable>
        ) : null}
      </View>

      <Button onPress={proceed} disabled={!canProceed} loading={busy}>
        {mode === "login" ? "Войти" : "Зарегистрироваться"}
      </Button>
    </Screen>
  );
}

function ModeChip(props: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.modeChip, props.active && styles.modeChipActive]}>
      <Text style={[styles.modeText, props.active && styles.modeTextActive]}>{props.title}</Text>
    </Pressable>
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

  modeRow: { flexDirection: "row", gap: 10 },
  modeChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  modeChipActive: { borderColor: "#111", backgroundColor: "#f7f7f7" },
  modeText: { fontSize: 13, fontWeight: "900", color: "#555" },
  modeTextActive: { color: "#111" },

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

  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },

  summary: { padding: 12, borderRadius: 14, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee" },
  summaryTitle: { fontSize: 12, color: "#666", fontWeight: "800" },
  summaryValue: { marginTop: 4, fontSize: 16, fontWeight: "900", color: "#111" },
  key: { marginTop: 8, fontSize: 12, fontWeight: "900", color: "#111" },
  keyHint: { marginTop: 2, fontSize: 11, fontWeight: "700", color: "#666" },
});
