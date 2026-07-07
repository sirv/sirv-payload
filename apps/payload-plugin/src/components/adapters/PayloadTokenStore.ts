import type { SirvAdminApi } from './api.js';

/**
 * Browser-side bearer provider backed by the plugin's `POST /api/sirv/token` endpoint. The
 * secret stays server-side; this store only ever holds the short-lived (20 min) bearer. It
 * caches with an expiry skew and coalesces concurrent mints, mirroring the shared
 * `createTokenManager` but sourcing the token from the Payload endpoint instead of the secret.
 *
 * This is the "genuinely new" seam for the Payload port: the shared `TokenStorage` interface
 * would leak the secret into the browser, so Payload does not use it.
 */
export interface PayloadTokenStore {
  /** Returns a valid bearer, refreshing when near expiry. `force` always re-mints. */
  getToken(force?: boolean): Promise<string>;
}

/** Re-mint if the cached bearer expires within this many ms. */
const EXPIRY_SKEW_MS = 60_000;

export function createPayloadTokenStore(
  api: SirvAdminApi,
  now: () => number = () => Date.now(),
): PayloadTokenStore {
  let cached: { token: string; expiresAtMs: number } | null = null;
  let inFlight: Promise<string> | null = null;

  async function mint(): Promise<string> {
    const { token, expiresIn } = await api.token();
    cached = { token, expiresAtMs: now() + expiresIn * 1000 };
    return token;
  }

  return {
    async getToken(force = false) {
      if (!force && cached && cached.expiresAtMs - now() > EXPIRY_SKEW_MS) {
        return cached.token;
      }
      if (!inFlight) {
        inFlight = mint().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}
