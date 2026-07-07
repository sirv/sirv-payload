import type { DamAsset, DamFolder } from '../types.js';
import { AssetThumbnail } from './AssetThumbnail.js';
import { cx } from './cx.js';

export interface ThumbnailGridProps {
  folders: DamFolder[];
  assets: DamAsset[];
  alias: string;
  selectedPath?: string;
  onOpenFolder(folder: DamFolder): void;
  onSelectAsset(asset: DamAsset): void;
  loading?: boolean;
  emptyLabel?: string;
  hasMore?: boolean;
  onLoadMore?(): void;
  className?: string;
}

export function ThumbnailGrid({
  folders,
  assets,
  alias,
  selectedPath,
  onOpenFolder,
  onSelectAsset,
  loading,
  emptyLabel = 'Nothing here.',
  hasMore,
  onLoadMore,
  className,
}: ThumbnailGridProps) {
  const isEmpty = folders.length === 0 && assets.length === 0;

  return (
    <div className={cx('sirv-grid', className)}>
      <div className="sirv-grid__items">
        {folders.map((folder) => (
          <button
            key={folder.path}
            type="button"
            className="sirv-grid__folder"
            onClick={() => onOpenFolder(folder)}
            title={folder.name}
          >
            <span className="sirv-grid__folder-icon" aria-hidden="true">
              {/* folder glyph supplied by host CSS */}
            </span>
            <span className="sirv-grid__folder-name">{folder.name}</span>
          </button>
        ))}
        {assets.map((asset) => (
          <AssetThumbnail
            key={asset.path}
            asset={asset}
            alias={alias}
            selected={asset.path === selectedPath}
            onClick={() => onSelectAsset(asset)}
          />
        ))}
      </div>

      {isEmpty && !loading ? <p className="sirv-grid__empty">{emptyLabel}</p> : null}
      {loading ? (
        <p className="sirv-grid__loading" aria-busy="true">
          Loading...
        </p>
      ) : null}
      {hasMore && onLoadMore ? (
        <button type="button" className="sirv-grid__more" onClick={onLoadMore} disabled={loading}>
          Load more
        </button>
      ) : null}
    </div>
  );
}
