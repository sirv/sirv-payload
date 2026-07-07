import { describe, expect, it } from 'vitest';
import { classifyAssetType, createSirvClient } from './index.js';

/**
 * Live smoke test against the real Sirv API. Skipped by default so `pnpm test` stays
 * hermetic. Run with credentials from .env.local:
 *
 *   set -a; source .env.local; set +a; SIRV_LIVE=1 pnpm test:live
 */
const live = process.env.SIRV_LIVE === '1' && !!process.env.SIRV_CLIENT_ID;

describe.skipIf(!live)('live Sirv API', () => {
  const client = createSirvClient({
    clientId: process.env.SIRV_CLIENT_ID as string,
    clientSecret: process.env.SIRV_CLIENT_SECRET as string,
  });

  it('mints a bearer', async () => {
    expect(await client.getToken()).toBeTruthy();
  });

  it('reads account info', async () => {
    const account = await client.getAccountInfo();
    expect(account.alias).toBeTruthy();
  });

  it('reads storage usage', async () => {
    const usage = await client.getUsage();
    expect(usage.used).toBeGreaterThanOrEqual(0);
    expect(usage.files).toBeGreaterThanOrEqual(0);
  });

  it('lists the root folder', async () => {
    const { contents } = await client.listFolder({ dirname: '/' });
    expect(Array.isArray(contents)).toBe(true);
  });

  it('searches images and stats the first hit', async () => {
    const { hits } = await client.searchFiles({ query: 'contentType:image*', size: 5 });
    expect(hits.length).toBeGreaterThan(0);
    const first = hits[0]?._source;
    expect(first?.filename).toBeTruthy();
    expect(classifyAssetType({ contentType: first?.contentType })).toBe('image');

    if (first?.filename) {
      const stat = await client.getFileInfo(first.filename);
      expect(stat.size).toBeGreaterThanOrEqual(0);
    }
  });
});
