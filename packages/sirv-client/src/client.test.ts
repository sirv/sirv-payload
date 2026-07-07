import { describe, expect, it } from 'vitest';
import { StoredCredentialsSchema, createSirvClient } from './index.js';
import { TOKEN_OK, mockFetch } from './test-utils.js';

const creds = { clientId: 'id', clientSecret: 'secret' };

describe('createSirvClient', () => {
  it('mints a bearer then sends it on account calls', async () => {
    const { fetch, calls } = mockFetch((call) => {
      if (call.url.endsWith('/token')) return TOKEN_OK;
      if (call.url.endsWith('/account'))
        return { body: { alias: 'demo', cdnURL: 'demo.sirv.com' } };
      return { status: 404 };
    });
    const client = createSirvClient({ ...creds, fetch });
    const account = await client.getAccountInfo();

    expect(account.alias).toBe('demo');
    expect(calls[0]?.url).toContain('/token');
    expect(calls[1]?.headers.Authorization).toBe('Bearer minted-bearer');
  });

  it('caches the bearer across calls (mints once)', async () => {
    const { fetch, calls } = mockFetch((call) => {
      if (call.url.endsWith('/token')) return TOKEN_OK;
      if (call.url.includes('/account/storage')) return { body: { plan: 1, used: 0, files: 0 } };
      return { body: { alias: 'demo' } };
    });
    const client = createSirvClient({ ...creds, fetch });
    await client.getAccountInfo();
    await client.getUsage();

    expect(calls.filter((c) => c.url.endsWith('/token'))).toHaveLength(1);
  });

  it('re-mints once and retries on a 401', async () => {
    let accountCalls = 0;
    const { fetch, calls } = mockFetch((call) => {
      if (call.url.endsWith('/token')) return TOKEN_OK;
      if (call.url.endsWith('/account')) {
        accountCalls += 1;
        return accountCalls === 1
          ? { status: 401, body: { message: 'expired' } }
          : { body: { alias: 'demo' } };
      }
      return { status: 404 };
    });
    const client = createSirvClient({ ...creds, fetch });
    const account = await client.getAccountInfo();

    expect(account.alias).toBe('demo');
    expect(calls.filter((c) => c.url.endsWith('/token'))).toHaveLength(2);
  });

  it('parses readdir, search and stat responses', async () => {
    const { fetch } = mockFetch((call) => {
      if (call.url.endsWith('/token')) return TOKEN_OK;
      if (call.url.includes('/files/readdir'))
        return {
          body: {
            contents: [
              { filename: 'a.jpg', size: 10, isDirectory: false, contentType: 'image/jpeg' },
            ],
            continuation: null,
          },
        };
      if (call.url.includes('/files/search'))
        return { body: { hits: [{ _source: { filename: '/a.jpg' } }], total: 1, _relation: 'eq' } };
      if (call.url.includes('/files/stat'))
        return { body: { size: 81, isDirectory: false, meta: { width: 1, height: 1 } } };
      return { status: 404 };
    });
    const client = createSirvClient({ ...creds, fetch });

    expect((await client.listFolder({ dirname: '/' })).contents[0]?.filename).toBe('a.jpg');
    expect((await client.searchFiles({ query: 'contentType:image*' })).total).toBe(1);
    expect((await client.getFileInfo('/1x1.png')).meta?.width).toBe(1);
  });

  it('uses a static token without minting when given accessToken', async () => {
    const { fetch, calls } = mockFetch(() => ({ body: { alias: 'demo' } }));
    const client = createSirvClient({ accessToken: 'preissued', fetch });
    await client.getAccountInfo();

    expect(calls.some((c) => c.url.endsWith('/token'))).toBe(false);
    expect(calls[0]?.headers.Authorization).toBe('Bearer preissued');
  });

  it('calls the global fetch bound to its realm (no detached-this "Illegal invocation")', async () => {
    const original = globalThis.fetch;
    let receiver: unknown = 'unset';
    globalThis.fetch = function fakeFetch(this: unknown) {
      receiver = this;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ alias: 'demo' }),
        text: async () => '{}',
      });
    } as unknown as typeof fetch;
    try {
      // No fetch injected -> the client must use a bound globalThis.fetch.
      const client = createSirvClient({ accessToken: 'tok' });
      await client.getAccountInfo();
      expect(receiver === globalThis || receiver === undefined).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('package exports', () => {
  it('validates stored credentials with zod', () => {
    const parsed = StoredCredentialsSchema.parse({
      clientId: 'id',
      clientSecret: 'secret',
      accountAlias: 'demo.sirv.com',
    });
    expect(parsed.accountAlias).toBe('demo.sirv.com');
  });
});
