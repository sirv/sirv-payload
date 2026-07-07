'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SirvConnectionStatus } from '../types.js';
import { createSirvAdminApi } from './adapters/api.js';

/**
 * The Sirv settings admin view (mounted at /admin/sirv). Full connect flow: paste REST Client
 * ID + Secret -> validate via the server (GET /v2/account) -> pick the delivery domain
 * (auto-selected when the account has one) -> disconnect. The secret is posted once to the
 * server and never read back; the browser only ever sees the non-secret status.
 */
export function SirvSettingsView() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sirv-settings">
      <div className="sirv-settings__header">
        <h1 className="sirv-settings__title">Sirv</h1>
        <p className="sirv-settings__subtitle">
          Connect your Sirv account to browse and pick media from the Sirv DAM.
        </p>
      </div>

      {error ? <div className="sirv-alert sirv-alert--error">{error}</div> : null}

      {!loaded ? (
        <p className="sirv-muted">Loading...</p>
      ) : status?.connected ? (
        <ConnectedPanel
          status={status}
          busy={busy}
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
            <span className="sirv-field__label">REST Client ID</span>
            <input
              className="sirv-input"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="sirv-field">
            <span className="sirv-field__label">REST Client Secret</span>
            <input
              className="sirv-input"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <p className="sirv-muted">
            Find these in Sirv under Account &gt; Settings &gt; API (REST API tokens). The secret is
            stored encrypted on your server and never sent to the browser.
          </p>
          <button
            className="sirv-btn sirv-btn--primary"
            type="submit"
            disabled={busy || !clientId.trim() || !clientSecret.trim()}
          >
            {busy ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      )}
    </div>
  );
}

function ConnectedPanel({
  status,
  busy,
  onSelectDelivery,
  onDisconnect,
}: {
  status: SirvConnectionStatus;
  busy: boolean;
  onSelectDelivery: (host: string) => void;
  onDisconnect: () => void;
}) {
  const aliases = status.aliases ?? [];
  return (
    <div className="sirv-panel">
      <div className="sirv-row">
        <span className="sirv-badge sirv-badge--ok">Connected</span>
        <span className="sirv-muted">
          Account <strong>{status.accountAlias}</strong>
        </span>
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

      <button className="sirv-btn" type="button" onClick={onDisconnect} disabled={busy}>
        Disconnect
      </button>
    </div>
  );
}

export default SirvSettingsView;
