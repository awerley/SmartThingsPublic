"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export function useApi<T = any>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    api<T>(path)
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  return { data, error, loading, reload: () => setTick((t) => t + 1), setData };
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error?: string | null }) {
  if (!error) return null;
  return <div className="rounded-xl border border-flame-500/30 bg-red-50 px-3 py-2 text-sm text-flame-600">{error}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">{children}</div>;
}

export function Loading() {
  return <div className="p-8 text-center text-sm text-gray-500">Loading…</div>;
}

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-green-100 text-green-800",
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-navy-100 text-navy-700",
  PAID: "bg-navy-100 text-navy-700",
  DECLINED: "bg-gray-200 text-gray-700",
  CANCELLED: "bg-gray-200 text-gray-700",
  FAILED: "bg-red-100 text-red-700",
  OPEN: "bg-green-100 text-green-800",
  FILLED: "bg-navy-100 text-navy-700",
  CLOSED: "bg-gray-200 text-gray-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="text-sm text-gold-500">
      {"★".repeat(Math.round(value))}
      <span className="text-gray-300">{"★".repeat(5 - Math.round(value))}</span>
      {count !== undefined && <span className="ml-1 text-xs text-gray-500">({count})</span>}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-navy-700 font-bold text-gold-400"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials}
    </div>
  );
}
