'use client';

import { useField } from '@payloadcms/ui';
import type { AssetType } from '@sirv/core';
import { useState } from 'react';
import { type SirvMediaValue, damAssetToMediaValue, enrichMediaValue } from '../fields/value.js';
import { SirvDamBrowser } from './SirvDamBrowser.js';
import { SirvModal } from './SirvModal.js';
import { mediaTypeLabel, thumbUrl } from './thumb.js';

interface SirvFieldProps {
  path: string;
  field?: { label?: unknown; admin?: { custom?: { sirvAllowedTypes?: unknown } } };
  readOnly?: boolean;
}

/** Reads the per-field `allowedTypes` restriction stashed by the factory in `admin.custom`. */
export function readAllowedTypes(field: SirvFieldProps['field']): AssetType[] | undefined {
  const t = field?.admin?.custom?.sirvAllowedTypes;
  return Array.isArray(t) ? (t as AssetType[]) : undefined;
}

function fieldLabel(field: SirvFieldProps['field']): string {
  return typeof field?.label === 'string' ? field.label : 'Sirv media';
}

/**
 * Single-asset Sirv field (Payload `json`). Opens the DAM browser to pick one asset, stores the
 * frozen `sirvMedia` value, shows a thumbnail preview, and allows inline alt/caption editing for
 * images and videos.
 */
export function SirvMediaField(props: SirvFieldProps) {
  const { path, readOnly } = props;
  const allowedTypes = readAllowedTypes(props.field);
  const { value, setValue } = useField<SirvMediaValue | null>({ path });
  const [open, setOpen] = useState(false);

  const thumb = value ? thumbUrl(value) : null;
  const showText = value?.mediaType === 'image' || value?.mediaType === 'video';

  return (
    <div className="field-type sirv-field-type">
      <div className="sirv-field__label">{fieldLabel(props.field)}</div>

      {value ? (
        <div className="sirv-asset-card">
          <div className="sirv-asset-card__thumb">
            {thumb ? (
              <img src={thumb} alt={value.alt ?? value.sirvPath} />
            ) : (
              <span className="sirv-asset-card__badge">{mediaTypeLabel(value)}</span>
            )}
          </div>
          <div className="sirv-asset-card__meta">
            <code className="sirv-code">{value.sirvPath}</code>
            <span className="sirv-muted">
              {mediaTypeLabel(value)}
              {value.width && value.height ? ` - ${value.width}x${value.height}` : ''}
            </span>

            {showText ? (
              <div className="sirv-asset-card__fields">
                <label className="sirv-field">
                  <span className="sirv-field__label">Alt text</span>
                  <input
                    className="sirv-input"
                    value={value.alt ?? ''}
                    disabled={readOnly}
                    onChange={(e) => setValue({ ...value, alt: e.target.value })}
                  />
                </label>
                <label className="sirv-field">
                  <span className="sirv-field__label">Caption</span>
                  <input
                    className="sirv-input"
                    value={value.caption ?? ''}
                    disabled={readOnly}
                    onChange={(e) => setValue({ ...value, caption: e.target.value })}
                  />
                </label>
              </div>
            ) : null}

            {!readOnly ? (
              <div className="sirv-row">
                <button type="button" className="sirv-btn" onClick={() => setOpen(true)}>
                  Replace
                </button>
                <button type="button" className="sirv-btn" onClick={() => setValue(null)}>
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="sirv-btn sirv-btn--primary"
          onClick={() => setOpen(true)}
          disabled={readOnly}
        >
          Pick from Sirv
        </button>
      )}

      <SirvModal open={open} onClose={() => setOpen(false)} title="Pick Sirv media">
        <SirvDamBrowser
          allowedTypes={allowedTypes}
          onPick={async (asset, alias) => {
            setValue(await enrichMediaValue(damAssetToMediaValue(asset, alias)));
          }}
          onClose={() => setOpen(false)}
        />
      </SirvModal>
    </div>
  );
}

export default SirvMediaField;
