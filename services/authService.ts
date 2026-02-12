import { apiClient } from "@/api/client";
import { clearSession, loadSession, saveSession, type StoredSession } from "@/api/tokenStorage";
import type { UserRole } from "@/types/domain";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

type BackendRole = "citizen" | "worker" | "admin";

type AuthResponse = {
  token: string;
  user: { id: string; email: string; role: BackendRole; points: number; digitalIdKey?: string; ratingAvg?: number; ratingCount?: number };
  digitalIdFile?: {
    filename: string;
    mimeType: string;
    base64: string;
  };
};

export type MeResponse = {
  user: {
    id: string;
    email: string;
    role: BackendRole;
    points: number;
    digitalIdKey?: string;
    ratingAvg?: number;
    ratingCount?: number;
    createdAt?: string;
  };
};

export type RegisterResult = {
  session: StoredSession;
  digitalIdFile?: {
    filename: string;
    mimeType: string;
    base64: string;
  };
};

function roleToBackend(role: UserRole): BackendRole {
  if (role === "CITIZEN") return "citizen";
  if (role === "WORKER") return "worker";
  return "admin";
}

function roleFromBackend(role: BackendRole): UserRole {
  if (role === "citizen") return "CITIZEN";
  if (role === "worker") return "WORKER";
  return "ADMIN";
}

export async function getStoredSession(): Promise<StoredSession | null> {
  return loadSession();
}

export async function logout(): Promise<void> {
  await clearSession();
}

export async function register(input: { email: string; password: string; role: UserRole; workerId?: string }): Promise<RegisterResult> {
  const res = await apiClient.post<AuthResponse>("/auth/register", {
    email: input.email,
    password: input.password,
    role: roleToBackend(input.role),
  });

  const session: StoredSession = {
    token: res.data.token,
    role: roleFromBackend(res.data.user.role),
    workerId: input.workerId,
  };
  await saveSession(session);
  return {
    session,
    digitalIdFile: res.data.digitalIdFile,
  };
}

export async function login(input: { email: string; password: string; workerId?: string }): Promise<StoredSession> {
  const res = await apiClient.post<AuthResponse>("/auth/login", {
    // backend supports either {identifier,password} or legacy {email,password}
    identifier: input.email,
    password: input.password,
  });

  const session: StoredSession = {
    token: res.data.token,
    role: roleFromBackend(res.data.user.role),
    workerId: input.workerId,
  };
  await saveSession(session);
  return session;
}

export async function loginWithDigitalIdFile(input: {
  file?: File | Blob;
  fileUri?: string;
  fileName?: string;
  fileMimeType?: string;
  password: string;
  workerId?: string;
}): Promise<StoredSession> {
  const form = new FormData();
  if (input.file) {
    form.append("digitalIdFile", input.file, input.fileName || "digital-id.eqid");
  } else if (input.fileUri) {
    form.append(
      "digitalIdFile",
      {
        uri: input.fileUri,
        name: input.fileName || "digital-id.eqid",
        type: input.fileMimeType || "application/json",
      } as any
    );
  } else {
    throw new Error("DIGITAL_ID_FILE_REQUIRED");
  }
  form.append("password", input.password);
  form.append("digitalFilePassword", input.password);

  const res = await apiClient.post<AuthResponse>("/auth/login", form);

  const session: StoredSession = {
    token: res.data.token,
    role: roleFromBackend(res.data.user.role),
    workerId: input.workerId,
  };
  await saveSession(session);
  return session;
}

export async function downloadDigitalIdFile(file: { filename: string; mimeType: string; base64: string }) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return false;
    const bytes = atob(file.base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: file.mimeType || "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename || "digital-id.eqid";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) return false;
  const safeName = (file.filename || "digital-id.eqid").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const targetPath = `${baseDir}${safeName}`;

  await FileSystem.writeAsStringAsync(targetPath, file.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(targetPath, {
      mimeType: file.mimeType || "application/json",
      dialogTitle: "Сохранить Digital ID файл",
      UTI: "public.json",
    });
  }

  return true;
}

export async function getMe(): Promise<{ id: string; email: string; role: UserRole; points: number; digitalIdKey?: string; ratingAvg?: number; ratingCount?: number }> {
  const res = await apiClient.get<MeResponse>("/auth/me");
  return {
    id: res.data.user.id,
    email: res.data.user.email,
    role: roleFromBackend(res.data.user.role),
    points: res.data.user.points,
    digitalIdKey: res.data.user.digitalIdKey,
    ratingAvg: res.data.user.ratingAvg,
    ratingCount: res.data.user.ratingCount,
  };
}

// Keeps existing UI intact: role selection stays, but uses backend accounts under the hood.
export async function demoLogin(role: UserRole, opts?: { workerId?: string }): Promise<StoredSession> {
  const base = role === "CITIZEN" ? "demo.citizen" : role === "WORKER" ? "demo.worker" : "demo.admin";
  const password = "demo12345";

  // NOTE: If a previous run already registered the same email with a different password,
  // backend will return 401. In that case we generate a fresh unique demo email.
  const primaryEmail = `${base}@local.test`;

  // Strategy:
  // 1) Try LOGIN first (no 409 spam on repeated sign-ins).
  // 2) If login fails, try REGISTER.
  // 3) If register conflicts (409) and login still fails (password mismatch), create a unique demo user.
  try {
    return await login({ email: primaryEmail, password, workerId: opts?.workerId });
  } catch {
    // proceed
  }

  try {
    await register({ email: primaryEmail, password, role, workerId: opts?.workerId });
  } catch (e: any) {
    // user exists
    if (e?.response?.status !== 409) throw e;
  }

  try {
    return await login({ email: primaryEmail, password, workerId: opts?.workerId });
  } catch (e: any) {
    // likely password mismatch on an existing account from previous runs
    if (e?.response?.status !== 401) throw e;
  }

  const uniqueEmail = `${base}.${Date.now()}@local.test`;
  await register({ email: uniqueEmail, password, role, workerId: opts?.workerId });
  return login({ email: uniqueEmail, password, workerId: opts?.workerId });
}
