'use client';

import { useField } from '@payloadcms/ui';
import type { BrowseType } from '@sirv/core';
import { buildUrl } from '@sirv/url-builder';
import { useState } from 'react';
import { SirvBrowserPane } from './SirvBrowserPane.js';
import { SirvModal } from './SirvModal.js';

interface SirvUrlFieldProps {
  path: string;
  field?: { label?: unknown; admin?: { custom?: { sirvAllowedTypes?: unknown } } };
  readOnly?: boolean;
}

/** All browse types including generic files - the default for the URL field. */
const ALL_BROWSE_TYPES: BrowseType[] = ['image', 'video', 'spin', 'view', 'model', 'file'];

function readBrowseTypes(field: SirvUrlFieldProps['field']): BrowseType[] {
  const t = field?.admin?.custom?.sirvAllowedTypes;
  return Array.isArray(t) && t.length > 0 ? (t as BrowseType[]) : ALL_BROWSE_TYPES;
}

function fieldLabel(field: SirvUrlFieldProps['field']): string {
  return typeof field?.label === 'string' ? field.label : 'Sirv asset URL';
}

/**
 * URL Sirv field (Payload `text`). Picks any asset - including generic files (PDF/zip) - from
 * the DAM browser and stores its delivery URL string. The value stays hand-editable.
 */
export function SirvAssetUrlField(props: SirvUrlFieldProps) {
  const { path, readOnly } = props;
  const browseTypes = readBrowseTypes(props.field);
  const { value, setValue } = useField<string | null>({ path });
  const [open, setOpen] = useState(false);

  return (
    <div className="field-type sirv-field-type">
      <div className="sirv-field__label">{fieldLabel(props.field)}</div>
      <div className="sirv-row">
        <input
          className="sirv-input"
          value={value ?? ''}
          disabled={readOnly}
          placeholder="https://your-alias.sirv.com/path/to/asset"
          onChange={(e) => setValue(e.target.value)}
        />
        {!readOnly ? (
          <button type="button" className="sirv-btn" onClick={() => setOpen(true)}>
            Browse
          </button>
        ) : null}
      </div>

      <SirvModal open={open} onClose={() => setOpen(false)} title="Pick a Sirv asset">
        <SirvBrowserPane
          allowedTypes={browseTypes}
          onPick={(asset, alias) => {
            setValue(buildUrl({ alias, path: asset.path }));
            setOpen(false);
          }}
        />
      </SirvModal>
    </div>
  );
}

export default SirvAssetUrlField;
