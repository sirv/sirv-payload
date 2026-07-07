import type { FieldHook, GlobalConfig } from 'payload';
import { decryptSecret, encryptSecret } from '../lib/encryption.js';
import { SIRV_SETTINGS_SLUG } from '../types.js';

/** Gate the whole singleton to authenticated admin users. */
const adminOnly = ({ req }: { req: { user?: unknown } }): boolean => Boolean(req.user);

// The Payload secret (PAYLOAD_SECRET) is the encryption key source. It is available on the
// Local API instance as `req.payload.secret` inside field hooks.
const encryptOnChange: FieldHook = ({ value, req }) => {
  if (typeof value !== 'string' || value.length === 0) return value;
  return encryptSecret(value, req.payload.secret);
};

const decryptOnRead: FieldHook = ({ value, req }) => {
  if (typeof value !== 'string' || value.length === 0) return value;
  return decryptSecret(value, req.payload.secret);
};

/**
 * The `sirv-settings` global holds one account's connection. The client secret is stored
 * encrypted (AES-256-GCM, key derived from the Payload secret) and its field-level `read`
 * access is hard-denied, so it never reaches the admin browser or REST/GraphQL responses.
 * The plugin's own endpoints read it through the Local API (which bypasses access control) to
 * mint bearer tokens server-side.
 */
export const sirvSettingsGlobal: GlobalConfig = {
  slug: SIRV_SETTINGS_SLUG,
  access: {
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: 'Sirv',
    description:
      'Sirv account connection. Manage this through the Sirv settings view; the secret is stored encrypted and never returned to the browser.',
  },
  fields: [
    {
      name: 'clientId',
      type: 'text',
      label: 'REST Client ID',
      admin: { readOnly: true },
    },
    {
      name: 'clientSecret',
      type: 'text',
      label: 'REST Client Secret (encrypted)',
      access: {
        // Never expose the secret (plaintext or ciphertext) to the admin UI or API responses.
        read: () => false,
        update: adminOnly,
      },
      admin: {
        readOnly: true,
        // Do not render the value in the admin field UI even for server components.
        hidden: true,
      },
      hooks: {
        beforeChange: [encryptOnChange],
        afterRead: [decryptOnRead],
      },
    },
    {
      name: 'accountAlias',
      type: 'text',
      label: 'Account alias',
      admin: { readOnly: true },
    },
    {
      name: 'deliveryAlias',
      type: 'text',
      label: 'Delivery domain',
      admin: { readOnly: true },
    },
    {
      // Cached list of selectable delivery domains ({ alias, host }) from the connect step.
      name: 'aliases',
      type: 'json',
      admin: { readOnly: true, hidden: true },
    },
  ],
};
