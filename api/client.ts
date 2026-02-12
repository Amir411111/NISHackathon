import axios from "axios";

import { getCachedToken, loadSession } from "@/api/tokenStorage";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  // eslint-disable-next-line no-console
  console.warn("Missing EXPO_PUBLIC_API_URL. API calls will fail until it is set.");
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

let didLoad = false;

apiClient.interceptors.request.use(async (config) => {
  if (!baseURL) {
    // Prevent accidental calls to Expo dev server origin (e.g. http://localhost:8082).
    // Screens already have try/catch fallbacks to mock-only mode.
    return Promise.reject(new Error("API_NOT_CONFIGURED"));
  }

  if (!didLoad) {
    didLoad = true;
    await loadSession();
  }

  const token = getCachedToken();
  const url = String(config.url ?? "");
  const isAuthRoute = url.startsWith("/auth/") || url === "/auth";

  if (token) {
    const headers: any = config.headers ?? {};
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  } else if (!isAuthRoute) {
    // If user is in mock-only mode or token not yet available, avoid hitting protected endpoints.
    return Promise.reject(new Error("NO_TOKEN"));
  }

  return config;
});
