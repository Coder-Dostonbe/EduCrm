"use client";

import type { User } from "@/types";
import { USE_REAL_API, STORAGE } from "./config";
import { api, tokens, ApiError } from "./http";
import { demoAccounts } from "@/lib/auth-accounts";

export interface LoginResult {
  ok: boolean;
  user?: User;
  error?: "invalid" | "network";
  /** The server's own explanation, for the console — not for the UI, which
   *  shows a translated message instead. */
  detail?: string;
}

interface TokenResponse {
  access: string;
  refresh: string;
  user: ApiUser;
}

/** Shape the Django API returns for a user. */
interface ApiUser {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: User["role"];
  phone: string;
  avatar: string | null;
  language: string;
  branchId: number | null;
}

function toUser(u: ApiUser): User {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar ?? undefined,
    branchId: u.branchId ? `br-${u.branchId}` : "br-1",
  };
}

function persistSession(user: User) {
  try {
    window.localStorage.setItem(STORAGE.session, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    if (!USE_REAL_API) {
      await new Promise((r) => setTimeout(r, 700));
      const account = demoAccounts.find(
        (a) =>
          a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
      );
      if (!account) return { ok: false, error: "invalid" };
      persistSession(account.user);
      return { ok: true, user: account.user };
    }

    try {
      const data = await api.post<TokenResponse>(
        "/api/auth/login/",
        { email: email.trim(), password },
        { anonymous: true }
      );
      tokens.set(data.access, data.refresh);
      const user = toUser(data.user);
      persistSession(user);
      return { ok: true, user };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return { ok: false, error: "invalid" };
      }
      return { ok: false, error: "network" };
    }
  },

  /** Exchanges a Google ID token for EduFlow tokens.
   *
   *  `idToken` comes from the Google Sign-In button; in mock mode there is no
   *  Google round-trip at all and the demo admin is signed in instead.
   */
  async loginWithGoogle(idToken?: string): Promise<LoginResult> {
    if (!USE_REAL_API) {
      await new Promise((r) => setTimeout(r, 900));
      const account = demoAccounts[0];
      persistSession(account.user);
      return { ok: true, user: account.user };
    }

    // Without a credential there is nothing to verify; posting undefined would
    // only earn a confusing 400 from the API.
    if (!idToken) {
      return {
        ok: false,
        error: "invalid",
        detail: "Google did not return a credential.",
      };
    }

    try {
      const data = await api.post<TokenResponse>(
        "/api/auth/google/",
        { id_token: idToken },
        { anonymous: true }
      );
      tokens.set(data.access, data.refresh);
      const user = toUser(data.user);
      persistSession(user);
      return { ok: true, user };
    } catch (error) {
      if (error instanceof ApiError) {
        // The API explains refusals precisely ("issued for a different
        // application", "not configured on the server"); keep that for the
        // console so misconfiguration is diagnosable.
        return {
          ok: false,
          error: error.status === 401 || error.status === 400 ? "invalid" : "network",
          detail: error.firstMessage,
        };
      }
      return { ok: false, error: "network" };
    }
  },

  async register(input: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    passwordConfirm: string;
  }): Promise<LoginResult> {
    if (!USE_REAL_API) {
      await new Promise((r) => setTimeout(r, 900));
      return { ok: true };
    }
    try {
      const data = await api.post<TokenResponse>(
        "/api/auth/register/",
        {
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
          password: input.password,
          password_confirm: input.passwordConfirm,
        },
        { anonymous: true }
      );
      tokens.set(data.access, data.refresh);
      const user = toUser(data.user);
      persistSession(user);
      return { ok: true, user };
    } catch {
      return { ok: false, error: "invalid" };
    }
  },

  /** Restore the session on boot. */
  async me(): Promise<User | null> {
    if (!USE_REAL_API) {
      try {
        const raw = window.localStorage.getItem(STORAGE.session);
        return raw ? (JSON.parse(raw) as User) : null;
      } catch {
        return null;
      }
    }
    if (!tokens.access) return null;
    try {
      const user = toUser(await api.get<ApiUser>("/api/auth/me/"));
      persistSession(user);
      return user;
    } catch {
      tokens.clear();
      return null;
    }
  },

  logout() {
    tokens.clear();
    try {
      window.localStorage.removeItem(STORAGE.session);
    } catch {
      // ignore
    }
  },
};
