import {
  type FileEntry,
  type SearchSource,
  classifyAssetType,
  classifyBrowseType,
} from '@sirv/sirv-client';
import type { DamAsset, DamFolder } from './types.js';

/** Joins a parent dir and a basename into an absolute path. */
function joinPath(parent: string, name: string): string {
  const base = parent.endsWith('/') ? parent.slice(0, -1) : parent;
  return `${base}/${name}`;
}

function basename(path: string): string {
  const clean = path.endsWith('/') ? path.slice(0, -1) : path;
  const slash = clean.lastIndexOf('/');
  return slash === -1 ? clean : clean.slice(slash + 1);
}

/** Maps a readdir directory entry to a DamFolder (returns null for non-directories). */
export function folderFromEntry(entry: FileEntry, parentPath: string): DamFolder | null {
  if (!entry.isDirectory) return null;
  return { name: entry.filename, path: joinPath(parentPath, entry.filename) };
}

/**
 * Maps a readdir file entry (filename is a basename) to a DamAsset, or null if it is a
 * directory or an unsupported type. With `includeOther`, non-media files are classified as
 * `'file'` instead of being skipped (file-field / sirvAssetUrl pickers).
 */
export function assetFromEntry(
  entry: FileEntry,
  parentPath: string,
  includeOther = false,
): DamAsset | null {
  if (entry.isDirectory) return null;
  const input = { filename: entry.filename, contentType: entry.contentType };
  const type = includeOther ? classifyBrowseType(input) : classifyAssetType(input);
  if (!type) return null;
  return {
    type,
    path: joinPath(parentPath, entry.filename),
    name: entry.filename,
    contentType: entry.contentType,
    bytes: entry.size,
    width: entry.meta?.width,
    height: entry.meta?.height,
    durationSec: entry.meta?.duration,
  };
}

/**
 * Maps a search hit `_source` (filename is a full path) to a DamAsset, or null. With
 * `includeOther`, non-media files are classified as `'file'` instead of being skipped.
 */
export function assetFromSearch(source: SearchSource, includeOther = false): DamAsset | null {
  const input = {
    filename: source.filename,
    extension: source.extension,
    contentType: source.contentType,
  };
  const type = includeOther ? classifyBrowseType(input) : classifyAssetType(input);
  if (!type) return null;
  return {
    type,
    path: source.filename,
    name: source.basename ?? basename(source.filename),
    contentType: source.contentType,
    bytes: source.size ?? 0,
    width: source.meta?.width,
    height: source.meta?.height,
    durationSec: source.meta?.duration,
  };
}
