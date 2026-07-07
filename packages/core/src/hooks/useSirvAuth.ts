import {
  type AliasOption,
  type FetchLike,
  type SirvClient,
  type StoredCredentials,
  accountAliasOptions,
  createSirvClient,
} from '@sirv/sirv-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TokenStorage } from '../token-storage.js';

export type SirvAuthStatus =
  | 'loading' // reading stored credentials
  | 'logged-out' // no stored credentials; show the clientId/secret form
  | 'selecting-alias' // credentials validated; choose a delivery domain
  | 'connecting' // validating credentials / finalizing
  | 'connected'
  | 'error';

export interface ConnectedAccount {
  alias: string;
  /** The chosen delivery host used for asset URLs. */
  deliveryAlias?: string;
}

export interface UseSirvAuthOptions {
  storage: TokenStorage;
  /** Forwarded to the Sirv client (baseUrl, injected fetch for tests). */
  clientOptions?: { baseUrl?: string; fetch?: FetchLike };
}

export interface UseSirvAuthResult {
  status: SirvAuthStatus;
  error?: string;
  busy: boolean;
  /** The connected account (when status is 'connected'). */
  account?: ConnectedAccount;
  /** Authed client, available once connected. */
  client?: SirvClient;
  /** The chosen delivery host for building asset URLs (once connected). */
  deliveryAlias?: string;
  /** Delivery domains to choose from (when status is 'selecting-alias'). */
  aliasOptions: AliasOption[];
  /**
   * Validates a clientId/secret pair (by fetching the account) and moves to the alias-selection
   * step, or connects directly when the account exposes a single delivery domain.
   */
  connectWithCredentials(clientId: string, clientSecret: string): Promise<void>;
  /** Persists the credentials with the chosen delivery host and connects. */
  selectAlias(host: string): Promise<void>;
  logout(): Promise<void>;
  /** Clears a transient error, returning to the appropriate prior step. */
  clearError(): void;
}

/**
 * Local (self-hosted Studio) auth: the user pastes their per-account REST clientId/secret on the
 * settings page, then picks which delivery domain to use. There is no server, so the previous
 * email + password + OTP + account-lookup flow is intentionally disabled (kept commented at the
 * bottom of this file for reference / future hosted use).
 */
export function useSirvAuth(options: UseSirvAuthOptions): UseSirvAuthResult {
  const { storage, clientOptions } = options;

  const [status, setStatus] = useState<SirvAuthStatus>('loading');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<ConnectedAccount | undefined>();
  const [client, setClient] = useState<SirvClient | undefined>();
  const [deliveryAlias, setDeliveryAlias] = useState<string | undefined>();
  const [aliasOptions, setAliasOptions] = useState<AliasOption[]>([]);

  // The validated-but-not-yet-finalized credentials, held in a ref so they never reach render.
  const pending = useRef<{ clientId: string; clientSecret: string; accountAlias: string } | null>(
    null,
  );

  const connectFromStored = useCallback(
    (creds: StoredCredentials) => {
      setClient(createSirvClient({ ...creds, ...clientOptions }));
      setAccount({ alias: creds.accountAlias, deliveryAlias: creds.deliveryAlias });
      setDeliveryAlias(creds.deliveryAlias);
      setStatus('connected');
    },
    [clientOptions],
  );

  // Keep the latest connect callback reachable from the mount-only effect without making it a
  // dependency (clientOptions is often a fresh object each render).
  const connectFromStoredRef = useRef(connectFromStored);
  connectFromStoredRef.current = connectFromStored;

  // On mount, reuse stored credentials if present (silent re-connect). Runs once per storage.
  useEffect(() => {
    let cancelled = false;
    storage
      .read()
      .then((creds) => {
        if (cancelled) return;
        if (creds) connectFromStoredRef.current(creds);
        else setStatus('logged-out');
      })
      .catch(() => {
        if (!cancelled) setStatus('logged-out');
      });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  /** Persists the pending credentials with a chosen delivery host and connects. */
  const finalize = useCallback(
    async (host: string) => {
      const creds = pending.current;
      if (!creds) {
        setError('Session expired. Please enter your credentials again.');
        setStatus('logged-out');
        return;
      }
      const stored: StoredCredentials = {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        accountAlias: creds.accountAlias,
        deliveryAlias: host,
      };
      await storage.write(stored);
      setClient(createSirvClient({ ...stored, ...clientOptions }));
      setAccount({ alias: creds.accountAlias, deliveryAlias: host });
      setDeliveryAlias(host);
      setAliasOptions([]);
      pending.current = null;
      setStatus('connected');
    },
    [storage, clientOptions],
  );

  const connectWithCredentials = useCallback(
    async (clientId: string, clientSecret: string) => {
      setBusy(true);
      setError(undefined);
      setStatus('connecting');
      try {
        // Validate by minting a token + fetching the account (throws on bad credentials).
        const probe = createSirvClient({ clientId, clientSecret, ...clientOptions });
        const info = await probe.getAccountInfo();
        pending.current = { clientId, clientSecret, accountAlias: info.alias };
        const options = accountAliasOptions(info);
        setAliasOptions(options);
        if (options.length === 1 && options[0]) {
          await finalize(options[0].host);
        } else {
          setAccount({ alias: info.alias });
          setStatus('selecting-alias');
        }
      } catch (_err) {
        setError('Could not connect. Check your client ID and secret and try again.');
        setStatus('logged-out');
      } finally {
        setBusy(false);
      }
    },
    [clientOptions, finalize],
  );

  const selectAlias = useCallback(
    async (host: string) => {
      setBusy(true);
      setError(undefined);
      try {
        await finalize(host);
      } catch (_err) {
        setError('Failed to save the connection. Please try again.');
        setStatus('selecting-alias');
      } finally {
        setBusy(false);
      }
    },
    [finalize],
  );

  const logout = useCallback(async () => {
    await storage.clear();
    pending.current = null;
    setClient(undefined);
    setAccount(undefined);
    setDeliveryAlias(undefined);
    setAliasOptions([]);
    setError(undefined);
    setStatus('logged-out');
  }, [storage]);

  const clearError = useCallback(() => {
    setError(undefined);
    setStatus(pending.current ? 'selecting-alias' : 'logged-out');
  }, []);

  return {
    status,
    error,
    busy,
    account,
    client,
    deliveryAlias,
    aliasOptions,
    connectWithCredentials,
    selectAlias,
    logout,
    clearError,
  };
}

/*
 * --- Legacy connect flow (email + password + OTP + account lookup) - REMOVED ---
 *
 * The Studio is self-hosted with no backend, so the hosted connect flow was removed along with
 * its embedded app bootstrap credential (so the published plugin ships no credentials). Users
 * paste their own per-account REST clientId/secret instead (above). The old implementation
 * (listUserAccounts -> connectableAccounts -> getRestCredentials, with 'otp-required' and
 * 'selecting-account' statuses, plus packages/sirv-client/src/{auth,bootstrap}.ts) lives in git
 * history should a hosted variant be needed later.
 */
