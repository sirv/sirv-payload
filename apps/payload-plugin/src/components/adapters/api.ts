import type { SirvConnectionStatus } from '../../types.js';

/**
 * Thin browser client for the plugin's own Payload endpoints (`/api/sirv/*`). These calls are
 * same-origin and cookie-authenticated by the Payload admin session; the client secret is never
 * involved. `apiBase` defaults to Payload's default `/api` route - override it if the host set a
 * custom `routes.api`.
 */
export interface SirvAdminApi {
  status(): Promise<SirvConnectionStatus>;
  connect(clientId: string, clientSecret: string): Promise<SirvConnectionStatus>;
  selectDelivery(deliveryAlias: string): Promise<{ deliveryAlias: string }>;
  disconnect(): Promise<{ connected: false }>;
  /** POST /api/sirv/token -> a short-lived bearer for direct api.sirv.com calls. */
  token(): Promise<{ token: string; expiresIn: number }>;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body?.error || `Sirv request failed (${res.status})`);
  }
  return body;
}

export function createSirvAdminApi(apiBase = '/api'): SirvAdminApi {
  const base = `${apiBase.replace(/\/$/, '')}/sirv`;
  const post = (path: string, body?: unknown) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });

  return {
    async status() {
      return parseOrThrow(await fetch(`${base}/status`, { credentials: 'include' }));
    },
    async connect(clientId, clientSecret) {
      return parseOrThrow(await post('/connect', { clientId, clientSecret }));
    },
    async selectDelivery(deliveryAlias) {
      return parseOrThrow(await post('/delivery', { deliveryAlias }));
    },
    async disconnect() {
      return parseOrThrow(await post('/disconnect'));
    },
    async token() {
      return parseOrThrow(await post('/token'));
    },
  };
}
