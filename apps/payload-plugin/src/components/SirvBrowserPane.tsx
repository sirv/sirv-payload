'use client';

import type { BrowseType, DamAsset } from '@sirv/core';
import { useState } from 'react';
import { SirvDamBrowser } from './SirvDamBrowser.js';
import { useSirvClient } from './adapters/useSirvClient.js';

/**
 * Connection-aware wrapper around the DAM browser used inside a field modal. Provides the live
 * browser `SirvClient` + delivery host from the shared connection, shows loading / not-connected
 * states, and hands picked assets (single or many, plus the resolved delivery alias) to the
 * field. The field maps them to its stored value and closes the modal.
 */
export function SirvBrowserPane({
  allowedTypes,
  multiple,
  onPick,
  onPickMany,
}: {
  allowedTypes?: BrowseType[];
  multiple?: boolean;
  onPick?: (asset: DamAsset, deliveryAlias: string) => void | Promise<void>;
  onPickMany?: (assets: DamAsset[], deliveryAlias: string) => void | Promise<void>;
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

  const alias = deliveryAlias ?? '';
  const handleOne = async (asset: DamAsset) => {
    setBusy(true);
    try {
      await onPick?.(asset, alias);
    } finally {
      setBusy(false);
    }
  };
  const handleMany = async (assets: DamAsset[]) => {
    setBusy(true);
    try {
      await onPickMany?.(assets, alias);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sirv-dam-wrap">
      {busy ? <div className="sirv-dam__busy">Adding...</div> : null}
      <SirvDamBrowser
        client={client}
        alias={alias}
        allowedTypes={allowedTypes}
        multiple={multiple}
        onSelect={handleOne}
        onSelectMany={handleMany}
      />
    </div>
  );
}

export default SirvBrowserPane;
