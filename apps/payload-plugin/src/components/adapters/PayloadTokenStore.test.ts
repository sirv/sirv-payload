import { describe, expect, it, vi } from 'vitest';
import { createPayloadTokenStore } from './PayloadTokenStore.js';
import type { SirvAdminApi } from './api.js';

function fakeApi(tokenValue = 'tok', expiresIn = 1200): { api: SirvAdminApi; calls: () => number } {
  let calls = 0;
  const api = {
    token: async () => {
      calls += 1;
      return { token: `${tokenValue}-${calls}`, expiresIn };
    },
  } as unknown as SirvAdminApi;
  return { api, calls: () => calls };
}

describe('PayloadTokenStore', () => {
  it('caches the bearer until near expiry', async () => {
    let t = 0;
    const { api, calls } = fakeApi();
    const store = createPayloadTokenStore(api, () => t);

    expect(await store.getToken()).toBe('tok-1');
    expect(await store.getToken()).toBe('tok-1'); // cached
    expect(calls()).toBe(1);

    // Advance to within the 60s skew of the 1200s expiry -> re-mint.
    t = 1_141_000;
    expect(await store.getToken()).toBe('tok-2');
    expect(calls()).toBe(2);
  });

  it('force re-mints immediately', async () => {
    const { api, calls } = fakeApi();
    const store = createPayloadTokenStore(api, () => 0);
    await store.getToken();
    await store.getToken(true);
    expect(calls()).toBe(2);
  });

  it('coalesces concurrent mints into one request', async () => {
    const { api, calls } = fakeApi();
    const spy = vi.spyOn(api, 'token');
    const store = createPayloadTokenStore(api, () => 0);
    const [a, b] = await Promise.all([store.getToken(), store.getToken()]);
    expect(a).toBe(b);
    expect(calls()).toBe(1);
    spy.mockRestore();
  });
});
