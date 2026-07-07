import { SirvApiError } from './errors.js';
import { SIRV_API_BASE } from './types.js';

/** Minimal fetch signature so callers can inject a fetch impl (tests, non-global envs). */
export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
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
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await ctx.fetchImpl(buildUrl(ctx.baseUrl, path, init.query), {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    let body: unknown;
    let message = `Sirv API ${res.status}`;
    try {
      body = await res.json();
      if (body && typeof body === 'object' && 'message' in body) {
        message = `Sirv API ${res.status}: ${String((body as { message: unknown }).message)}`;
      }
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new SirvApiError(message, res.status, body);
  }

  return (await res.json()) as T;
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
