import { z } from 'zod';

export const SIRV_API_BASE = 'https://api.sirv.com/v2';

/**
 * The durable secret persisted by the host (Sanity secrets store, etc.) via the
 * TokenStorage seam. These are the user's per-account REST credentials, obtained
 * once through the connect flow (email + password + OTP + account pick). Once stored,
 * the connect flow is skipped: bearer tokens are minted on demand from clientId/secret
 * via POST /v2/token. There is no refresh token in Sirv. See docs/architecture.md.
 */
export const StoredCredentialsSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  accountAlias: z.string(),
  accountId: z.string().optional(),
  /** Chosen delivery host for building asset URLs, e.g. "demo.sirv.com" or a custom domain. */
  deliveryAlias: z.string().optional(),
  /** Optional cache of the last minted bearer; ephemeral (~20 min), always re-mintable. */
  cachedToken: z
    .object({
      accessToken: z.string(),
      /** Epoch millis when accessToken expires. */
      expiresAt: z.number(),
    })
    .optional(),
});
export type StoredCredentials = z.infer<typeof StoredCredentialsSchema>;

// --- Connect flow (POST /v2/user/accounts -> GET /v2/rest/credentials) ---

/**
 * One account returned by the connect lookup. `alias` is the primary identifier (the API
 * may omit `accountId`); `token` is the short-lived account token used to fetch REST
 * credentials. Verified against the live /v2/user/accounts response.
 */
export const AccountWithTokenSchema = z
  .object({
    alias: z.string(),
    accountId: z.string().optional(),
    role: z.string().optional(),
    active: z.boolean().optional(),
    token: z.string().optional(),
  })
  .passthrough();
export type AccountWithToken = z.infer<typeof AccountWithTokenSchema>;

/** The user's durable per-account REST credentials (GET /v2/rest/credentials). */
export const RestCredentialsSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
});
export type RestCredentials = z.infer<typeof RestCredentialsSchema>;

/** A connectable account after role filtering, surfaced to the Account Picker UI. */
export const SirvAccountSchema = z.object({
  alias: z.string(),
  accountId: z.string().optional(),
  role: z.string().optional(),
});
export type SirvAccount = z.infer<typeof SirvAccountSchema>;

// --- DAM (computed metadata reported by the API) ---

// Sirv returns `null` (not just absent) for these on files without dimensions/duration,
// so accept null and normalize it to undefined - the output type stays number/string|undefined.
const nullableNumber = z
  .number()
  .nullish()
  .transform((v) => v ?? undefined);
const nullableString = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

/** Sirv-computed media metadata attached to image/video files. */
export const FileMetaSchema = z
  .object({
    width: nullableNumber,
    height: nullableNumber,
    /** Seconds; 0 for images. */
    duration: nullableNumber,
    /** Present in search results, absent in stat. */
    format: nullableString,
  })
  .passthrough();
export type FileMeta = z.infer<typeof FileMetaSchema>;

/** One entry from GET /v2/files/readdir (filename is a basename). */
export const FileEntrySchema = z.object({
  filename: z.string(),
  mtime: z.string().optional(),
  contentType: z.string().optional(),
  size: z.number(),
  isDirectory: z.boolean(),
  meta: FileMetaSchema.optional(),
});
export type FileEntry = z.infer<typeof FileEntrySchema>;

export const ReaddirResponseSchema = z.object({
  contents: z.array(FileEntrySchema),
  continuation: z.string().nullish(),
});
export type ReaddirResponse = z.infer<typeof ReaddirResponseSchema>;

/** GET /v2/files/stat. */
export const FileStatSchema = z.object({
  mtime: z.string().optional(),
  ctime: z.string().optional(),
  contentType: z.string().optional(),
  size: z.number(),
  isDirectory: z.boolean(),
  meta: FileMetaSchema.optional(),
});
export type FileStat = z.infer<typeof FileStatSchema>;

/** The _source payload of a POST /v2/files/search hit (filename is a full path). */
export const SearchSourceSchema = z
  .object({
    filename: z.string(),
    dirname: z.string().optional(),
    basename: z.string().optional(),
    extension: z.string().optional(),
    id: z.string().optional(),
    size: z.number().optional(),
    ctime: z.string().optional(),
    mtime: z.string().optional(),
    contentType: z.string().optional(),
    meta: FileMetaSchema.optional(),
  })
  .passthrough();
export type SearchSource = z.infer<typeof SearchSourceSchema>;

export const SearchHitSchema = z
  .object({
    _id: z.string().optional(),
    _source: SearchSourceSchema,
  })
  .passthrough();

export const SearchResponseSchema = z.object({
  hits: z.array(SearchHitSchema),
  total: z.number().optional(),
  _relation: z.string().optional(),
  /** Returned when the request set `scroll: true`; pass to searchScroll for the next batch. */
  scrollId: z.string().optional(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// --- Account & usage ---

/** Subset of GET /v2/account we rely on; the rest passes through untyped. */
export const AccountInfoSchema = z
  .object({
    alias: z.string(),
    cdnURL: z.string().optional(),
    cdnTempURL: z.string().optional(),
    aliases: z.record(z.unknown()).optional(),
    status: z.unknown().optional(),
  })
  .passthrough();
export type AccountInfo = z.infer<typeof AccountInfoSchema>;

/** GET /v2/account/storage (all values are bytes except `files`). */
export const StorageUsageSchema = z
  .object({
    plan: z.number(),
    burstable: z.number().optional(),
    extra: z.number().optional(),
    used: z.number(),
    files: z.number(),
    quotaExceededDate: z.string().nullable().optional(),
  })
  .passthrough();
export type StorageUsage = z.infer<typeof StorageUsageSchema>;

/** GET /v2/billing/plan (subset). */
export const BillingPlanSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    period: z.string().optional(),
    storage: z.number().optional(),
    burstableStorage: z.number().optional(),
  })
  .passthrough();
export type BillingPlan = z.infer<typeof BillingPlanSchema>;
