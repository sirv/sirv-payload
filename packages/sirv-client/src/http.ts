import { SirvApiError } from './errors.js';
import { SIRV_API_BASE } from './types.js';

/** Minimal fetch signature so callers can inject a fetch impl (tests, non-global envs). */
export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Uint8Array;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export interface HttpContext {
  baseUrl: string;
  fetchImpl: FetchLike;
}

export interface RequestInit {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Bearer token. */
  token?: string;
  /** JSON body; serialized automatically. */
  body?: unknown;
  /** Raw binary body (e.g. a file upload); sent as-is, bypassing JSON serialization. */
  rawBody?: Uint8Array;
  /** Content-Type for a `rawBody` request (defaults to application/octet-stream). */
  contentType?: string;
  /** Query params; undefined/null values are dropped. */
  query?: Record<string, string | number | undefined | null>;
}

/** A request bound to a token source (handles auth + refresh-on-401 in the client). */
export type AuthedRequest = <T>(path: string, init?: Omit<RequestInit, 'token'>) => Promise<T>;

function buildUrl(baseUrl: string, path: string, query?: RequestInit['query']): string {
  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Performs a Sirv REST request and returns parsed JSON, throwing SirvApiError on non-2xx. */
export async function request<T>(
  ctx: HttpContext,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.token) headers.Authorization = `Bearer ${init.token}`;

  let body: string | Uint8Array | undefined;
  if (init.rawBody !== undefined) {
    body = init.rawBody;
    headers['Content-Type'] = init.contentType ?? 'application/octet-stream';
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers['Content-Type'] = 'application/json';
  }

  const res = await ctx.fetchImpl(buildUrl(ctx.baseUrl, path, init.query), {
    method: init.method ?? 'GET',
    headers,
    body,
  });

  if (!res.ok) {
    let errBody: unknown;
    let message = `Sirv API ${res.status}`;
    try {
      errBody = await res.json();
      if (errBody && typeof errBody === 'object' && 'message' in errBody) {
        message = `Sirv API ${res.status}: ${String((errBody as { message: unknown }).message)}`;
      }
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new SirvApiError(message, res.status, errBody);
  }

  // Some endpoints (mkdir, upload) return 200 with an empty or non-JSON body. Read as text and
  // only parse when there's content, so those calls resolve to undefined rather than throw.
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}

export function resolveContext(opts?: {
  baseUrl?: string;
  fetch?: FetchLike;
}): HttpContext {
  // The global fetch must stay bound to its realm (window/globalThis). Calling it as a
  // method on another object (ctx.fetchImpl) detaches `this` and browsers throw
  // "Illegal invocation", so bind it here.
  const globalFetch =
    typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
      ? (globalThis.fetch.bind(globalThis) as unknown as FetchLike)
      : undefined;
  const fetchImpl = opts?.fetch ?? globalFetch;
  if (!fetchImpl) {
    throw new Error('No fetch implementation available; pass { fetch } to the client.');
  }
  return { baseUrl: opts?.baseUrl ?? SIRV_API_BASE, fetchImpl };
}
