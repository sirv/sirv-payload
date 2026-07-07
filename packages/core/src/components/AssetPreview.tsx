import { buildUrl, buildVideoPosterUrl } from '@sirv/url-builder';
import type { DamAsset } from '../types.js';
import { cx } from './cx.js';

export interface AssetPreviewProps {
  asset: DamAsset;
  alias: string;
  onConfirm(asset: DamAsset): void;
  onClose(): void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

function previewUrl(asset: DamAsset, alias: string): string | null {
  const input = { alias, path: asset.path };
  if (asset.type === 'image') return buildUrl(input, { width: 640, format: 'optimal' });
  if (asset.type === 'video') return buildVideoPosterUrl(input, { width: 640 });
  return null;
}

/** Single-asset preview with metadata and a confirm action. */
export function AssetPreview({ asset, alias, onConfirm, onClose, className }: AssetPreviewProps) {
  const src = previewUrl(asset, alias);

  return (
    <div className={cx('sirv-preview', className)}>
      <div className="sirv-preview__media">
        {src ? (
          <img className="sirv-preview__img" src={src} alt={asset.name} />
        ) : (
          <div className="sirv-preview__placeholder">{asset.type.toUpperCase()}</div>
        )}
      </div>
      <dl className="sirv-preview__meta">
        <dt>Name</dt>
        <dd>{asset.name}</dd>
        <dt>Type</dt>
        <dd>{asset.type}</dd>
        {asset.width && asset.height ? (
          <>
            <dt>Dimensions</dt>
            <dd>
              {asset.width} x {asset.height}
            </dd>
          </>
        ) : null}
        {asset.durationSec ? (
          <>
            <dt>Duration</dt>
            <dd>{asset.durationSec}s</dd>
          </>
        ) : null}
        <dt>Size</dt>
        <dd>{formatBytes(asset.bytes)}</dd>
      </dl>
      <div className="sirv-preview__actions">
        <button type="button" onClick={onClose}>
          Back
        </button>
        <button type="button" className="sirv-preview__confirm" onClick={() => onConfirm(asset)}>
          Use this asset
        </button>
      </div>
    </div>
  );
}
