// Token storage seam
export { type TokenStorage, createMemoryTokenStorage } from './token-storage.js';

// Types & schemas
export {
  AssetTypeSchema,
  type AssetType,
  BrowseTypeSchema,
  type BrowseType,
  type DamFolder,
  type DamAsset,
  SirvAssetBaseSchema,
  type SirvAssetBase,
  ImageTransformationsSchema,
  type ImageTransformations,
  SirvImageValueSchema,
  type SirvImageValue,
  SirvVideoValueSchema,
  type SirvVideoValue,
  SirvSpinValueSchema,
  type SirvSpinValue,
  SirvViewValueSchema,
  type SirvViewValue,
  SirvFieldValueSchema,
  type SirvFieldValue,
} from './types.js';

// Asset mappers
export { folderFromEntry, assetFromEntry, assetFromSearch } from './assets.js';

// Hooks
export {
  useSirvAuth,
  type UseSirvAuthOptions,
  type UseSirvAuthResult,
  type SirvAuthStatus,
  type ConnectedAccount,
} from './hooks/useSirvAuth.js';
export type { AliasOption } from '@sirv/sirv-client';
export {
  useFolders,
  type UseFoldersResult,
  type UseFoldersOptions,
} from './hooks/useFolders.js';
export { useSearch, type UseSearchOptions, type UseSearchResult } from './hooks/useSearch.js';
export {
  useTypeFilter,
  filterAssetsByType,
  type UseTypeFilterResult,
} from './hooks/useTypeFilter.js';
export { buildSearchQuery, typeClause } from './hooks/search-query.js';

// Components (headless)
export { DamBrowser, type DamBrowserProps } from './components/DamBrowser.js';
export { Breadcrumb, type BreadcrumbProps } from './components/Breadcrumb.js';
export { SearchBar, type SearchBarProps } from './components/SearchBar.js';
export { TypeFilter, type TypeFilterProps } from './components/TypeFilter.js';
export { ThumbnailGrid, type ThumbnailGridProps } from './components/ThumbnailGrid.js';
export { AssetThumbnail, type AssetThumbnailProps } from './components/AssetThumbnail.js';
export { AssetPreview, type AssetPreviewProps } from './components/AssetPreview.js';
