'use client';

import {
  type BrowseType,
  type DamAsset,
  type DamFolder,
  filterAssetsByType,
  useFolders,
  useSearch,
  useTypeFilter,
} from '@sirv/core';
import type { SirvClient } from '@sirv/sirv-client';
import { buildUrl } from '@sirv/url-builder';
import { useEffect, useState } from 'react';
import { FolderIcon, HomeIcon } from './dam/icons.js';
import { loadSirvJs, startSirv } from './dam/sirvjs.js';

const THUMB = 200;

const TYPE_DISPLAY: Record<BrowseType, string> = {
  image: 'Image',
  video: 'Video',
  spin: '360 Spin',
  view: 'Sirv Media Viewer',
  model: '3D Model',
  file: 'File',
};

/** The canonical (untransformed) Sirv URL for an asset. */
function assetUrl(asset: DamAsset, alias: string): string {
  return buildUrl({ alias, path: asset.path });
}

/** Static thumbnail URL per type (null for view/model/file, which get a typed placeholder). */
function thumbUrl(asset: DamAsset, alias: string): string | null {
  if (!alias) return null;
  const input = { alias, path: asset.path };
  switch (asset.type) {
    case 'image':
      return buildUrl(input, { width: THUMB, height: THUMB, scale: 'fit', format: 'optimal' });
    case 'video':
      return buildUrl(input, { extras: { thumbnail: THUMB } });
    case 'spin':
      return buildUrl(input, { width: THUMB, height: THUMB, extras: { image: 24 } });
    default:
      return null;
  }
}

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const segs = path.split('/').filter(Boolean);
  const crumbs = [
    { name: 'Home', path: '/' },
    ...segs.map((s, i) => ({ name: s, path: `/${segs.slice(0, i + 1).join('/')}` })),
  ];
  return (
    <nav className="sirv-breadcrumb" aria-label="Folder path">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.path}>
            <button
              type="button"
              className="sirv-breadcrumb__link"
              disabled={last}
              onClick={() => onNavigate(c.path)}
              title={i === 0 ? 'Home' : c.name}
            >
              {i === 0 ? <HomeIcon /> : c.name}
            </button>
            {last ? null : <span className="sirv-breadcrumb__sep">/</span>}
          </span>
        );
      })}
    </nav>
  );
}

function FolderCard({ folder, onOpen }: { folder: DamFolder; onOpen: () => void }) {
  return (
    <button type="button" className="sirv-dam-card sirv-dam-card--folder" onClick={onOpen}>
      <span className="sirv-dam-card__frame sirv-dam-card__folder-icon">
        <FolderIcon />
      </span>
      <span className="sirv-dam-card__name" title={folder.name}>
        {folder.name}
      </span>
    </button>
  );
}

