import type { Endpoint } from 'payload';
import type { SirvConnectionStatus } from '../types.js';
import { SIRV_API_ROUTES } from '../types.js';
import { json, readSettings, requireAdmin } from './helpers.js';

/**
 * GET /api/sirv/status - non-secret connection status for the settings view (connected flag,
 * account alias, chosen delivery domain, selectable domains). The secret is never included.
 */
export const statusEndpoint: Endpoint = {
  path: SIRV_API_ROUTES.status,
  method: 'get',
  handler: async (req) => {
    const denied = requireAdmin(req);
    if (denied) return denied;

    const settings = await readSettings(req.payload);
    const status: SirvConnectionStatus = {
      connected: Boolean(settings.clientId && settings.clientSecret),
      accountAlias: settings.accountAlias,
      deliveryAlias: settings.deliveryAlias,
      aliases: settings.aliases,
    };
    return json(status);
  },
};
