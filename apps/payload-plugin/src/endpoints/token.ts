import { SirvApiError } from '@sirv/sirv-client';
import type { Endpoint } from 'payload';
import { getCachedBearer } from '../lib/sirv-server.js';
import { SIRV_API_ROUTES } from '../types.js';
import { json, readSettings, requireAdmin } from './helpers.js';

/**
 * POST /api/sirv/token - mint a short-lived (20 min) bearer for the connected account. This is
 * the ONLY credential the admin browser receives; the secret stays server-side. The browser
 * caches the bearer and talks to api.sirv.com directly for DAM browsing.
 */
export const tokenEndpoint: Endpoint = {
  path: SIRV_API_ROUTES.token,
  method: 'post',
  handler: async (req) => {
    const denied = requireAdmin(req);
    if (denied) return denied;

    const settings = await readSettings(req.payload);
    if (!settings.clientId || !settings.clientSecret) {
      return json({ error: 'Sirv account not connected' }, 409);
    }

    try {
      const bearer = await getCachedBearer(settings.clientId, settings.clientSecret);
      return json({ token: bearer.token, expiresIn: bearer.expiresIn });
    } catch (err) {
      if (err instanceof SirvApiError) {
        return json({ error: 'Failed to mint Sirv token', status: err.status }, 502);
      }
      throw err;
    }
  },
};
