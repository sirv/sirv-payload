'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SirvConnectionStatus } from '../types.js';
import { createSirvAdminApi } from './adapters/api.js';

const API_SETTINGS_URL = 'https://my.sirv.com/#/account/settings/api';
const DOCS_URL = 'https://sirv.com/help/';
const SUPPORT_URL = 'https://sirv.com/help/support/';

/**
 * The Sirv settings admin view (mounted at /admin/sirv). Full connect flow, laid out like the
 * other Sirv CMS plugins: a "Connection" card (paste REST Client ID + Secret -> validate via the
 * server -> pick delivery domain -> disconnect) and a "Help & support" card. The secret is posted
 * once to the server and never read back; the browser only ever sees the non-secret status.
 */
export function SirvSettingsClient() {
  const api = useMemo(() => createSirvAdminApi(), []);
  const [status, setStatus] = useState<SirvConnectionStatus | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await api.status());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Sirv status');
    } finally {
      setLoaded(true);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.connect(clientId.trim(), clientSecret.trim());
      setStatus(next);
      setClientSecret('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setBusy(false);
    }
  };

  const onSelectDelivery = async (host: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.selectDelivery(host);
      setStatus((s) => (s ? { ...s, deliveryAlias: host } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set delivery domain');
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.disconnect();
      setStatus({ connected: false });
      setClientId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sirv-settings">
      <div className="sirv-settings__header">
        <h1 className="sirv-settings__title">Sirv configuration</h1>
        <p className="sirv-settings__subtitle">Connect your Sirv account.</p>
      </div>

      <section className="sirv-card">
        <h2 className="sirv-card__title">Connection</h2>

        {!loaded ? (
          <p className="sirv-muted">Checking Sirv connection...</p>
        ) : status?.connected ? (
          <ConnectedPanel
            status={status}
            busy={busy}
            error={error}
            onSelectDelivery={onSelectDelivery}
            onDisconnect={onDisconnect}
          />
        ) : (
          <form
            className="sirv-form"
            onSubmit={(e) => {
              e.preventDefault();
              void onConnect();
            }}
          >
            <label className="sirv-field">
              <span className="sirv-field__label">
                Client ID <span className="sirv-required">*</span>
              </span>
              <input
                className="sirv-input"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="sirv-hint">
                Create or find your REST API keys at{' '}
                <a href={API_SETTINGS_URL} target="_blank" rel="noopener noreferrer">
                  my.sirv.com &rarr; Settings &rarr; API
                </a>
              </span>
            </label>

            <label className="sirv-field">
              <span className="sirv-field__label">
                Client secret <span className="sirv-required">*</span>
              </span>
              <input
                className="sirv-input"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            {error ? <div className="sirv-alert sirv-alert--error">{error}</div> : null}

            <button
              className="sirv-btn sirv-btn--primary"
              type="submit"
              disabled={busy || !clientId.trim() || !clientSecret.trim()}
            >
              {busy ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        )}
      </section>

      <section className="sirv-card">
        <h2 className="sirv-card__title">Help &amp; support</h2>
        <p className="sirv-muted">
          We'd love to hear from you. Send us your questions and feedback - this plugin is improved
          based on customer input.
        </p>
        <div className="sirv-links">
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
            Documentation
          </a>
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            Contact support
          </a>
          <a href={API_SETTINGS_URL} target="_blank" rel="noopener noreferrer">
            Your API keys
          </a>
        </div>
      </section>
    </div>
  );
}

function ConnectedPanel({
  status,
  busy,
  error,
  onSelectDelivery,
  onDisconnect,
}: {
  status: SirvConnectionStatus;
  busy: boolean;
  error: string | null;
  onSelectDelivery: (host: string) => void;
  onDisconnect: () => void;
}) {
  const aliases = status.aliases ?? [];
  return (
    <div className="sirv-panel">
      <div className="sirv-row sirv-row--between">
        <span className="sirv-row">
          <span className="sirv-badge sirv-badge--ok">Connected</span>
          <span className="sirv-muted">
            Account <strong>{status.accountAlias}</strong>
          </span>
        </span>
        <button
          className="sirv-btn sirv-btn--danger"
          type="button"
          onClick={onDisconnect}
          disabled={busy}
        >
          Disconnect
        </button>
      </div>

      <div className="sirv-field">
        <span className="sirv-field__label">Delivery domain</span>
        {aliases.length > 1 ? (
          <select
            className="sirv-input"
            value={status.deliveryAlias ?? ''}
            disabled={busy}
            onChange={(e) => onSelectDelivery(e.target.value)}
          >
            <option value="" disabled>
              Select a delivery domain
            </option>
            {aliases.map((a) => (
              <option key={a.host} value={a.host}>
                {a.host}
              </option>
            ))}
          </select>
        ) : (
          <code className="sirv-code">{status.deliveryAlias ?? aliases[0]?.host ?? '-'}</code>
        )}
      </div>

      {error ? <div className="sirv-alert sirv-alert--error">{error}</div> : null}
    </div>
  );
}

export default SirvSettingsClient;
