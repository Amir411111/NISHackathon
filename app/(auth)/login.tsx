import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Buttons";
import { Field } from "@/components/Form";
import { Screen } from "@/components/Screen";
import { ui } from "@/constants/ui";
import { logout as apiLogout, downloadDigitalIdFile, login, loginWithDigitalIdFile, register, type RegisterResult } from "@/services/authService";
import { useAppStore } from "@/store/useAppStore";
import type { UserRole } from "@/types/domain";

export default function LoginScreen() {
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const loginAs = useAppStore((s) => s.loginAs);
  const syncMe = useAppStore((s) => s.syncMe);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<UserRole>("CITIZEN");
  const [loginMethod, setLoginMethod] = useState<"email" | "digital-file">("email");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedNativeFile, setSelectedNativeFile] = useState<{ uri: string; name?: string; mimeType?: string } | null>(null);
  const [issuedFile, setIssuedFile] = useState<RegisterResult["digitalIdFile"] | null>(null);
  const [errorText, setErrorText] = useState("");
  const [hintText, setHintText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (modeParam === "register") setMode("register");
    if (modeParam === "login") setMode("login");
  }, [modeParam]);

  const isStrongPassword = useMemo(() => {
    return password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password);
  }, [password]);

  const canProceed = useMemo(() => {
    if (mode === "login") {
      if (loginMethod === "email") return identifier.trim().length > 0 && password.length > 0;
      return (!!selectedFile || !!selectedNativeFile) && password.length > 0;
    }
    return fullName.trim().length >= 3 && email.trim().includes("@") && isStrongPassword && password === confirmPassword;
  }, [mode, loginMethod, fullName, identifier, email, password, confirmPassword, selectedFile, selectedNativeFile, isStrongPassword]);

  const roleTitle = useMemo(() => {
    if (role === "CITIZEN") return "Житель";
    if (role === "WORKER") return "Полевой сотрудник";
    return "Диспетчер / Акимат";
  }, [role]);

  async function proceed() {
    if (!canProceed) return;

    setErrorText("");
    setHintText("");
    setIssuedFile(null);
    await apiLogout().catch(() => {});

    try {
      setBusy(true);

      if (mode === "login") {
        let session;
        if (loginMethod === "email") {
          session = await login({ email: identifier.trim(), password });
        } else {
          if (Platform.OS === "web") {
            if (!selectedFile) throw new Error("FILE_REQUIRED");
            session = await loginWithDigitalIdFile({
              file: selectedFile,
              fileName: selectedFile.name,
              password,
            });
          } else {
            if (!selectedNativeFile) throw new Error("FILE_REQUIRED");
            session = await loginWithDigitalIdFile({
              fileUri: selectedNativeFile.uri,
              fileName: selectedNativeFile.name,
              fileMimeType: selectedNativeFile.mimeType,
              password,
            });
          }
        }
        loginAs(session.role);
      } else {
        const registered = await register({ fullName: fullName.trim(), email: email.trim(), password, role });
        loginAs(registered.session.role);
        setIssuedFile(registered.digitalIdFile || null);

        if (registered.digitalIdFile) {
          const downloaded = await downloadDigitalIdFile(registered.digitalIdFile);
          if (!downloaded) {
            setHintText(`Файл ${registered.digitalIdFile.filename} выпущен. Нажмите ниже, чтобы сохранить.`);
          }
        }
      }

      await syncMe();

      const sessionRole = useAppStore.getState().user?.role ?? role;
      if (sessionRole === "CITIZEN") router.replace("/(citizen)");
      if (sessionRole === "WORKER") router.replace("/(worker)");
      if (sessionRole === "ADMIN") router.replace("/(admin)");
    } catch (e: any) {
      const msg = e?.response?.data?.error;
      if (e?.message === "FILE_REQUIRED") {
        setErrorText("Выберите файл Digital ID.");
      } else if (typeof msg === "string" && msg.trim().length > 0) {
        setErrorText(msg);
      } else {
        setErrorText("Не удалось выполнить запрос. Попробуйте снова.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.h1}>Digital ID (eGov) · Auth</Text>
      <Text style={styles.p}>Вход через Email + пароль или через Digital ID файл + тот же пароль.</Text>

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
        <>
          <Field label="Способ входа">
            <View style={styles.modeRow}>
              <ModeChip title="Email" active={loginMethod === "email"} onPress={() => setLoginMethod("email")} />
              <ModeChip title="Digital ID файл" active={loginMethod === "digital-file"} onPress={() => setLoginMethod("digital-file")} />
            </View>
          </Field>

          {loginMethod === "email" ? (
            <Field label="Email">
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="user@mail.com"
                style={styles.input}
              />
            </Field>
          ) : (
            <Field label="Файл Digital ID">
              <Pressable
                style={styles.pickFileBtn}
                onPress={async () => {
                  setErrorText("");
                  if (Platform.OS === "web") {
                    if (typeof document === "undefined") return;
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".eqid,.json,application/json";
                    input.onchange = () => {
                      const f = input.files?.[0] || null;
                      setSelectedFile(f);
                      setSelectedNativeFile(null);
                    };
                    input.click();
                    return;
                  }

                  const result = await DocumentPicker.getDocumentAsync({
                    type: ["application/json", "text/plain", "*/*"],
                    copyToCacheDirectory: true,
                    multiple: false,
                  });

                  if (result.canceled) return;
                  const asset = result.assets?.[0];
                  if (!asset?.uri) return;
                  setSelectedNativeFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
                  setSelectedFile(null);
                }}
              >
                <Text style={styles.pickFileBtnText}>
                  {selectedFile
                    ? `Выбран: ${selectedFile.name}`
                    : selectedNativeFile
                      ? `Выбран: ${selectedNativeFile.name || "digital-id.eqid"}`
                      : "Выбрать файл"}
                </Text>
              </Pressable>
            </Field>
          )}
        </>
      ) : (
        <>
          <Field label="ФИО">
            <TextInput value={fullName} onChangeText={setFullName} autoCorrect={false} placeholder="Иванов Иван Иванович" style={styles.input} />
          </Field>
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
        </>
      )}

      <Field label="Пароль">
        <TextInput
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setErrorText("");
          }}
          secureTextEntry
          placeholder={mode === "register" ? "Минимум 6 символов, буквы и цифры" : "Введите пароль"}
          style={styles.input}
        />
      </Field>

      {mode === "register" ? (
        <Field label="Повторите пароль">
          <TextInput
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setErrorText("");
            }}
            secureTextEntry
            placeholder="Повторите пароль"
            style={styles.input}
          />
        </Field>
      ) : null}

      {mode === "register" && !isStrongPassword && password.length > 0 ? (
        <Text style={styles.validationText}>Пароль должен быть не менее 6 символов и содержать буквы и цифры.</Text>
      ) : null}
      {mode === "register" && fullName.trim().length > 0 && fullName.trim().length < 3 ? (
        <Text style={styles.validationText}>Введите корректное ФИО (минимум 3 символа).</Text>
      ) : null}
      {mode === "register" && confirmPassword.length > 0 && password !== confirmPassword ? (
        <Text style={styles.validationText}>Пароли не совпадают.</Text>
      ) : null}

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Статус:</Text>
        <Text style={styles.summaryValue}>{mode === "register" ? `Регистрация: ${roleTitle}` : "Вход"}</Text>
        {issuedFile ? (
          <Pressable
            onPress={async () => {
              const ok = await downloadDigitalIdFile(issuedFile);
              if (!ok) Alert.alert("Готово", `Файл создан: ${issuedFile.filename}`);
            }}
          >
            <Text style={styles.key}>Digital ID файл выпущен: {issuedFile.filename}</Text>
            <Text style={styles.keyHint}>Нажмите, чтобы скачать файл</Text>
          </Pressable>
        ) : null}
      </View>

      <Button onPress={proceed} disabled={!canProceed} loading={busy}>
        {mode === "login" ? "Войти" : "Зарегистрироваться"}
      </Button>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {hintText ? <Text style={styles.hintText}>{hintText}</Text> : null}
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
  h1: { fontSize: 28, fontWeight: "900", color: ui.colors.text },
  p: { fontSize: 14, color: ui.colors.textMuted, lineHeight: 20 },

  modeRow: { flexDirection: "row", gap: 10 },
  modeChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: ui.colors.surfaceMuted,
  },
  modeChipActive: { borderColor: ui.colors.primary, backgroundColor: ui.colors.primarySoft },
  modeText: { fontSize: 13, fontWeight: "900", color: ui.colors.textMuted },
  modeTextActive: { color: ui.colors.primary },

  roleRow: { flexDirection: "row", gap: 10 },
  roleChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
    backgroundColor: ui.colors.surfaceMuted,
  },
  roleChipActive: { borderColor: ui.colors.primary, backgroundColor: ui.colors.primarySoft },
  roleTitle: { fontSize: 14, fontWeight: "900", color: ui.colors.textMuted },
  roleTitleActive: { color: ui.colors.primary },
  roleSub: { fontSize: 12, fontWeight: "700", color: ui.colors.textMuted },
  roleSubActive: { color: ui.colors.primary },

  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },

  summary: { padding: 12, borderRadius: 14, backgroundColor: ui.colors.surfaceMuted, borderWidth: 1, borderColor: ui.colors.border },
  summaryTitle: { fontSize: 12, color: ui.colors.textMuted, fontWeight: "800" },
  summaryValue: { marginTop: 4, fontSize: 16, fontWeight: "900", color: ui.colors.text },
  key: { marginTop: 8, fontSize: 12, fontWeight: "900", color: ui.colors.text },
  keyHint: { marginTop: 2, fontSize: 11, fontWeight: "700", color: ui.colors.textMuted },
  pickFileBtn: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: ui.colors.surfaceMuted,
  },
  pickFileBtnText: { fontSize: 14, fontWeight: "800", color: ui.colors.primary },
  validationText: { marginTop: -6, fontSize: 12, fontWeight: "700", color: ui.colors.warning },
  errorText: { marginTop: 8, fontSize: 13, fontWeight: "800", color: ui.colors.danger },
  hintText: { marginTop: 8, fontSize: 13, fontWeight: "700", color: ui.colors.primary },
});
