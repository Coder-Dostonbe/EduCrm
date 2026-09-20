"use client";

import { API_URL, STORAGE } from "./config";

export class ApiError extends Error {
  status: number;
  /** Field-level errors as DRF returns them, e.g. { phone: ["..."] } */
  fields?: Record<string, string[]>;

  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }

  /** First human-readable message, ready to drop into a toast. */
  get firstMessage(): string {
    if (this.fields) {
      const first = Object.values(this.fields)[0];
      if (Array.isArray(first) && first.length) return first[0];
    }
    return this.message;
  }
}

// ── Token storage ────────────────────────────────────────────────────

export const tokens = {
  get access(): string | null {
    try {
      return window.localStorage.getItem(STORAGE.access);
    } catch {
      return null;
    }
  },
  get refresh(): string | null {
    try {
      return window.localStorage.getItem(STORAGE.refresh);
    } catch {
      return null;
    }
  },
  set(access: string, refresh?: string) {
    try {
      window.localStorage.setItem(STORAGE.access, access);
      if (refresh) window.localStorage.setItem(STORAGE.refresh, refresh);
    } catch {
      // storage unavailable — the session simply won't survive a reload
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE.access);
      window.localStorage.removeItem(STORAGE.refresh);
      window.localStorage.removeItem(STORAGE.session);
    } catch {
      // ignore
    }
  },
};

// ── Refresh handling ─────────────────────────────────────────────────
// A single in-flight refresh is shared by every request that hits a 401,
// so a burst of parallel calls never triggers a burst of refreshes.

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokens.refresh;
  if (!refresh) return null;

  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) {
        tokens.clear();
        return null;
      }
      const data = (await res.json()) as { access: string; refresh?: string };
      tokens.set(data.access, data.refresh);
      return data.access;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ── Core request ─────────────────────────────────────────────────────

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Query string parameters; undefined/null/"" entries are dropped. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Skip the Authorization header (login, register, refresh). */
  anonymous?: boolean;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const url = new URL(
    path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? path : `/${path}`}`
  );
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = res.statusText || `Request failed (${res.status})`;
  let fields: Record<string, string[]> | undefined;

  try {
    const data = await res.json();
    if (typeof data?.detail === "string") {
      detail = data.detail;
    } else if (data && typeof data === "object") {
      fields = data as Record<string, string[]>;
      const first = Object.values(fields)[0];
      if (Array.isArray(first) && typeof first[0] === "string") detail = first[0];
    }
  } catch {
    // non-JSON error body — keep the status text
  }
  return new ApiError(res.status, detail, fields);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, anonymous, headers, ...rest } = options;

  const send = async (token: string | null): Promise<Response> => {
    const finalHeaders = new Headers(headers as HeadersInit);
    if (body !== undefined && !(body instanceof FormData)) {
      finalHeaders.set("Content-Type", "application/json");
    }
    finalHeaders.set("Accept", "application/json");
    if (token && !anonymous) finalHeaders.set("Authorization", `Bearer ${token}`);

    return fetch(buildUrl(path, params), {
      ...rest,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  };

  let res = await send(anonymous ? null : tokens.access);

  // One transparent retry after refreshing an expired access token.
  if (res.status === 401 && !anonymous && tokens.refresh) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await send(fresh);
  }

  if (!res.ok) throw await parseError(res);

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

/** DRF page-number pagination envelope. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
