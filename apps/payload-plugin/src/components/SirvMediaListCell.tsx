'use client';

import type { SirvMediaValue } from '../fields/value.js';
import { SirvThumb } from './SirvThumb.js';

/** List-view cell: a small thumbnail strip for a stored `sirvMedia` array. */
export function SirvMediaListCell(props: { cellData?: SirvMediaValue[] | null }) {
  const items = props.cellData ?? [];
  if (items.length === 0) return <span className="sirv-muted">-</span>;
  const shown = items.slice(0, 4);
  return (
    <span className="sirv-cell sirv-cell--strip">
      {shown.map((item, i) => (
        <SirvThumb
          key={`${item.sirvPath}-${i}`}
          value={item}
          size={48}
          imgClassName="sirv-cell__thumb"
          badgeClassName="sirv-cell__badge"
        />
      ))}
      {items.length > shown.length ? (
        <span className="sirv-cell__more">+{items.length - shown.length}</span>
      ) : null}
    </span>
  );
}

export default SirvMediaListCell;
