import { buildUrl, buildVideoPosterUrl } from '@sirv/url-builder';
import { useState } from 'react';
import type { DamAsset } from '../types.js';
import { cx } from './cx.js';

export interface AssetThumbnailProps {
  asset: DamAsset;
  alias: string;
  selected?: boolean;
  onClick(): void;
  size?: number;
  className?: string;
}

const TYPE_BADGE: Partial<Record<DamAsset['type'], string>> = {
  image: '',
  video: 'VIDEO',
  spin: '360',
  view: 'VIEW',
  model: '3D',
};

/** Returns a still thumbnail URL, or null for types Sirv can't render as a static image. */
function thumbnailUrl(asset: DamAsset, alias: string, size: number): string | null {
  const input = { alias, path: asset.path };
  if (asset.type === 'image') {
    return buildUrl(input, { width: size, height: size, scale: 'fit', format: 'optimal' });
  }
  if (asset.type === 'video') {
    return buildVideoPosterUrl(input, { width: size, height: size });
  }
  // Spins and views have no reliable static thumbnail; show a typed placeholder.
  return null;
}

export function AssetThumbnail({
  asset,
  alias,
  selected,
  onClick,
  size = 200,
  className,
}: AssetThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const src = thumbnailUrl(asset, alias, size);
  const showImage = src !== null && !failed;

  return (
    <button
      type="button"
      className={cx('sirv-thumb', selected && 'sirv-thumb--selected', className)}
      onClick={onClick}
      title={asset.name}
      aria-pressed={selected}
    >
      <span className="sirv-thumb__frame">
        {showImage ? (
          <img
            className="sirv-thumb__img"
            src={src}
            alt={asset.name}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="sirv-thumb__placeholder">{TYPE_BADGE[asset.type] || 'FILE'}</span>
        )}
        {TYPE_BADGE[asset.type] ? (
          <span className="sirv-thumb__badge">{TYPE_BADGE[asset.type]}</span>
        ) : null}
      </span>
      <span className="sirv-thumb__name">{asset.name}</span>
    </button>
  );
}
