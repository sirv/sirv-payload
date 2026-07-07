import type { AliasOption } from '@sirv/sirv-client';
import type { BasePayload, PayloadRequest } from 'payload';
import { SIRV_SETTINGS_SLUG } from '../types.js';

/** The stored settings shape (the global is not in the host's generated types). */
export interface SirvSettingsData {
  clientId?: string;
  clientSecret?: string;
  accountAlias?: string;
  deliveryAlias?: string;
  aliases?: AliasOption[];
}

/** JSON response shortcut. */
export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

/** Returns a 401 Response when the request is not an authenticated admin, otherwise null. */
export function requireAdmin(req: PayloadRequest): Response | null {
  if (!req.user) return json({ error: 'Unauthorized' }, 401);
  return null;
}

/** Reads the settings global via the Local API (bypasses access control, decrypts the secret). */
export async function readSettings(payload: BasePayload): Promise<SirvSettingsData> {
  const global = await payload.findGlobal({ slug: SIRV_SETTINGS_SLUG as never });
  return (global ?? {}) as SirvSettingsData;
}