function AssetCard({
  asset,
  alias,
  selected,
  onClick,
}: {
  asset: DamAsset;
  alias: string;
  selected?: boolean;
  onClick: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = thumbUrl(asset, alias);
  return (
    <button
      type="button"
      className={`sirv-dam-card${selected ? ' sirv-dam-card--selected' : ''}`}
      onClick={onClick}
    >
      {selected ? <span className="sirv-dam-card__check">✓</span> : null}
      {asset.type !== 'image' ? (
        <span className="sirv-dam-card__badge">{TYPE_DISPLAY[asset.type]}</span>
      ) : null}
      <span className="sirv-dam-card__frame">
        {src && !failed ? (
          <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        ) : (
          <span className="sirv-dam-card__type">{TYPE_DISPLAY[asset.type]}</span>
        )}
      </span>
      <span className="sirv-dam-card__name" title={asset.name}>
        {asset.name}
      </span>
    </button>
  );
}

/** Live sirv.js embed for spins, views and 3D models (interactive preview). */
function LiveEmbed({ url }: { url: string }) {
  useEffect(() => {
    loadSirvJs();
    startSirv();
  }, []);
  return <div className="Sirv" data-src={url} style={{ width: '100%', height: 380 }} />;
}

function Preview({
  asset,
  alias,
  onConfirm,
  onBack,
}: {
  asset: DamAsset;
  alias: string;
  onConfirm: (a: DamAsset) => void;
  onBack: () => void;
}) {
  const url = assetUrl(asset, alias);
  const interactive = asset.type === 'spin' || asset.type === 'view' || asset.type === 'model';
  const imageSrc =
    asset.type === 'image' && alias
      ? buildUrl({ alias, path: asset.path }, { width: 640, format: 'optimal' })
      : null;
  const videoPoster = alias
    ? buildUrl({ alias, path: asset.path }, { extras: { thumbnail: 640 } })
    : undefined;

  return (
    <div className="sirv-preview">
      <div className="sirv-preview__stage">
        {interactive ? (
          <LiveEmbed key={url} url={url} />
        ) : asset.type === 'video' ? (
          // biome-ignore lint/a11y/useMediaCaption: source assets have no caption track
          <video src={url} poster={videoPoster} controls preload="metadata" />
        ) : imageSrc ? (
          <img src={imageSrc} alt={asset.name} />
        ) : (
          <span className="sirv-muted">{TYPE_DISPLAY[asset.type]}</span>
        )}
      </div>

      <div>
        <strong>{asset.name}</strong>
        <p className="sirv-muted">
          {TYPE_DISPLAY[asset.type]}
          {asset.width && asset.height ? ` - ${asset.width}x${asset.height}` : ''}
        </p>
      </div>

      <div className="sirv-preview__actions">
        <button type="button" className="sirv-btn" onClick={onBack}>
          Back
        </button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="sirv-btn sirv-btn--primary"
          onClick={() => onConfirm(asset)}
        >
          Use this asset
        </button>
      </div>
    </div>
  );
}

export interface SirvDamBrowserProps {
  client: SirvClient;
  /** Account delivery host for thumbnails, e.g. "igor.sirv.com". */
  alias: string;
  allowedTypes?: BrowseType[];
  /** When set, the browser lets the user pick several assets and confirm them together. */
  multiple?: boolean;
  onSelect(asset: DamAsset): void;
  onSelectMany?(assets: DamAsset[]): void;
}

/**
 * The Sirv DAM browser, driven by the `@sirv/core` data hooks (folders, search, type filter).
 * Folder navigation with a breadcrumb, a two-row toolbar (search, then type-filter chips), a
 * thumbnail grid with per-type previews (image/video/spin), single-asset preview-and-confirm,
 * and multi-select with a confirm bar for gallery fields.
 */
export function SirvDamBrowser({
  client,
  alias,
  allowedTypes,
  multiple,
  onSelect,
  onSelectMany,
}: SirvDamBrowserProps) {
  const [path, setPath] = useState('/');
  const [term, setTerm] = useState('');
  const [preview, setPreview] = useState<DamAsset | null>(null);
  const [selected, setSelected] = useState<DamAsset[]>([]);
  const typeFilter = useTypeFilter(allowedTypes);
  const includeOther = typeFilter.allowed.includes('file');

  const searching = term.trim().length > 0;
  const folderState = useFolders(client, path, { includeOther });
  const searchState = useSearch(client, term, {
    types: typeFilter.active,
    enabled: searching,
    includeOther,
  });

  const isSelected = (a: DamAsset) => selected.some((s) => s.path === a.path);
  const toggleSelected = (a: DamAsset) =>
    setSelected((prev) =>
      prev.some((s) => s.path === a.path) ? prev.filter((s) => s.path !== a.path) : [...prev, a],
    );
  const onCardClick = (a: DamAsset) => (multiple ? toggleSelected(a) : setPreview(a));

  const folders = searching ? [] : folderState.folders;
  const assets = filterAssetsByType(
    searching ? searchState.results : folderState.assets,
    typeFilter.active,
  );
  const loading = searching ? searchState.loading : folderState.loading;
  const error = searching ? searchState.error : folderState.error;
  const empty = folders.length === 0 && assets.length === 0;

  const navigate = (next: string) => {
    setTerm('');
    setPreview(null);
    setPath(next);
  };

  if (preview) {
    return (
      <div className="sirv-dam">
        <Preview
          asset={preview}
          alias={alias}
          onConfirm={onSelect}
          onBack={() => setPreview(null)}
        />
      </div>
    );
  }

  return (
    <div className="sirv-dam">
      <div className="sirv-dam__toolbar">
        <input
          className="sirv-input sirv-dam__search"
          placeholder="Search this account..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        {typeFilter.visible ? (
          <div className="sirv-type-filter">
            {typeFilter.allowed.map((t) => {
              const active = typeFilter.active.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`sirv-type-filter__chip${active ? ' sirv-type-filter__chip--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => typeFilter.toggle(t)}
                >
                  {TYPE_DISPLAY[t]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {searching ? null : <Breadcrumb path={path} onNavigate={navigate} />}

      {error ? (
        <p className="sirv-dam__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="sirv-grid__items">
        {folders.map((f) => (
          <FolderCard key={f.path} folder={f} onOpen={() => navigate(f.path)} />
        ))}
        {assets.map((a) => (
          <AssetCard
            key={a.path}
            asset={a}
            alias={alias}
            selected={multiple ? isSelected(a) : undefined}
            onClick={() => onCardClick(a)}
          />
        ))}
      </div>

      {loading ? <p className="sirv-grid__loading">Loading...</p> : null}
      {empty && !loading ? (
        <p className="sirv-grid__empty">
          {searching ? 'No matching assets.' : 'This folder is empty.'}
        </p>
      ) : null}

      {(searching ? searchState.hasMore : folderState.hasMore) ? (
        <button
          type="button"
          className="sirv-btn sirv-grid__more"
          disabled={loading}
          onClick={searching ? searchState.loadMore : folderState.loadMore}
        >
          Load more
        </button>
      ) : null}

      {multiple ? (
        <div className="sirv-multibar">
          <span className="sirv-muted">{selected.length} selected</span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="sirv-btn"
            disabled={selected.length === 0}
            onClick={() => setSelected([])}
          >
            Clear
          </button>
          <button
            type="button"
            className="sirv-btn sirv-btn--primary"
            disabled={selected.length === 0}
            onClick={() => onSelectMany?.(selected)}
          >
            {selected.length === 1 ? 'Add 1 asset' : `Add ${selected.length} assets`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default SirvDamBrowser;
