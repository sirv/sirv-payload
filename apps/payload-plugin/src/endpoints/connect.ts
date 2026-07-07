import { SirvApiError } from '@sirv/sirv-client';
import { type Endpoint, addDataAndFileToRequest } from 'payload';
import { clearBearerCache, validateCredentials } from '../lib/sirv-server.js';
import { SIRV_API_ROUTES, SIRV_SETTINGS_SLUG } from '../types.js';
import { json, requireAdmin } from './helpers.js';

/**
 * POST /api/sirv/connect - validate a clientId/secret pair against the Sirv account and persist
 * it. The secret is encrypted by the global's field hook on write; the response never contains
 * it. Auto-selects the delivery domain when the account has exactly one.
 */
export const connectEndpoint: Endpoint = {
  path: SIRV_API_ROUTES.connect,
  method: 'post',
  handler: async (req) => {
    const denied = requireAdmin(req);
    if (denied) return denied;

    await addDataAndFileToRequest(req);
    const data = (req.data ?? {}) as { clientId?: unknown; clientSecret?: unknown };
    const clientId = typeof data.clientId === 'string' ? data.clientId.trim() : '';
    const clientSecret = typeof data.clientSecret === 'string' ? data.clientSecret.trim() : '';
    if (!clientId || !clientSecret) {
      return json({ error: 'clientId and clientSecret are required' }, 400);
    }

    let account: Awaited<ReturnType<typeof validateCredentials>>;
    try {
      account = await validateCredentials(clientId, clientSecret);
    } catch (err) {
      if (err instanceof SirvApiError) {
        return json({ error: 'Invalid Sirv credentials', status: err.status }, 400);
      }
      throw err;
    }

    const deliveryAlias = account.aliases.length === 1 ? account.aliases[0]?.host : undefined;

    clearBearerCache(clientId);
    await req.payload.updateGlobal({
      slug: SIRV_SETTINGS_SLUG as never,
      data: {
        clientId,
        clientSecret,
        accountAlias: account.accountAlias,
        deliveryAlias,
        aliases: account.aliases,
      } as never,
    });

    return json({
      connected: true,
      accountAlias: account.accountAlias,
      aliases: account.aliases,
      deliveryAlias,
    });
  },
};
