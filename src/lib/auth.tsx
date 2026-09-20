"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Role, User } from "@/types";
import { authService } from "@/services/auth.service";
import { demoAccounts } from "@/lib/auth-accounts";

export { demoAccounts };
export type { DemoAccount } from "@/lib/auth-accounts";

interface AuthContextValue {
  user: User | null;
  /** true while restoring the session on first mount */
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** `idToken` is the credential from the Google Sign-In button. */
  loginWithGoogle: (idToken?: string) => Promise<{ ok: boolean; detail?: string }>;
  logout: () => void;
  role: Role | null;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    // Session restore has to happen after hydration — it reads browser storage
    // (mock mode) or calls /api/auth/me/ (API mode).
    authService
      .me()
      .then((restored) => {
        if (!cancelled) setUser(restored);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if (result.ok && result.user) setUser(result.user);
    return { ok: result.ok, error: result.error };
  }, []);

  const loginWithGoogle = React.useCallback(async (idToken?: string) => {
    const result = await authService.loginWithGoogle(idToken);
    if (result.ok && result.user) setUser(result.user);
    return { ok: result.ok, detail: result.detail };
  }, []);

  const logout = React.useCallback(() => {
    authService.logout();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, loading, login, loginWithGoogle, logout, role: user?.role ?? null }),
    [user, loading, login, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
