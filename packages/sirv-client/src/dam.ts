import type { AuthedRequest } from './http.js';
import {
  type FileStat,
  FileStatSchema,
  type ReaddirResponse,
  ReaddirResponseSchema,
  type SearchResponse,
  SearchResponseSchema,
} from './types.js';

/** Lists a folder's immediate contents. Pass `continuation` from a prior page to paginate. */
export async function listFolder(
  req: AuthedRequest,
  params: { dirname: string; continuation?: string },
): Promise<ReaddirResponse> {
  const raw = await req('/files/readdir', {
    query: { dirname: params.dirname, continuation: params.continuation },
  });
  return ReaddirResponseSchema.parse(raw);
}

export interface SearchParams {
  /** Lucene query, e.g. "contentType:image*" or "extension:.spin". */
  query: string;
  from?: number;
  size?: number;
  /** Optional sort spec passed through to the search API. */
  sort?: unknown;
  /**
   * Start a scrolling search. The response carries a `scrollId`; pass it to searchScroll()
   * to page through all results (offset paging is capped at 1000; scroll is not). The scroll
   * context lives ~30s between calls.
   */
  scroll?: boolean;
}

/** Searches files across the account. Offset-paginated via from/size (max 1000 deep). */
export async function searchFiles(
  req: AuthedRequest,
  params: SearchParams,
): Promise<SearchResponse> {
  const raw = await req('/files/search', {
    method: 'POST',
    body: {
      query: params.query,
      from: params.from ?? 0,
      size: params.size ?? 50,
      ...(params.sort !== undefined ? { sort: params.sort } : {}),
      ...(params.scroll ? { scroll: true } : {}),
    },
  });
  return SearchResponseSchema.parse(raw);
}

/** Fetches the next batch of a scrolling search started with `searchFiles({ scroll: true })`. */
export async function searchScroll(req: AuthedRequest, scrollId: string): Promise<SearchResponse> {
  const raw = await req('/files/search/scroll', { method: 'POST', body: { scrollId } });
  return SearchResponseSchema.parse(raw);
}

/** Fetches computed metadata for a single file by absolute path. */
export async function getFileInfo(req: AuthedRequest, filename: string): Promise<FileStat> {
  const raw = await req('/files/stat', { query: { filename } });
  return FileStatSchema.parse(raw);
}
