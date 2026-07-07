import type { SirvClient } from '@sirv/sirv-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { assetFromEntry, folderFromEntry } from '../assets.js';
import type { DamAsset, DamFolder } from '../types.js';

export interface UseFoldersResult {
  folders: DamFolder[];
  assets: DamAsset[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
  loadMore(): void;
  reload(): void;
}

export interface UseFoldersOptions {
  /** Surface generic non-media files (PDF/zip) as `'file'` assets. Default false. */
  includeOther?: boolean;
}

/** Hide Sirv system/hidden entries (.Trash, .processed, dotfiles). */
function isHidden(name: string): boolean {
  return name.startsWith('.');
}

/** Natural, case-insensitive alphanumeric sort by display name ("file2" before "file10"). */
function byName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

/**
 * Cap on entries scanned per load. Sirv's readdir is paginated at 100/page; we follow the
 * continuation token across pages so folders/files past the first page are not lost. Beyond
 * this cap, search is the right tool (and "Load more" fetches the next batch).
 */
const MAX_ENTRIES_PER_LOAD = 2500;

/**
 * Lists a directory's contents (subfolders + supported assets), normalized to DamFolder/
 * DamAsset, with cursor pagination via the readdir `continuation` token. Despite the name
 * it returns both folders and assets, since readdir yields them in one call.
 */
export function useFolders(
  client: SirvClient | undefined,
  dirname: string,
  options: UseFoldersOptions = {},
): UseFoldersResult {
  const { includeOther = false } = options;
  const [folders, setFolders] = useState<DamFolder[]>([]);
  const [assets, setAssets] = useState<DamAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [continuation, setContinuation] = useState<string | undefined>();

  // Identifies the active request so stale responses (after a folder change) are ignored.
  const requestId = useRef(0);

  const load = useCallback(
    async (startCursor: string | undefined, append: boolean) => {
      if (!client) return;
      const id = ++requestId.current;
      setLoading(true);
      setError(undefined);
      try {
        const newFolders: DamFolder[] = [];
        const newAssets: DamAsset[] = [];
        let cursor = startCursor;
        let scanned = 0;
        // Follow the continuation token across pages (readdir is 100/page) so entries past
        // the first page are not dropped. Stop at the cap; a remaining cursor means there is
        // more (surfaced via hasMore / "Load more").
        do {
          const res = await client.listFolder({ dirname, continuation: cursor });
          if (id !== requestId.current) return; // superseded by a newer request
          for (const entry of res.contents) {
            scanned++;
            if (isHidden(entry.filename)) continue;
            const folder = folderFromEntry(entry, dirname);
            if (folder) {
              newFolders.push(folder);
              continue;
            }
            const asset = assetFromEntry(entry, dirname, includeOther);
            if (asset) newAssets.push(asset);
          }
          cursor = res.continuation ?? undefined;
        } while (cursor && scanned < MAX_ENTRIES_PER_LOAD);

        setFolders((prev) => byName(append ? [...prev, ...newFolders] : newFolders));
        setAssets((prev) => byName(append ? [...prev, ...newAssets] : newAssets));
        setContinuation(cursor);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : 'Failed to list folder.');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [client, dirname, includeOther],
  );

  // Reset and load the first page whenever the client or folder changes.
  useEffect(() => {
    setFolders([]);
    setAssets([]);
    setContinuation(undefined);
    void load(undefined, false);
  }, [load]);

  const loadMore = useCallback(() => {
    if (continuation && !loading) void load(continuation, true);
  }, [continuation, loading, load]);

  const reload = useCallback(() => void load(undefined, false), [load]);

  return {
    folders,
    assets,
    loading,
    error,
    hasMore: continuation != null,
    loadMore,
    reload,
  };
}
