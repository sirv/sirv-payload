import {
  type AliasOption,
  accountAliasOptions,
  createSirvClient,
  request,
  resolveContext,
} from '@sirv/sirv-client';

/**
 * Server-only Sirv helpers. This module talks to api.sirv.com with the client secret and must
 * NEVER be imported into a client bundle. It depends on `@sirv/sirv-client` only (no
 * `@sirv/core`, no React), so it stays inside the server half of the plugin.
 */

interface BearerResponse {
  token: string;
  expiresIn: number;
  scope?: string[];
}

/** Re-mint if the cached bearer expires within this many ms. */
const EXPIRY_SKEW_MS = 60_000;

// Server-side bearer cache keyed by clientId. The browser also caches, so this mostly avoids a
// mint per admin session; it is best-effort and process-local (fine for a stateless mint).
const bearerCache = new Map<string, { token: string; expiresAtMs: number }>();

/** Mints a fresh bearer from clientId/secret via POST /v2/token. Throws SirvApiError on failure. */
export async function mintBearer(clientId: string, clientSecret: string): Promise<BearerResponse> {
  const ctx = resolveContext();
  return request<BearerResponse>(ctx, '/token', {
    method: 'POST',
    body: { clientId, clientSecret },
  });
}

/** Returns a valid bearer for the given credentials, minting and caching on demand. */
export async function getCachedBearer(
  clientId: string,
  clientSecret: string,
  now: () => number = () => Date.now(),
): Promise<{ token: string; expiresIn: number }> {
  const current = now();
  const hit = bearerCache.get(clientId);
  if (hit && hit.expiresAtMs - current > EXPIRY_SKEW_MS) {
    return { token: hit.token, expiresIn: Math.floor((hit.expiresAtMs - current) / 1000) };
  }
  const res = await mintBearer(clientId, clientSecret);
  bearerCache.set(clientId, { token: res.token, expiresAtMs: current + res.expiresIn * 1000 });
  return { token: res.token, expiresIn: res.expiresIn };
}

/** Drops any cached bearer for a clientId (call on disconnect / credential change). */
export function clearBearerCache(clientId?: string): void {
  if (clientId) bearerCache.delete(clientId);
  else bearerCache.clear();
}

/**
 * Validates a clientId/secret pair by fetching the account, and returns the account alias plus
 * the selectable delivery domains. Throws SirvApiError (status 401/403) on bad credentials.
 */
export async function validateCredentials(
  clientId: string,
  clientSecret: string,
): Promise<{ accountAlias: string; aliases: AliasOption[] }> {
  const client = createSirvClient({ clientId, clientSecret });
  const info = await client.getAccountInfo();
  return { accountAlias: info.alias, aliases: accountAliasOptions(info) };
}
