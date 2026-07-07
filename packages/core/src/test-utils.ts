import type { FetchLike, SirvClient } from '@sirv/sirv-client';

export interface MockResponse {
  status?: number;
  body?: unknown;
}

export interface MockCall {
  url: string;
  method: string;
  body: unknown;
}

/** FetchLike driven by `impl`, plus a record of calls (test-only). */
export function mockFetch(impl: (call: MockCall) => MockResponse): {
  fetch: FetchLike;
  calls: MockCall[];
} {
  const calls: MockCall[] = [];
  const fetch: FetchLike = async (url, init) => {
    const call: MockCall = {
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const { status = 200, body = {} } = impl(call);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  return { fetch, calls };
}

/** A SirvClient stub whose methods return empty results unless overridden. */
export function makeMockClient(overrides: Partial<SirvClient> = {}): SirvClient {
  return {
    baseUrl: 'https://api.sirv.com/v2',
    getToken: async () => 'mock-token',
    listFolder: async () => ({ contents: [], continuation: null }),
    searchFiles: async () => ({ hits: [], total: 0, _relation: 'eq' }),
    searchScroll: async () => ({ hits: [], total: 0, _relation: 'eq' }),
    getFileInfo: async () => ({ size: 0, isDirectory: false }),
    getAccountInfo: async () => ({ alias: 'demo' }),
    getUsage: async () => ({ plan: 0, used: 0, files: 0 }),
    getBillingPlan: async () => ({ id: 'plan' }),
    ...overrides,
  };
}
