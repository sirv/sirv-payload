'use client';

import type { SirvMediaValue } from '../fields/value.js';
import { mediaTypeLabel, thumbUrl } from './thumb.js';

/** List-view cell: a small thumbnail strip for a stored `sirvMedia` array. */
export function SirvMediaListCell(props: { cellData?: SirvMediaValue[] | null }) {
  const items = props.cellData ?? [];
  if (items.length === 0) return <span className="sirv-muted">-</span>;
  const shown = items.slice(0, 4);
  return (
    <span className="sirv-cell sirv-cell--strip">
      {shown.map((item, i) => {
        const thumb = thumbUrl(item, 48);
        return thumb ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: preview strip, order is identity
          <img key={i} className="sirv-cell__thumb" src={thumb} alt={item.alt ?? ''} />
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: preview strip, order is identity
          <span key={i} className="sirv-cell__badge">
            {mediaTypeLabel(item)}
          </span>
        );
      })}
      {items.length > shown.length ? (
        <span className="sirv-cell__more">+{items.length - shown.length}</span>
      ) : null}
    </span>
  );
}

export default SirvMediaListCell;
