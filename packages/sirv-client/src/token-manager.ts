import { type HttpContext, request } from './http.js';

interface TokenResponse {
  token: string;
  expiresIn: number;
  scope?: string[];
}

export interface TokenManager {
  /** Returns a valid bearer, minting/refreshing as needed. force=true always re-mints. */
  getToken(force?: boolean): Promise<string>;
  /** Whether this manager can re-mint (false for a static, pre-issued token). */
  readonly canRefresh: boolean;
}

/** Re-mint a bearer if it expires within this many ms. */
const EXPIRY_SKEW_MS = 60_000;

/** Mints and caches a bearer from clientId/clientSecret via POST /v2/token. */
export function createTokenManager(
  ctx: HttpContext,
  credentials: { clientId: string; clientSecret: string },
  now: () => number = () => Date.now(),
): TokenManager {
  let cached: { token: string; expiresAtMs: number } | null = null;
  let inFlight: Promise<string> | null = null;

  async function mint(): Promise<string> {
    const res = await request<TokenResponse>(ctx, '/token', {
      method: 'POST',
      body: { clientId: credentials.clientId, clientSecret: credentials.clientSecret },
    });
    cached = { token: res.token, expiresAtMs: now() + res.expiresIn * 1000 };
    return res.token;
  }

  return {
    canRefresh: true,
    async getToken(force = false) {
      if (!force && cached && cached.expiresAtMs - now() > EXPIRY_SKEW_MS) {
        return cached.token;
      }
      // Coalesce concurrent mints.
      if (!inFlight) {
        inFlight = mint().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}

/** Wraps a pre-issued bearer (no refresh capability). */
export function createStaticTokenManager(accessToken: string): TokenManager {
  return {
    canRefresh: false,
    getToken: async () => accessToken,
  };
}
