"use client";

/** Browser-side API helper. Auth rides on the httpOnly cookie set at login. */
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const money = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const fmtDateTime = (d: string | Date) => `${fmtDate(d)} · ${fmtTime(d)}`;

export const rateLabel = (rateType: string, cents: number) =>
  `${money(cents)}${rateType === "HOURLY" ? "/hr" : " flat"}`;

/** yyyy-mm-dd and HH:mm in the browser's local timezone, for date/time inputs. */
export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const toTimeInput = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
