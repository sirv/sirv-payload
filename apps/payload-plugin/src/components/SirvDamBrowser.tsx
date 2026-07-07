'use client';

import { type BrowseType, type DamAsset, DamBrowser } from '@sirv/core';
import { useState } from 'react';
import { useSirvClient } from './adapters/useSirvClient.js';

/**
 * The Sirv DAM browser as used inside a Payload field modal. Wraps the headless `@sirv/core`
 * DamBrowser with a live browser `SirvClient` and hands the picked `DamAsset` (plus the resolved
 * delivery host) to the field via `onPick`, which decides how to map/store it. When the account
 * is not connected it points the editor at the settings view.
 */
export function SirvDamBrowser({
  allowedTypes,
  onPick,
  onClose,
  closeOnPick = true,
}: {
  allowedTypes?: BrowseType[];
  onPick: (asset: DamAsset, deliveryAlias: string) => void | Promise<void>;
  onClose: () => void;
  /** Close the modal after a pick. Set false for multi-select galleries. */
  closeOnPick?: boolean;
}) {
  const { client, connected, deliveryAlias, loading, error } = useSirvClient();
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="sirv-muted">Loading Sirv...</p>;
  if (error) return <p className="sirv-dam__error">{error}</p>;

  if (!connected) {
    return (
      <div className="sirv-empty">
        <p>Sirv is not connected yet.</p>
        <a className="sirv-btn sirv-btn--primary" href="/admin/sirv">
          Open Sirv settings
        </a>
      </div>
    );
  }

  const handleSelect = async (asset: DamAsset) => {
    setBusy(true);
    try {
      await onPick(asset, deliveryAlias ?? '');
      if (closeOnPick) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sirv-dam-wrap">
      {busy ? <div className="sirv-dam__busy">Adding...</div> : null}
      <DamBrowser
        client={client}
        alias={deliveryAlias}
        allowedTypes={allowedTypes}
        onSelect={handleSelect}
      />
    </div>
  );
}

export default SirvDamBrowser;
