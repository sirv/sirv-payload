import { describe, expect, it } from 'vitest';
import { getCachedBearer, mintBearer, validateCredentials } from './sirv-server.js';

/**
 * Live smoke test for the plugin's server helpers against the real Sirv API. Skipped by default
 * so `pnpm test` stays hermetic. Run with credentials from .env.local:
 *
 *   set -a; source .env.local; set +a; SIRV_LIVE=1 pnpm test
 */
const live = process.env.SIRV_LIVE === '1' && !!process.env.SIRV_CLIENT_ID;
const clientId = process.env.SIRV_CLIENT_ID as string;
const clientSecret = process.env.SIRV_CLIENT_SECRET as string;

describe.skipIf(!live)('live Sirv server helpers', () => {
  it('mints a bearer with a positive expiresIn', async () => {
    const res = await mintBearer(clientId, clientSecret);
    expect(res.token).toBeTruthy();
    expect(res.expiresIn).toBeGreaterThan(0);
  });

  it('caches the bearer for a clientId', async () => {
    const a = await getCachedBearer(clientId, clientSecret);
    const b = await getCachedBearer(clientId, clientSecret);
    expect(a.token).toBe(b.token);
  });

  it('validates credentials and returns delivery domains', async () => {
    const { accountAlias, aliases } = await validateCredentials(clientId, clientSecret);
    expect(accountAlias).toBeTruthy();
    expect(aliases.length).toBeGreaterThan(0);
    expect(aliases[0]?.host).toContain('.');
  });
});
