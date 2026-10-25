"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/client";

export type Me = {
  id: string;
  name: string;
  email: string;
  role: "HOST" | "SIDEKICK" | "ADMIN";
  hasPaymentMethod: boolean;
  phone?: string | null;
};

type AuthState = {
  user: Me | null;
  sidekick: { id: string; payoutsEnabled: boolean; displayName: string } | null;
  paymentsEnabled: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  user: null,
  sidekick: null,
  paymentsEnabled: false,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "refresh" | "logout">>({
    user: null,
    sidekick: null,
    paymentsEnabled: false,
    loading: true,
  });
  const refresh = useCallback(async () => {
    const data = await api("/api/auth/me").catch(() => ({ user: null }));
    setState({ user: data.user, sidekick: data.sidekick ?? null, paymentsEnabled: !!data.paymentsEnabled, loading: false });
  }, []);
  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return <Ctx.Provider value={{ ...state, refresh, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/** Renders children only for signed-in users with one of the given roles. */
export function RequireRole({ roles, children }: { roles?: Me["role"][]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }, [loading, user]);
  if (loading || !user) return <div className="p-10 text-center text-gray-500">Loading…</div>;
  if (roles && !roles.includes(user.role)) {
    return <div className="card mx-auto mt-10 max-w-md text-center">This page isn&apos;t available for your account type.</div>;
  }
  return <>{children}</>;
}
