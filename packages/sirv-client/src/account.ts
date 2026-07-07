import type { AuthedRequest } from './http.js';
import {
  type AccountInfo,
  AccountInfoSchema,
  type BillingPlan,
  BillingPlanSchema,
  type StorageUsage,
  StorageUsageSchema,
} from './types.js';

/** GET /v2/account - alias, cdnURL, aliases (the URL-builder inputs). */
export async function getAccountInfo(req: AuthedRequest): Promise<AccountInfo> {
  return AccountInfoSchema.parse(await req('/account'));
}

/** A selectable delivery domain for an account. */
export interface AliasOption {
  /** The alias key, e.g. "demo". */
  alias: string;
  /** The delivery host for building URLs, e.g. "demo.sirv.com" or a custom domain. */
  host: string;
}

/**
 * Lists an account's delivery domains from its `aliases` map: each alias becomes
 * `<alias>.sirv.com`, or its custom domain when configured. The primary account alias is
 * listed first. Falls back to the account's cdnURL when no aliases are present.
 */
export function accountAliasOptions(info: AccountInfo): AliasOption[] {
  const aliases = (info.aliases ?? {}) as Record<string, { customDomain?: string } | undefined>;
  const keys = Object.keys(aliases);
  if (keys.length === 0) {
    return [{ alias: info.alias, host: info.cdnURL ?? `${info.alias}.sirv.com` }];
  }
  return keys
    .map((alias) => {
      const custom = aliases[alias]?.customDomain;
      return { alias, host: custom && custom.length > 0 ? custom : `${alias}.sirv.com` };
    })
    .sort((a, b) => {
      if (a.alias === info.alias) return -1;
      if (b.alias === info.alias) return 1;
      return a.alias.localeCompare(b.alias, undefined, { numeric: true });
    });
}

/** GET /v2/account/storage - byte-based usage. */
export async function getUsage(req: AuthedRequest): Promise<StorageUsage> {
  return StorageUsageSchema.parse(await req('/account/storage'));
}

/** GET /v2/billing/plan - the account's plan. */
export async function getBillingPlan(req: AuthedRequest): Promise<BillingPlan> {
  return BillingPlanSchema.parse(await req('/billing/plan'));
}
