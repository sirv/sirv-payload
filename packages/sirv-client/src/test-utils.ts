import type { FetchLike } from './http.js';

export interface MockResponse {
  status?: number;
  body?: unknown;
}

export interface MockCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Builds a FetchLike whose behaviour is driven by `impl`, plus a record of calls made.
 * Test-only helper (not exported from the package index).
 */
export function mockFetch(impl: (call: MockCall, callIndex: number) => MockResponse): {
  fetch: FetchLike;
  calls: MockCall[];
} {
  const calls: MockCall[] = [];
  const fetch: FetchLike = async (url, init) => {
    const call: MockCall = {
      url,
      method: init?.method ?? 'GET',
      headers: init?.headers ?? {},
      body: init?.body ? JSON.parse(init.body) : undefined,
    };
    const index = calls.length;
    calls.push(call);
    const { status = 200, body = {} } = impl(call, index);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  return { fetch, calls };
}

/** Standard POST /v2/token success body. */
export const TOKEN_OK: MockResponse = {
  body: { token: 'minted-bearer', expiresIn: 1200, scope: ['files:read'] },
};
