import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const methodSwitchAnim = useRef(new Animated.Value(1)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);

  useEffect(() => {
    if (modeParam === "register") setMode("register");
    if (modeParam === "login") setMode("login");
  }, [modeParam]);

  useEffect(() => {
    if (mode !== "login") return;
    Animated.timing(methodSwitchAnim, {
      toValue: loginMethod === "email" ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [loginMethod, mode, methodSwitchAnim]);

  const segmentInnerWidth = Math.max(0, segmentWidth - 4);
  const segmentThumbWidth = segmentInnerWidth / 2;
  const segmentThumbShift = segmentThumbWidth;
  const hasSelectedDigitalFile = !!selectedFile || !!selectedNativeFile;

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
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace("/welcome")} hitSlop={8}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
        <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")} hitSlop={8}>
          <Text style={styles.switchText}>{mode === "login" ? "Sign up" : "Login"}</Text>
        </Pressable>
      </View>

      <Text style={styles.h1}>{mode === "login" ? "Log In" : "Sign Up"}</Text>

      <View style={styles.formCard}>
        {mode === "login" ? (
          <View
            style={styles.segmentWrap}
            onLayout={(event) => {
              setSegmentWidth(event.nativeEvent.layout.width);
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.segmentThumb,
                {
                  width: segmentThumbWidth,
                  transform: [
                    {
                      translateX: methodSwitchAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, segmentThumbShift],
                      }),
                    },
                  ],
                },
              ]}
            />
            <ModeChip title="Digital ID" active={loginMethod === "digital-file"} onPress={() => setLoginMethod("digital-file")} />
            <ModeChip title="Email" active={loginMethod === "email"} onPress={() => setLoginMethod("email")} />
          </View>
        ) : null}

        {mode === "login" ? (
          <View style={styles.methodWrap}>
            {loginMethod === "email" ? (
              <Field label="Email">
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Email"
                  style={styles.input}
                />
              </Field>
            ) : (
              <Field label="Файл Digital ID">
                <Pressable
                  style={[styles.pickFileBtn, !hasSelectedDigitalFile && styles.pickFileBtnPlaceholderBorder]}
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
                  <Text style={[styles.pickFileBtnText, !hasSelectedDigitalFile && styles.pickFileBtnPlaceholderText]}>
                    {selectedFile
                      ? selectedFile.name
                      : selectedNativeFile
                        ? selectedNativeFile.name || "digital-id.eqid"
                        : "upload file"}
                  </Text>
                </Pressable>
              </Field>
            )}
          </View>
        ) : (
          <>
            <Field label="ФИО">
              <TextInput value={fullName} onChangeText={setFullName} autoCorrect={false} placeholder="Name" style={styles.input} />
            </Field>
            <Field label="Email">
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Email"
                style={styles.input}
              />
            </Field>
            {loginMethod === "digital-file" ? <Text style={styles.hintText}>Digital ID файл будет выдан после регистрации.</Text> : null}
          </>
        )}

        <Field label="Password">
          <View style={styles.inputRow}>
            <TextInput
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setErrorText("");
              }}
              secureTextEntry={!passwordVisible}
              placeholder="Password"
              style={[styles.input, styles.inputGrow]}
            />
            <Pressable onPress={() => setPasswordVisible((v) => !v)} style={styles.showBtn}>
              <Text style={styles.showBtnText}>Show</Text>
            </Pressable>
          </View>
        </Field>

        {mode === "register" ? (
          <Field label="Confirm password">
            <View style={styles.inputRow}>
              <TextInput
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setErrorText("");
                }}
                secureTextEntry={!confirmVisible}
                placeholder="Confirm password"
                style={[styles.input, styles.inputGrow]}
              />
              <Pressable onPress={() => setConfirmVisible((v) => !v)} style={styles.showBtn}>
                <Text style={styles.showBtnText}>Show</Text>
              </Pressable>
            </View>
          </Field>
        ) : null}

        {mode === "register" ? (
          <Field label="Роль">
            <View style={styles.roleRow}>
              <RoleChip title="Житель" active={role === "CITIZEN"} onPress={() => setRole("CITIZEN")} />
              <RoleChip title="Диспетчер" active={role === "ADMIN"} onPress={() => setRole("ADMIN")} />
              <RoleChip title="Специалист" active={role === "WORKER"} onPress={() => setRole("WORKER")} />
            </View>
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

        {issuedFile ? (
          <View style={styles.summary}>
            <Pressable
              onPress={async () => {
                const ok = await downloadDigitalIdFile(issuedFile);
                if (!ok) Alert.alert("Готово", `Файл создан: ${issuedFile.filename}`);
              }}
            >
              <Text style={styles.key}>Digital ID файл: {issuedFile.filename}</Text>
              <Text style={styles.keyHint}>Нажмите, чтобы скачать</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.submitWrap}>
        <Button onPress={proceed} disabled={!canProceed} loading={busy}>
          {mode === "login" ? "Log In" : "Sign Up"}
        </Button>
      </View>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {hintText ? <Text style={styles.hintText}>{hintText}</Text> : null}
    </Screen>
  );
}

function ModeChip(props: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={styles.modeChip}>
      <Text style={[styles.modeText, props.active && styles.modeTextActive]}>{props.title}</Text>
    </Pressable>
  );
}

