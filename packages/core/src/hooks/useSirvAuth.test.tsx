import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type MockCall, type MockResponse, mockFetch } from '../test-utils.js';
import { createMemoryTokenStorage } from '../token-storage.js';
import { useSirvAuth } from './useSirvAuth.js';

const TOKEN_OK: MockResponse = { body: { token: 'bearer', expiresIn: 1200 } };

/** Routes /token (mint) and /account (validate + alias list) for the credential flow. */
function accountRoute(account: unknown) {
  return (call: MockCall): MockResponse => {
    if (call.url.endsWith('/token')) return TOKEN_OK;
    if (call.url.endsWith('/account')) return { body: account };
    return { status: 404 };
  };
}

describe('useSirvAuth (clientId/secret flow)', () => {
  it('reconnects silently from stored credentials', async () => {
    const storage = createMemoryTokenStorage({
      clientId: 'id',
      clientSecret: 'secret',
      accountAlias: 'demo',
      deliveryAlias: 'demo.sirv.com',
    });
    const { fetch } = mockFetch(() => TOKEN_OK);
    const { result } = renderHook(() => useSirvAuth({ storage, clientOptions: { fetch } }));

    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(result.current.account?.alias).toBe('demo');
    expect(result.current.deliveryAlias).toBe('demo.sirv.com');
    expect(result.current.client).toBeDefined();
  });

  it('connects directly when the account has a single delivery domain', async () => {
    const storage = createMemoryTokenStorage();
    const { fetch } = mockFetch(accountRoute({ alias: 'demo', cdnURL: 'demo.sirv.com' }));
    const { result } = renderHook(() => useSirvAuth({ storage, clientOptions: { fetch } }));
    await waitFor(() => expect(result.current.status).toBe('logged-out'));

    await act(async () => {
      await result.current.connectWithCredentials('cid', 'csecret');
    });

    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(result.current.deliveryAlias).toBe('demo.sirv.com');
    const stored = await storage.read();
    expect(stored?.clientId).toBe('cid');
    expect(stored?.deliveryAlias).toBe('demo.sirv.com');
  });

  it('offers an alias picker for multiple domains, then connects on select', async () => {
    const storage = createMemoryTokenStorage();
    const { fetch } = mockFetch(accountRoute({ alias: 'demo', aliases: { demo: {}, demo2: {} } }));
    const { result } = renderHook(() => useSirvAuth({ storage, clientOptions: { fetch } }));
    await waitFor(() => expect(result.current.status).toBe('logged-out'));

    await act(async () => {
      await result.current.connectWithCredentials('cid', 'csecret');
    });
    await waitFor(() => expect(result.current.status).toBe('selecting-alias'));
    expect(result.current.aliasOptions.map((o) => o.host)).toEqual([
      'demo.sirv.com',
      'demo2.sirv.com',
    ]);

    await act(async () => {
      await result.current.selectAlias('demo2.sirv.com');
    });
    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(result.current.deliveryAlias).toBe('demo2.sirv.com');
    expect((await storage.read())?.deliveryAlias).toBe('demo2.sirv.com');
  });

  it('surfaces an error and stays logged out on bad credentials', async () => {
    const storage = createMemoryTokenStorage();
    const { fetch } = mockFetch((call) => {
      if (call.url.endsWith('/token')) return TOKEN_OK;
      if (call.url.endsWith('/account')) return { status: 403, body: { message: 'Forbidden' } };
      return { status: 404 };
    });
    const { result } = renderHook(() => useSirvAuth({ storage, clientOptions: { fetch } }));
    await waitFor(() => expect(result.current.status).toBe('logged-out'));

    await act(async () => {
      await result.current.connectWithCredentials('cid', 'wrong');
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.status).toBe('logged-out');
    expect(await storage.read()).toBeNull();
  });
});
