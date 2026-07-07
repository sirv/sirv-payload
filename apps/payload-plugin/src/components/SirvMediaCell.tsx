'use client';

import type { SirvMediaValue } from '../fields/value.js';
import { SirvThumb } from './SirvThumb.js';

/** List-view cell: a small thumbnail (or type badge) for a stored `sirvMedia` value. */
export function SirvMediaCell(props: { cellData?: SirvMediaValue | null }) {
  const value = props.cellData;
  if (!value) return <span className="sirv-muted">-</span>;
  return (
    <span className="sirv-cell">
      <SirvThumb
        value={value}
        size={48}
        imgClassName="sirv-cell__thumb"
        badgeClassName="sirv-cell__badge"
      />
    </span>
  );
}

export default SirvMediaCell;
