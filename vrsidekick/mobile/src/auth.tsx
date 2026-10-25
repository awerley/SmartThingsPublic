import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, loadToken, setToken } from "./api";

export type Me = { id: string; name: string; email: string; role: "HOST" | "SIDEKICK" | "ADMIN"; hasPaymentMethod: boolean };

type AuthState = {
  user: Me | null;
  loading: boolean;
  paymentsEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState>(null as never);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api("/api/auth/me").catch(() => ({ user: null }));
    setUser(data.user);
    setPaymentsEnabled(!!data.paymentsEnabled);
  }, []);

  useEffect(() => {
    loadToken()
      .then((t) => (t ? refresh() : undefined))
      .finally(() => setLoading(false));
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const { token, user } = await api("/api/auth/login", { body: { email, password } });
    await setToken(token);
    setUser(user);
    await refresh();
  };
  const register = async (body: Record<string, unknown>) => {
    const { token, user } = await api("/api/auth/register", { body });
    await setToken(token);
    setUser(user);
  };
  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, paymentsEnabled, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
