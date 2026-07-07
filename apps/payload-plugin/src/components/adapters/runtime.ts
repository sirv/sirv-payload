import type { SirvClient } from '@sirv/sirv-client';
import type { SirvConnectionStatus } from '../../types.js';
import { createPayloadTokenStore } from './PayloadTokenStore.js';
import { type SirvAdminApi, createSirvAdminApi } from './api.js';
import { createBrowserSirvClient } from './browser-client.js';

/**
 * Process-wide singletons for the admin browser. All Sirv fields on a page share one API
 * client, one token store (so the bearer is minted once), one `SirvClient`, and one in-flight
 * status fetch. Lazily initialized so nothing runs during SSR/import.
 */
let cached: { api: SirvAdminApi; client: SirvClient } | null = null;

export function sirvRuntime(): { api: SirvAdminApi; client: SirvClient } {
  if (!cached) {
    const api = createSirvAdminApi();
    const client = createBrowserSirvClient(createPayloadTokenStore(api));
    cached = { api, client };
  }
  return cached;
}

let statusPromise: Promise<SirvConnectionStatus> | null = null;

/** Fetches (and caches) the connection status. `force` re-fetches, e.g. after connect/disconnect. */
export function loadSirvStatus(force = false): Promise<SirvConnectionStatus> {
  if (force || !statusPromise) {
    statusPromise = sirvRuntime().api.status();
  }
  return statusPromise;
}

/** The delivery host to build URLs with (explicit choice, else the first known alias). */
export function resolveDeliveryAlias(status: SirvConnectionStatus | null): string | undefined {
  return status?.deliveryAlias ?? status?.aliases?.[0]?.host;
}
