import type { Config } from 'payload';
import { sirvEndpoints } from './endpoints/index.js';
import { sirvSettingsGlobal } from './globals/sirv-settings.js';
import type { SirvPluginOptions } from './types.js';

/** Path the settings admin view is mounted at, i.e. `/admin/sirv`. */
const SIRV_ADMIN_VIEW_PATH = '/sirv' as const;

/**
 * `sirvPlugin(options)` returns a Payload config transform that adds Sirv as a media source:
 * the `sirv-settings` global (encrypted credentials), the connect/token/status/delivery/
 * disconnect endpoints, a Sirv settings admin view, and a sidebar nav link to it.
 *
 * The plugin config itself is server-safe (no `@sirv/core`/React). The admin view and field
 * components are referenced by import-map path strings into the `./client` bundle and resolved
 * by `payload generate:importmap` in the host app.
 */
export const sirvPlugin =
  (pluginOptions: SirvPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    if (pluginOptions.enabled === false) return incomingConfig;

    const config: Config = { ...incomingConfig };

    config.globals = [...(config.globals ?? []), sirvSettingsGlobal];
    config.endpoints = [...(config.endpoints ?? []), ...sirvEndpoints];

    config.admin = {
      ...(config.admin ?? {}),
      components: {
        ...(config.admin?.components ?? {}),
        views: {
          ...(config.admin?.components?.views ?? {}),
          sirvSettings: {
            Component: '@sirv/payload-plugin/client#SirvSettingsView',
            path: SIRV_ADMIN_VIEW_PATH,
          },
        },
        afterNavLinks: [
          ...(config.admin?.components?.afterNavLinks ?? []),
          '@sirv/payload-plugin/client#SirvNavLink',
        ],
      },
    };

    // Preserve any existing onInit (functions cannot be spread).
    const existingOnInit = config.onInit;
    config.onInit = async (payload) => {
      if (existingOnInit) await existingOnInit(payload);
    };

    return config;
  };

export default sirvPlugin;

export type { SirvPluginOptions, SirvConnectionStatus } from './types.js';
export { SIRV_SETTINGS_SLUG, SIRV_API_ROUTES } from './types.js';
export { sirvSettingsGlobal } from './globals/sirv-settings.js';
export { sirvEndpoints } from './endpoints/index.js';
