'use client';

import { useField } from '@payloadcms/ui';
import { useState } from 'react';
import { type SirvMediaValue, damAssetToMediaValue, enrichMediaValue } from '../fields/value.js';
import { SirvBrowserPane } from './SirvBrowserPane.js';
import { readAllowedTypes } from './SirvMediaField.js';
import { SirvModal } from './SirvModal.js';
import { mediaTypeLabel, thumbUrl } from './thumb.js';

interface SirvListFieldProps {
  path: string;
  field?: { label?: unknown; admin?: { custom?: { sirvAllowedTypes?: unknown } } };
  readOnly?: boolean;
}

function fieldLabel(field: SirvListFieldProps['field']): string {
  return typeof field?.label === 'string' ? field.label : 'Sirv media';
}

/**
 * Multi-asset Sirv field (Payload `json` array). Add many assets from the DAM browser (the modal
 * stays open for multi-pick), reorder them by drag-and-drop, and remove individually. Stores an
 * array of frozen `sirvMedia` values.
 */
export function SirvMediaListField(props: SirvListFieldProps) {
  const { path, readOnly } = props;
  const allowedTypes = readAllowedTypes(props.field);
  const { value, setValue } = useField<SirvMediaValue[] | null>({ path });
  const items = value ?? [];
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const removeAt = (index: number) => {
    setValue(items.filter((_, i) => i !== index));
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    setValue(next);
  };

  return (
    <div className="field-type sirv-field-type">
      <div className="sirv-field__label">{fieldLabel(props.field)}</div>

      {items.length > 0 ? (
        <ul className="sirv-gallery">
          {items.map((item, index) => {
            const thumb = thumbUrl(item, 120);
            return (
              <li
                key={`${item.sirvPath}-${index}`}
                className="sirv-gallery__item"
                draggable={!readOnly}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) reorder(dragIndex, index);
                  setDragIndex(null);
                }}
              >
                <div className="sirv-gallery__thumb">
                  {thumb ? (
                    <img src={thumb} alt={item.alt ?? item.sirvPath} />
                  ) : (
                    <span className="sirv-asset-card__badge">{mediaTypeLabel(item)}</span>
                  )}
                </div>
                <span className="sirv-gallery__name" title={item.sirvPath}>
                  {item.sirvPath.split('/').pop()}
                </span>
                {!readOnly ? (
                  <button
                    type="button"
                    className="sirv-gallery__remove"
                    aria-label="Remove"
                    onClick={() => removeAt(index)}
                  >
                    x
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="sirv-muted">No media selected.</p>
      )}

      {!readOnly ? (
        <button type="button" className="sirv-btn sirv-btn--primary" onClick={() => setOpen(true)}>
          Add media
        </button>
      ) : null}

      <SirvModal open={open} onClose={() => setOpen(false)} title="Add Sirv media">
        <SirvBrowserPane
          allowedTypes={allowedTypes}
          multiple
          onPickMany={async (assets, alias) => {
            const mapped = await Promise.all(
              assets.map((a) => enrichMediaValue(damAssetToMediaValue(a, alias))),
            );
            setValue([...(value ?? []), ...mapped]);
            setOpen(false);
          }}
        />
      </SirvModal>
    </div>
  );
}

export default SirvMediaListField;
