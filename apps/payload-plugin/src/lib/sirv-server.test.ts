import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearBearerCache, getCachedBearer } from './sirv-server.js';

function stubTokenFetch(token: string, expiresIn: number) {
  const fn = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ token, expiresIn, scope: [] }),
    text: async () => JSON.stringify({ token, expiresIn, scope: [] }),
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearBearerCache();
});

describe('getCachedBearer', () => {
  it('mints once and serves from cache until the skew window', async () => {
    const fetchFn = stubTokenFetch('bearer-abc', 1200);
    let t = 0;
    const first = await getCachedBearer('client-a', 'secret', () => t);
    expect(first.token).toBe('bearer-abc');
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const second = await getCachedBearer('client-a', 'secret', () => t);
    expect(second.token).toBe('bearer-abc');
    expect(fetchFn).toHaveBeenCalledTimes(1); // cached

    // POST body carries clientId/clientSecret to /v2/token.
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, { body: string; method: string }];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ clientId: 'client-a', clientSecret: 'secret' });

    // Inside the 60s skew of expiry -> re-mint.
    t = 1_141_000;
    await getCachedBearer('client-a', 'secret', () => t);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('clearBearerCache forces a fresh mint', async () => {
    const fetchFn = stubTokenFetch('bearer-xyz', 1200);
    await getCachedBearer('client-b', 'secret', () => 0);
    clearBearerCache('client-b');
    await getCachedBearer('client-b', 'secret', () => 0);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
