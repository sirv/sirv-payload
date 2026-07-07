'use client';

import type { SirvMediaValue } from '../fields/value.js';
import { mediaTypeLabel, thumbUrl } from './thumb.js';

/** List-view cell: a small thumbnail (or type badge) for a stored `sirvMedia` value. */
export function SirvMediaCell(props: { cellData?: SirvMediaValue | null }) {
  const value = props.cellData;
  if (!value) return <span className="sirv-muted">-</span>;
  const thumb = thumbUrl(value, 48);
  return (
    <span className="sirv-cell">
      {thumb ? (
        <img className="sirv-cell__thumb" src={thumb} alt={value.alt ?? ''} />
      ) : (
        <span className="sirv-cell__badge">{mediaTypeLabel(value)}</span>
      )}
    </span>
  );
}

export default SirvMediaCell;
