import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Buttons";
import { Field, Input } from "@/components/Form";
import { Screen } from "@/components/Screen";
import { ui } from "@/constants/ui";
import { changeMyPassword, getMyProfile, updateMyProfile, type UserStats } from "@/services/userService";
import { useAppStore } from "@/store/useAppStore";

export default function UserPageScreen() {
  const me = useAppStore((s) => s.user);
  const syncMe = useAppStore((s) => s.syncMe);
  const role = me?.role;

  const [fullName, setFullName] = useState(me?.fullName || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const profile = await getMyProfile();
        if (!alive) return;

        setFullName(profile.user.fullName || "");
        setStats(profile.stats);
        setRank(profile.user.rank ?? null);
      } catch {
        // keep fallback values from store
      }
    })();

    return () => {
      alive = false;
    };
  }, [me?.role]);

  const strongPassword = useMemo(() => newPassword.length >= 6 && /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword), [newPassword]);
  const canChangePassword = currentPassword.length > 0 && strongPassword && newPassword === confirmPassword;

  async function saveProfile() {
    if (fullName.trim().length < 3) {
      Alert.alert("Ошибка", "Введите корректное ФИО (минимум 3 символа).");
      return;
    }

    try {
      setSavingProfile(true);
      await updateMyProfile(fullName.trim());
      await syncMe();
      Alert.alert("Готово", "Профиль обновлен.");
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Не удалось обновить профиль";
      Alert.alert("Ошибка", String(msg));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (!canChangePassword) return;

    try {
      setSavingPassword(true);
      await changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Готово", "Пароль изменен.");
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Не удалось изменить пароль";
      Alert.alert("Ошибка", String(msg));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.title}>Профиль</Text>
        <Field label="ФИО">
          <Input value={fullName} onChangeText={setFullName} placeholder="Иванов Иван Иванович" />
        </Field>
        <Text style={styles.meta}>Email: {me?.email || "—"}</Text>
        <Text style={styles.meta}>Роль: {me?.role || "—"}</Text>
        <Text style={styles.meta}>Баллы: {String(me?.points ?? 0)}</Text>
        <Button onPress={saveProfile} loading={savingProfile} disabled={savingProfile}>Сохранить профиль</Button>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Смена пароля</Text>
        <Field label="Текущий пароль">
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Введите текущий пароль"
            style={styles.input}
          />
        </Field>
        <Field label="Новый пароль">
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Минимум 6 символов, буквы и цифры"
            style={styles.input}
          />
        </Field>
        <Field label="Повторите новый пароль">
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Повторите новый пароль"
            style={styles.input}
          />
        </Field>
        {newPassword.length > 0 && !strongPassword ? <Text style={styles.warn}>Новый пароль: минимум 6 символов + буквы и цифры.</Text> : null}
        {confirmPassword.length > 0 && confirmPassword !== newPassword ? <Text style={styles.warn}>Пароли не совпадают.</Text> : null}
        <Button onPress={savePassword} loading={savingPassword} disabled={!canChangePassword || savingPassword}>Изменить пароль</Button>
      </View>

      {role !== "ADMIN" ? (
        <View style={styles.card}>
          <Text style={styles.title}>Моя статистика</Text>
          <Metric label="Место в рейтинге" value={rank ? `#${rank}` : "—"} />

          {role === "WORKER" ? (
            <>
              <Metric label="Активных задач" value={String(stats?.requestsActive ?? 0)} />
              <Metric label="Завершено задач" value={String(stats?.tasksCompleted ?? 0)} />
              <Metric label="Среднее закрытие" value={stats?.avgCloseMinutes == null ? "—" : `${stats.avgCloseMinutes} мин`} />
            </>
          ) : null}

          {role === "CITIZEN" ? (
            <>
              <Metric label="Создано заявок" value={String(stats?.requestsCreated ?? 0)} />
              <Metric label="Подтверждено" value={String(stats?.requestsConfirmed ?? 0)} />
              <Metric label="Активных заявок" value={String(stats?.requestsActive ?? 0)} />
            </>
          ) : null}
        </View>
      ) : null}

      {role === "CITIZEN" ? (
        <View style={styles.card}>
          <Text style={styles.title}>Активности</Text>
          <Text style={styles.meta}>Подтвержденные и закрытые задачи по дням</Text>
          <ActivityHeatmap data={stats?.activity || []} />
        </View>
      ) : null}
    </Screen>
  );
}

function ActivityHeatmap(props: { data: Array<{ date: string; count: number }> }) {
  const values = props.data.map((item) => item.count);
  const max = values.length ? Math.max(...values) : 0;

  return (
    <View style={styles.heatmapWrap}>
      {props.data.map((item) => (
        <View key={item.date} style={[styles.cell, cellColor(item.count, max)]} />
      ))}
    </View>
  );
}

function cellColor(count: number, max: number) {
  if (count <= 0) return styles.cell0;
  if (max <= 1) return styles.cell3;
  const ratio = count / max;
  if (ratio < 0.34) return styles.cell1;
  if (ratio < 0.67) return styles.cell2;
  return styles.cell3;
}

function Metric(props: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{props.label}</Text>
      <Text style={styles.metricValue}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fff", gap: 10 },
  title: { fontSize: 16, fontWeight: "900", color: "#111" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  meta: { fontSize: 13, fontWeight: "700", color: "#444" },
  warn: { fontSize: 12, fontWeight: "700", color: "#a16207" },
  metric: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  metricLabel: { fontSize: 13, fontWeight: "700", color: "#666" },
  metricValue: { fontSize: 13, fontWeight: "900", color: "#111" },
  heatmapWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  cell: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  cell0: { backgroundColor: ui.colors.surfaceMuted },
  cell1: { backgroundColor: ui.colors.primarySoft },
  cell2: { backgroundColor: ui.colors.primary },
  cell3: { backgroundColor: ui.colors.primary },
});
