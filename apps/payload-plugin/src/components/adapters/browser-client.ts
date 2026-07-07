import { type FetchLike, type SirvClient, createSirvClient } from '@sirv/sirv-client';
import type { PayloadTokenStore } from './PayloadTokenStore.js';

/**
 * Builds a full `SirvClient` for the admin browser that authenticates every api.sirv.com call
 * with a bearer from the {@link PayloadTokenStore}, transparently refreshing on a 401.
 *
 * We reuse the shared `createSirvClient` (all DAM methods + Zod parsing) by handing it a custom
 * `fetch` that overwrites the Authorization header with a live token. The `accessToken` passed
 * to `createSirvClient` is only a placeholder - the real bearer is injected per request here, so
 * we own the refresh-on-401 retry (the static token manager cannot refresh on its own).
 */
export function createBrowserSirvClient(store: PayloadTokenStore, baseUrl?: string): SirvClient {
  const fetchWithBearer: FetchLike = async (input, init) => {
    const token = await store.getToken();
    // Cast to the DOM RequestInit: FetchLike's body type (string | Uint8Array, for uploads) is a
    // superset that TS does not auto-narrow to BodyInit.
    const withAuth = (bearer: string): RequestInit => ({
      ...init,
      body: init?.body as BodyInit | undefined,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${bearer}` },
    });

    let res = await fetch(input, withAuth(token));
    if (res.status === 401) {
      const fresh = await store.getToken(true);
      res = await fetch(input, withAuth(fresh));
    }
    return res;
  };

  return createSirvClient({
    accessToken: 'via-payload-token-store',
    fetch: fetchWithBearer,
    baseUrl,
  });
}
