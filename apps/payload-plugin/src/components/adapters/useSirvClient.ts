'use client';

import type { SirvClient } from '@sirv/sirv-client';
import { useEffect, useState } from 'react';
import type { SirvConnectionStatus } from '../../types.js';
import { loadSirvStatus, resolveDeliveryAlias, sirvRuntime } from './runtime.js';

export interface UseSirvClientResult {
  client: SirvClient;
  status: SirvConnectionStatus | null;
  connected: boolean;
  deliveryAlias?: string;
  loading: boolean;
  error: string | null;
}

/**
 * Provides the shared browser `SirvClient` plus the connection status (connected flag, delivery
 * host). Used by the DAM browser and the field components.
 */
export function useSirvClient(): UseSirvClientResult {
  const { client } = sirvRuntime();
  const [status, setStatus] = useState<SirvConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSirvStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load Sirv status');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    client,
    status,
    connected: status?.connected ?? false,
    deliveryAlias: resolveDeliveryAlias(status),
    loading,
    error,
  };
}
