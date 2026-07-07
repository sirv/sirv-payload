import type { Endpoint } from 'payload';
import { clearBearerCache } from '../lib/sirv-server.js';
import { SIRV_API_ROUTES, SIRV_SETTINGS_SLUG } from '../types.js';
import { json, readSettings, requireAdmin } from './helpers.js';

/**
 * POST /api/sirv/disconnect - clear the stored credentials and any cached bearer.
 */
export const disconnectEndpoint: Endpoint = {
  path: SIRV_API_ROUTES.disconnect,
  method: 'post',
  handler: async (req) => {
    const denied = requireAdmin(req);
    if (denied) return denied;

    const settings = await readSettings(req.payload);
    clearBearerCache(settings.clientId);

    await req.payload.updateGlobal({
      slug: SIRV_SETTINGS_SLUG as never,
      data: {
        clientId: null,
        clientSecret: null,
        accountAlias: null,
        deliveryAlias: null,
        aliases: null,
      } as never,
    });

    return json({ connected: false });
  },
};
