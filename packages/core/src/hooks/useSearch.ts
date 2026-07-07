import type { BrowseType, SirvClient } from '@sirv/sirv-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { assetFromSearch } from '../assets.js';
import type { DamAsset } from '../types.js';
import { buildSearchQuery } from './search-query.js';

/** Hits fetched per request (Sirv's search caps the page size at ~100). */
const SEARCH_PAGE = 100;

export interface UseSearchOptions {
  /** Active type filters; constrains the query. */
  types?: BrowseType[];
  /** Page size (hits per request). */
  size?: number;
  /** Skip searching (e.g. empty term while browsing folders). */
  enabled?: boolean;
  /** Classify non-media results as `'file'` instead of dropping them. Default false. */
  includeOther?: boolean;
}

export interface UseSearchResult {
  results: DamAsset[];
  /** Total matches reported by the API (across all pages). */
  total: number;
  loading: boolean;
  error?: string;
  /** Whether more results can be loaded. */
  hasMore: boolean;
  loadMore(): void;
}

/**
 * Searches the account for assets matching `term`, constrained to the active types.
 * Uses Sirv's scroll API so every match is reachable (offset paging caps at 1000);
 * `loadMore` fetches the next batch via the scrollId. Stale responses are discarded on
 * rapid term/filter changes. The scroll context expires after ~30s of inactivity; an
 * expired scroll surfaces as an error and stops further paging (re-run the search).
 */
export function useSearch(
  client: SirvClient | undefined,
  term: string,
  options: UseSearchOptions = {},
): UseSearchResult {
  const { types = [], size = SEARCH_PAGE, enabled = true, includeOther = false } = options;
  const [results, setResults] = useState<DamAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [fetched, setFetched] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const requestId = useRef(0);
  // The active scroll context; refs so loadMore reads the latest without a stale closure.
  const scrollIdRef = useRef<string | undefined>(undefined);
  const fetchedRef = useRef(0);
  // Whether the last batch returned hits (an empty batch means the scroll is exhausted).
  const exhaustedRef = useRef(false);

  const typesKey = types.join(',');

  const run = useCallback(
    async (append: boolean) => {
      if (!client || !enabled) return;
      if (append && !scrollIdRef.current) return;
      const id = ++requestId.current;
      setLoading(true);
      setError(undefined);
      try {
        let res: Awaited<ReturnType<SirvClient['searchFiles']>>;
        if (append && scrollIdRef.current) {
          res = await client.searchScroll(scrollIdRef.current);
        } else {
          const query = buildSearchQuery(
            term,
            typesKey ? (typesKey.split(',') as BrowseType[]) : [],
          );
          res = await client.searchFiles({ query, scroll: true, size });
        }
        if (id !== requestId.current) return;
        const mapped = res.hits
          .map((hit) => assetFromSearch(hit._source, includeOther))
          .filter((a): a is DamAsset => a !== null);
        // The scrollId can rotate between batches; keep the freshest one.
        if (res.scrollId) scrollIdRef.current = res.scrollId;
        exhaustedRef.current = res.hits.length === 0;
        const nextFetched = (append ? fetchedRef.current : 0) + res.hits.length;
        fetchedRef.current = nextFetched;
        setFetched(nextFetched);
        setTotal(res.total ?? nextFetched);
        setResults((prev) => (append ? [...prev, ...mapped] : mapped));
      } catch (err) {
        if (id !== requestId.current) return;
        // A failed scroll (often a 30s context expiry) stops paging but keeps what's shown.
        exhaustedRef.current = true;
        setError(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [client, enabled, term, typesKey, size, includeOther],
  );

  useEffect(() => {
    scrollIdRef.current = undefined;
    fetchedRef.current = 0;
    exhaustedRef.current = false;
    if (!enabled) {
      setResults([]);
      setTotal(0);
      setFetched(0);
      return;
    }
    void run(false);
  }, [run, enabled]);

  const loadMore = useCallback(() => {
    if (!loading && scrollIdRef.current && !exhaustedRef.current && fetchedRef.current < total) {
      void run(true);
    }
  }, [loading, total, run]);

  const hasMore = !exhaustedRef.current && fetched > 0 && fetched < total;

  return { results, total, loading, error, hasMore, loadMore };
}
