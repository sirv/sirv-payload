import type { BrowseType, SirvClient } from '@sirv/sirv-client';
import { useEffect, useState } from 'react';
import { useFolders } from '../hooks/useFolders.js';
import { useSearch } from '../hooks/useSearch.js';
import { filterAssetsByType, useTypeFilter } from '../hooks/useTypeFilter.js';
import type { DamAsset, DamFolder } from '../types.js';
import { AssetPreview } from './AssetPreview.js';
import { Breadcrumb } from './Breadcrumb.js';
import { SearchBar } from './SearchBar.js';
import { ThumbnailGrid } from './ThumbnailGrid.js';
import { TypeFilter } from './TypeFilter.js';
import { cx } from './cx.js';

export interface DamBrowserProps {
  client: SirvClient;
  /** Restricts the type-filter chips and what can be picked. Defaults to all four types.
   * Include `'file'` to also surface generic non-media files (PDF/zip). */
  allowedTypes?: BrowseType[];
  rootPath?: string;
  onSelect(asset: DamAsset): void;
  onClose?(): void;
  /** Account alias for building thumbnails; fetched from the client when omitted. */
  alias?: string;
  className?: string;
}

/**
 * The DAM browser: folder navigation + search + type filtering + thumbnail grid + single
 * asset preview/confirm. Headless - host apps provide chrome and style the `sirv-*` classes.
 */
export function DamBrowser({
  client,
  allowedTypes,
  rootPath = '/',
  onSelect,
  onClose,
  alias: aliasProp,
  className,
}: DamBrowserProps) {
  const [path, setPath] = useState(rootPath);
  const [term, setTerm] = useState('');
  const [preview, setPreview] = useState<DamAsset | null>(null);
  const [alias, setAlias] = useState(aliasProp ?? '');
  const typeFilter = useTypeFilter(allowedTypes);
  const includeOther = typeFilter.allowed.includes('file');

  // Resolve the alias (for thumbnail URLs) from the client if not supplied.
  useEffect(() => {
    if (aliasProp) {
      setAlias(aliasProp);
      return;
    }
    let cancelled = false;
    client
      .getAccountInfo()
      .then((info) => {
        // Delivery host is the CDN URL (e.g. "igor.sirv.com"), not the bare alias ("igor").
        const host =
          info.cdnURL ?? (info.alias.includes('.') ? info.alias : `${info.alias}.sirv.com`);
        if (!cancelled) setAlias(host);
      })
      .catch(() => {
        /* thumbnails degrade gracefully without an alias */
      });
    return () => {
      cancelled = true;
    };
  }, [client, aliasProp]);

  const searching = term.trim().length > 0;
  const folderState = useFolders(client, path, { includeOther });
  const searchState = useSearch(client, term, {
    types: typeFilter.active,
    enabled: searching,
    includeOther,
  });

  const folders: DamFolder[] = searching ? [] : folderState.folders;
  const assets = filterAssetsByType(
    searching ? searchState.results : folderState.assets,
    typeFilter.active,
  );
  const loading = searching ? searchState.loading : folderState.loading;
  const error = searching ? searchState.error : folderState.error;

  const navigate = (next: string) => {
    setTerm('');
    setPreview(null);
    setPath(next);
  };

  if (preview) {
    return (
      <AssetPreview
        className={className}
        asset={preview}
        alias={alias}
        onConfirm={onSelect}
        onClose={() => setPreview(null)}
      />
    );
  }

  return (
    <div className={cx('sirv-dam', className)}>
      <div className="sirv-dam__toolbar">
        <SearchBar value={term} onChange={setTerm} />
        {typeFilter.visible ? (
          <TypeFilter
            allowed={typeFilter.allowed}
            active={typeFilter.active}
            onToggle={typeFilter.toggle}
          />
        ) : null}
        {onClose ? (
          <button type="button" className="sirv-dam__close" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>

      {searching ? null : <Breadcrumb path={path} onNavigate={navigate} />}
      {error ? (
        <p className="sirv-dam__error" role="alert">
          {error}
        </p>
      ) : null}

      <ThumbnailGrid
        folders={folders}
        assets={assets}
        alias={alias}
        onOpenFolder={(folder) => navigate(folder.path)}
        onSelectAsset={(asset) => setPreview(asset)}
        loading={loading}
        emptyLabel={searching ? 'No matching assets.' : 'This folder is empty.'}
        hasMore={!searching && folderState.hasMore}
        onLoadMore={folderState.loadMore}
      />
    </div>
  );
}
