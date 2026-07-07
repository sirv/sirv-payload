import type { AliasOption } from '@sirv/sirv-client';
import { type Endpoint, addDataAndFileToRequest } from 'payload';
import { SIRV_API_ROUTES, SIRV_SETTINGS_SLUG } from '../types.js';
import { json, readSettings, requireAdmin } from './helpers.js';

/**
 * POST /api/sirv/delivery - persist the chosen delivery domain. Used when an account has more
 * than one delivery domain, so the picker can save the selection without re-sending the secret
 * (which the browser never holds). The chosen host must be one of the account's known aliases.
 */
export const deliveryEndpoint: Endpoint = {
  path: SIRV_API_ROUTES.delivery,
  method: 'post',
  handler: async (req) => {
    const denied = requireAdmin(req);
    if (denied) return denied;

    await addDataAndFileToRequest(req);
    const data = (req.data ?? {}) as { deliveryAlias?: unknown };
    const deliveryAlias = typeof data.deliveryAlias === 'string' ? data.deliveryAlias : '';
    if (!deliveryAlias) return json({ error: 'deliveryAlias is required' }, 400);

    const settings = await readSettings(req.payload);
    if (!settings.clientId) return json({ error: 'Sirv account not connected' }, 409);

    const known = (settings.aliases ?? []) as AliasOption[];
    if (known.length > 0 && !known.some((a) => a.host === deliveryAlias)) {
      return json({ error: 'Unknown delivery domain for this account' }, 400);
    }

    await req.payload.updateGlobal({
      slug: SIRV_SETTINGS_SLUG as never,
      data: { deliveryAlias } as never,
    });
    return json({ deliveryAlias });
  },
};
