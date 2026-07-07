import { getAccountInfo, getBillingPlan, getUsage } from './account.js';
import { type SearchParams, getFileInfo, listFolder, searchFiles, searchScroll } from './dam.js';
import { SirvApiError } from './errors.js';
import { type AuthedRequest, type FetchLike, request, resolveContext } from './http.js';
import {
  type TokenManager,
  createStaticTokenManager,
  createTokenManager,
} from './token-manager.js';
import type {
  AccountInfo,
  BillingPlan,
  FileStat,
  ReaddirResponse,
  SearchResponse,
  StorageUsage,
} from './types.js';

interface CommonOptions {
  baseUrl?: string;
  fetch?: FetchLike;
}

/**
 * Either the user's durable per-account REST credentials (the product flow) or a
 * pre-issued bearer. The bootstrap/dev clientId+secret use the same credential shape.
 */
export type SirvClientOptions =
  | (CommonOptions & { clientId: string; clientSecret: string })
  | (CommonOptions & { accessToken: string });

export interface SirvClient {
  readonly baseUrl: string;
  /** Returns a currently-valid bearer (minted/cached as needed). */
  getToken(): Promise<string>;
  listFolder(params: { dirname: string; continuation?: string }): Promise<ReaddirResponse>;
  searchFiles(params: SearchParams): Promise<SearchResponse>;
  /** Next batch of a scrolling search (see searchFiles `scroll`). */
  searchScroll(scrollId: string): Promise<SearchResponse>;
  getFileInfo(filename: string): Promise<FileStat>;
  getAccountInfo(): Promise<AccountInfo>;
  getUsage(): Promise<StorageUsage>;
  getBillingPlan(): Promise<BillingPlan>;
}

export function createSirvClient(options: SirvClientOptions): SirvClient {
  const ctx = resolveContext(options);
  const tokens: TokenManager =
    'accessToken' in options
      ? createStaticTokenManager(options.accessToken)
      : createTokenManager(ctx, options);

  // Inject auth and transparently re-mint once on a 401.
  const authedRequest: AuthedRequest = async (path, init) => {
    const token = await tokens.getToken();
    try {
      return await request(ctx, path, { ...init, token });
    } catch (err) {
      if (err instanceof SirvApiError && err.status === 401 && tokens.canRefresh) {
        const fresh = await tokens.getToken(true);
        return request(ctx, path, { ...init, token: fresh });
      }
      throw err;
    }
  };

  return {
    baseUrl: ctx.baseUrl,
    getToken: () => tokens.getToken(),
    listFolder: (params) => listFolder(authedRequest, params),
    searchFiles: (params) => searchFiles(authedRequest, params),
    searchScroll: (scrollId) => searchScroll(authedRequest, scrollId),
    getFileInfo: (filename) => getFileInfo(authedRequest, filename),
    getAccountInfo: () => getAccountInfo(authedRequest),
    getUsage: () => getUsage(authedRequest),
    getBillingPlan: () => getBillingPlan(authedRequest),
  };
}
