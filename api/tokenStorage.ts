import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "urban_services_session_v1";

export type StoredSession = {
  token: string;
  role: "CITIZEN" | "WORKER" | "ADMIN";
  workerId?: string;
};

let cached: StoredSession | null | undefined;

function canUseLocalStorage(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

async function rawGet(): Promise<string | null> {
  if (canUseLocalStorage()) {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

async function rawSet(value: string): Promise<void> {
  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(KEY, value);
    } catch {
      // ignore
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(KEY, value);
  } catch {
    // ignore
  }
}

async function rawDel(): Promise<void> {
  if (canUseLocalStorage()) {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}

export async function loadSession(): Promise<StoredSession | null> {
  if (cached !== undefined) return cached;
  const raw = await rawGet();
  if (!raw) {
    cached = null;
    return null;
  }
  try {
    cached = JSON.parse(raw) as StoredSession;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  cached = session;
  await rawSet(JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  cached = null;
  await rawDel();
}

export function getCachedToken(): string | null {
  return cached?.token ?? null;
}
