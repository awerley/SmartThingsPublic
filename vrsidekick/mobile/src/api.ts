import * as SecureStore from "expo-secure-store";

/** Base URL of the VR Sidekick web app, which serves the REST API. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "vrs_token";

let token: string | null = null;

export async function loadToken() {
  token = await SecureStore.getItemAsync(TOKEN_KEY);
  return token;
}

export async function setToken(t: string | null) {
  token = t;
  if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(API_URL + path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const money = (cents: number | null | undefined) => `$${((cents ?? 0) / 100).toFixed(2)}`;
export const rateLabel = (rateType: string, cents: number) => `${money(cents)}${rateType === "HOURLY" ? "/hr" : " flat"}`;
export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
export const fmtTime = (d: string | Date) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
export const fmtDateTime = (d: string | Date) => `${fmtDate(d)} · ${fmtTime(d)}`;
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
