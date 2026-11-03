import { authHeaders, clearSession } from "./auth";

/**
 * Client API helper (WP6) — one fetch path for the app screens:
 * attaches the session Bearer header, parses JSON, and gives pages a
 * uniform {status, data} result. A 401 clears the session and sends
 * the user to /login (the WP5 diagnose page's behavior, generalized).
 */

export interface ApiResult<T> {
  status: number;
  data: T;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<ApiResult<T>> {
  const { auth = true, ...rest } = init ?? {};
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
  };
  if (auth) Object.assign(headers, authHeaders());
  if (rest.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const res = await fetch(path, { ...rest, headers });
  const data = (await res.json().catch(() => ({}))) as T;
  if (res.status === 401 && auth) {
    clearSession();
    window.location.href = "/login";
  }
  return { status: res.status, data };
}

export interface ApiErrorBody {
  error?: string;
  detail?: string;
}

/** The server's plain-language error detail, or a fallback. */
export function apiDetail(data: unknown, fallback: string): string {
  const body = data as ApiErrorBody;
  return typeof body?.detail === "string" && body.detail.length > 0 ? body.detail : fallback;
}
