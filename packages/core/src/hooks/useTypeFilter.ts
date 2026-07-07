import type { BrowseType } from '@sirv/sirv-client';
import { useCallback, useMemo, useState } from 'react';
import type { DamAsset } from '../types.js';

/** Filters assets down to the active types (empty active set means "no filter"). */
export function filterAssetsByType(assets: DamAsset[], active: BrowseType[]): DamAsset[] {
  if (active.length === 0) return assets;
  const set = new Set(active);
  return assets.filter((a) => set.has(a.type));
}

export interface UseTypeFilterResult {
  /** Types the field permits, after de-duplication. */
  allowed: BrowseType[];
  /** Currently active types (subset of allowed). */
  active: BrowseType[];
  isActive(type: BrowseType): boolean;
  toggle(type: BrowseType): void;
  setActive(types: BrowseType[]): void;
  /** Whether the filter UI should render at all (hidden when only one type is allowed). */
  visible: boolean;
}

/** Full browse universe, including the generic-file category. */
const ALL_TYPES: BrowseType[] = ['image', 'video', 'spin', 'view', 'model', 'file'];
/** Default when a field does not constrain types: the four media types (never generic files). */
const DEFAULT_TYPES: BrowseType[] = ['image', 'video', 'spin', 'view', 'model'];

/**
 * Manages the DAM type-filter chips. `allowedTypes` restricts what a field accepts; the
 * filter starts with all allowed types active and is hidden when only one is allowed. Generic
 * files (`'file'`) are only ever allowed when a caller explicitly opts in.
 */
export function useTypeFilter(allowedTypes?: BrowseType[]): UseTypeFilterResult {
  const allowed = useMemo(() => {
    const source = allowedTypes && allowedTypes.length > 0 ? allowedTypes : DEFAULT_TYPES;
    return ALL_TYPES.filter((t) => source.includes(t));
  }, [allowedTypes]);

  const [active, setActiveState] = useState<BrowseType[]>(allowed);

  const setActive = useCallback(
    (types: BrowseType[]) => setActiveState(allowed.filter((t) => types.includes(t))),
    [allowed],
  );

  const toggle = useCallback(
    (type: BrowseType) =>
      setActiveState((prev) =>
        prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
      ),
    [],
  );

  const isActive = useCallback((type: BrowseType) => active.includes(type), [active]);

  return {
    allowed,
    active,
    isActive,
    toggle,
    setActive,
    visible: allowed.length > 1,
  };
}
