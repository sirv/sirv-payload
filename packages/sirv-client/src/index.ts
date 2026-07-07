export { createSirvClient, type SirvClient, type SirvClientOptions } from './client.js';

// DAM + account methods (also usable standalone with an AuthedRequest)
export { listFolder, searchFiles, getFileInfo, type SearchParams } from './dam.js';
export {
  getAccountInfo,
  getUsage,
  getBillingPlan,
  accountAliasOptions,
  type AliasOption,
} from './account.js';

// Asset classification
export {
  classifyAssetType,
  classifyBrowseType,
  AssetTypeSchema,
  type AssetType,
  BrowseTypeSchema,
  type BrowseType,
} from './asset-type.js';

// Errors
export { SirvApiError, OtpRequiredError, InvalidCredentialsError } from './errors.js';

// Low-level building blocks
export {
  createTokenManager,
  createStaticTokenManager,
  type TokenManager,
} from './token-manager.js';
export { request, resolveContext, type AuthedRequest, type FetchLike } from './http.js';

// Types & schemas
export {
  SIRV_API_BASE,
  StoredCredentialsSchema,
  AccountWithTokenSchema,
  RestCredentialsSchema,
  SirvAccountSchema,
  FileMetaSchema,
  FileEntrySchema,
  ReaddirResponseSchema,
  FileStatSchema,
  SearchSourceSchema,
  SearchHitSchema,
  SearchResponseSchema,
  AccountInfoSchema,
  StorageUsageSchema,
  BillingPlanSchema,
  type StoredCredentials,
  type AccountWithToken,
  type RestCredentials,
  type SirvAccount,
  type FileMeta,
  type FileEntry,
  type ReaddirResponse,
  type FileStat,
  type SearchSource,
  type SearchResponse,
  type AccountInfo,
  type StorageUsage,
  type BillingPlan,
} from './types.js';
