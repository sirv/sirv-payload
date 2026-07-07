import type { AliasOption } from '@sirv/sirv-client';

/** The global slug the plugin registers its credentials under. */
export const SIRV_SETTINGS_SLUG = 'sirv-settings';

/** Default REST route the token endpoint resolves at (Payload prefixes `/api`). */
export const SIRV_API_ROUTES = {
  connect: '/sirv/connect',
  token: '/sirv/token',
  status: '/sirv/status',
  delivery: '/sirv/delivery',
  disconnect: '/sirv/disconnect',
} as const;

/** Options accepted by `sirvPlugin(options)`. Kept intentionally small (spec constraint 1). */
export interface SirvPluginOptions {
  /**
   * When false the plugin returns the incoming config untouched (no global, endpoints or
   * admin view). Handy for disabling the integration per-environment without code changes.
   * Defaults to true.
   */
  enabled?: boolean;
}

/**
 * The non-secret connection status returned by `GET /api/sirv/status` and surfaced in the
 * admin settings view. The client secret is NEVER part of this shape.
 */
export interface SirvConnectionStatus {
  connected: boolean;
  accountAlias?: string;
  deliveryAlias?: string;
  aliases?: AliasOption[];
}
