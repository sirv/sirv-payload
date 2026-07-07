'use client';

import { useState } from 'react';
import type { SirvMediaValue } from '../fields/value.js';
import { mediaTypeLabel, thumbUrl } from './thumb.js';

/**
 * Thumbnail for a stored media value with a graceful fallback: renders the Sirv poster, or a
 * type badge if there is no thumbnail or the poster fails to load (spin/video/view/model posters
 * are not always available).
 */
export function SirvThumb({
  value,
  size = 240,
  imgClassName,
  badgeClassName = 'sirv-asset-card__badge',
}: {
  value: SirvMediaValue;
  size?: number;
  imgClassName?: string;
  badgeClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = thumbUrl(value, size);
  if (!src || failed) {
    return <span className={badgeClassName}>{mediaTypeLabel(value)}</span>;
  }
  return (
    <img
      className={imgClassName}
      src={src}
      alt={value.alt ?? value.sirvPath}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export default SirvThumb;
