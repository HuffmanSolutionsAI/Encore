// Typed fetch wrapper. Attaches the Cognito access token to every request
// and surfaces API errors with stable codes the UI can switch on.
//
// The wrapper is constructed once per session by SessionProvider; the
// `tokenProvider` it receives refreshes the access token transparently
// when it's about to expire.

import { remoteConfig } from "@/lib/config";
import type { ServerErrorBody } from "@/lib/types";

export type APIErrorCode =
  | "not_configured"
  | "unauthorized"
  | "not_found"
  | "conflict"
  | "validation"
  | "server"
  | "transport"
  | "decoding";

export class APIError extends Error {
  constructor(
    readonly code: APIErrorCode,
    readonly status?: number,
    /** Server-provided stable error code (e.g. `handle_taken`). */
    readonly serverCode?: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "APIError";
  }
}

export type TokenProvider = () => Promise<string | null>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | undefined>;
  body?: unknown;
}

export class APIClient {
  constructor(private readonly tokenProvider: TokenProvider) {}

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    if (!remoteConfig.apiBaseURL) {
      throw new APIError("not_configured");
    }

    const token = await this.tokenProvider();
    if (!token) throw new APIError("unauthorized");

    const url = new URL(joinPath(remoteConfig.apiBaseURL, path));
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }

    let res: Response;
    try {
      res = await fetch(url, { method: opts.method ?? "GET", headers, body });
    } catch {
      throw new APIError("transport");
    }

    const text = await res.text();
    if (res.ok) {
      if (!text) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new APIError("decoding");
      }
    }

    const errorBody = safeParseError(text);
    throw this.errorFor(res.status, errorBody);
  }

  private errorFor(status: number, body: ServerErrorBody | null): APIError {
    const serverCode = body?.error;
    const msg = body?.message;
    if (status === 401 || status === 403) return new APIError("unauthorized", status, serverCode, msg);
    if (status === 404) return new APIError("not_found", status, serverCode, msg);
    if (status === 409) return new APIError("conflict", status, serverCode, msg);
    if (status === 400 || status === 422) return new APIError("validation", status, serverCode, msg);
    return new APIError("server", status, serverCode, msg);
  }
}

function safeParseError(text: string): ServerErrorBody | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as ServerErrorBody;
  } catch {
    return null;
  }
}

function joinPath(base: string, path: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}