function RoleChip(props: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.roleChip, props.active && styles.roleChipActive]}>
      <Text style={[styles.roleChipText, props.active && styles.roleChipTextActive]}>{props.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  closeText: { fontSize: 22, color: "#b8b8b8", lineHeight: 22 },
  switchText: { fontSize: 14, color: ui.colors.primary, fontWeight: "700" },

  h1: { marginTop: 2, fontSize: 22, fontWeight: "900", color: ui.colors.text, textAlign: "center" },
  p: { fontSize: 14, color: ui.colors.textMuted, lineHeight: 20, textAlign: "center" },

  formCard: {
    gap: 12,
  },
  submitWrap: {
    marginTop: 6,
  },

  segmentWrap: {
    flexDirection: "row",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 999,
    padding: 2,
    backgroundColor: ui.colors.surfaceMuted,
  },
  segmentThumb: {
    position: "absolute",
    left: 2,
    top: 2,
    bottom: 2,
    borderRadius: 999,
    backgroundColor: ui.colors.surface,
  },
  modeChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  modeText: { fontSize: 14, fontWeight: "700", color: "#c0c0c0" },
  modeTextActive: { color: ui.colors.primary },

  methodWrap: { gap: 12 },

  roleRow: { flexDirection: "row", gap: 8 },
  roleChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    paddingVertical: 10,
    alignItems: "center",
  },
  roleChipActive: {
    borderColor: ui.colors.primary,
    backgroundColor: ui.colors.primarySoft,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: ui.colors.textMuted,
  },
  roleChipTextActive: {
    color: ui.colors.primary,
    fontWeight: "800",
  },

  input: {
    backgroundColor: ui.colors.surface,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: ui.colors.text,
  },
  inputGrow: { flex: 1 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  showBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  showBtnText: { color: ui.colors.primary, fontSize: 13, fontWeight: "700" },

  summary: { padding: 12, borderRadius: 14, backgroundColor: ui.colors.surfaceMuted, borderWidth: 1, borderColor: ui.colors.border },
  key: { marginTop: 8, fontSize: 12, fontWeight: "900", color: ui.colors.text },
  keyHint: { marginTop: 2, fontSize: 11, fontWeight: "700", color: ui.colors.textMuted },
  pickFileBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: ui.colors.surface,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  pickFileBtnPlaceholderBorder: { borderColor: ui.colors.primary },
  pickFileBtnText: { fontSize: 16, fontWeight: "700", color: ui.colors.text },
  pickFileBtnPlaceholderText: { color: ui.colors.primary, fontWeight: "800" },
  validationText: { marginTop: -6, fontSize: 12, fontWeight: "700", color: ui.colors.warning },
  errorText: { marginTop: 8, fontSize: 13, fontWeight: "800", color: ui.colors.danger },
  hintText: { marginTop: 8, fontSize: 13, fontWeight: "700", color: ui.colors.primary },
});
