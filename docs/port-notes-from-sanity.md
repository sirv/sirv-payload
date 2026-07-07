# Port notes: from Sanity/Strapi to Payload

Source of the vendored core: `/Users/igor/Projects/Sirv/extensions/sanity/packages/{url-builder,sirv-client,core}`.
Closest architectural sibling: the Strapi port (server-side host) at
`/Users/igor/Projects/Sirv/extensions/strapi/`.

This is the fifth port. The three `packages/*` are copied verbatim; all the new work is Payload
glue. Read this before writing any Payload code, then keep `DECISIONS.md` current.

---

## 1. Ports unchanged (vendor verbatim, consume as-is)

These three packages carry the entire DAM engine. Copy them into `packages/` unchanged. The
boundary guardrails must forbid `payload` / `@payloadcms/*` imports inside `packages/*` (Biome
`noRestrictedImports` override + `scripts/check-package-boundaries.mjs` + a Vitest assertion),
exactly as Strapi forbids `@strapi/*`.

### `@sirv/url-builder`
- Package: `name` `@sirv/url-builder`, `version` `0.0.0`, `type` `module`, `sideEffects` false.
  **Zero dependencies, zero peerDependencies.** Pure functions, no React, no I/O. Safe on both
  the Payload server and the admin browser.
- Public API (`src/index.ts`):
  - `buildUrl(input: SirvUrlInput, transformations?: Transformations): string`
  - `buildImageUrl(...)`, `buildSrcSet(...)`, `buildVideoUrl(...)`, `buildVideoPosterUrl(...)`,
    `buildSpinUrl(...)`, `buildViewUrl(...)`
  - `type SirvUrlInput` (`{ alias: string; path: string }`)
  - `parseUrl(url: string): ParsedSirvUrl`, `type ParsedSirvUrl`
  - `toQueryParams(t: Transformations): ...`, `type Transformations`, `type SirvFormat`,
    `type ScaleOption`, `type CropType`, `type CropOptions`
- Consumed by: thumbnail/preview URLs in the DAM browser and the `originalUrl` stored in the value
  (`buildUrl({ alias, path })`).

### `@sirv/sirv-client`
- Package: `name` `@sirv/sirv-client`, `version` `0.0.0`, `type` `module`. **Dependency: `zod`
  only. No React peer.** Runs in browser and Node, so it works on the Payload server (connect/
  token endpoints) and in the admin (direct-to-Sirv browsing).
- Factory + client shape (`src/client.ts`):
  ```ts
  createSirvClient(options: SirvClientOptions): SirvClient

  type SirvClientOptions =
    | ({ baseUrl?: string; fetch?: FetchLike } & { clientId: string; clientSecret: string })
    | ({ baseUrl?: string; fetch?: FetchLike } & { accessToken: string });

  interface SirvClient {
    readonly baseUrl: string;
    getToken(): Promise<string>;
    listFolder(params: { dirname: string; continuation?: string }): Promise<ReaddirResponse>;
    searchFiles(params: SearchParams): Promise<SearchResponse>;
    searchScroll(scrollId: string): Promise<SearchResponse>;
    getFileInfo(filename: string): Promise<FileStat>;
    getAccountInfo(): Promise<AccountInfo>;
    getUsage(): Promise<StorageUsage>;
    getBillingPlan(): Promise<BillingPlan>;
  }
  ```
  - `clientId/secret` variant mints + caches a 20-min bearer via `POST /v2/token` and refreshes
    transparently on a 401 (`createTokenManager`, 60s expiry skew, coalesced concurrent mints).
  - `accessToken` variant wraps a pre-issued bearer with **no refresh** (`createStaticTokenManager`,
    `canRefresh: false`). This is the seam Payload's browser will use (see section 2).
- Other public exports (`src/index.ts`):
  - DAM: `listFolder`, `searchFiles`, `getFileInfo`, `type SearchParams`
  - Account: `getAccountInfo`, `getUsage`, `getBillingPlan`,
    `accountAliasOptions(info: AccountInfo): AliasOption[]`, `type AliasOption`
    (`{ alias: string; host: string }` - the delivery-domain picker options)
  - Classification: `classifyAssetType`, `classifyBrowseType`, `AssetTypeSchema`,
    `type AssetType` (`image|video|spin|view|model`), `BrowseTypeSchema`,
    `type BrowseType` (`image|video|spin|view|model|file`)
  - Errors: `SirvApiError` (has `.status`), `OtpRequiredError`, `InvalidCredentialsError`
  - Low-level: `createTokenManager`, `createStaticTokenManager`, `type TokenManager`
    (`{ getToken(force?): Promise<string>; readonly canRefresh: boolean }`), `request`,
    `resolveContext`, `type AuthedRequest`, `type FetchLike`
  - Types/schemas: `SIRV_API_BASE`, `StoredCredentialsSchema`, `type StoredCredentials`
    (`{ clientId; clientSecret; accountAlias; deliveryAlias }`), plus `AccountInfoSchema`,
    `ReaddirResponseSchema`, `SearchResponseSchema`, `FileStatSchema`, `StorageUsageSchema`,
    `BillingPlanSchema`, `FileEntrySchema`, etc.

### `@sirv/core`
- Package: `name` `@sirv/core`, `version` `0.0.0`, `type` `module`. **Dependencies: `@sirv/sirv-client`,
  `@sirv/url-builder`, `zod`. peerDependency: `react` `^18.0.0`.**
  > Payload v3 admin runs on **React 19**. `^18.0.0` does not satisfy 19. Widen this peer to
  > `^18.0.0 || ^19.0.0` in the vendored copy (see `dam-core-extraction-notes.md`). `@sirv/react`
  > already ships that wider range.
- TokenStorage seam (`src/token-storage.ts`):
  ```ts
  interface TokenStorage {
    read(): Promise<StoredCredentials | null>;
    write(credentials: StoredCredentials): Promise<void>;
    clear(): Promise<void>;
  }
  createMemoryTokenStorage(initial?: StoredCredentials | null): TokenStorage // tests only
  ```
- Auth hook (`src/hooks/useSirvAuth.ts`):
  ```ts
  useSirvAuth(options: { storage: TokenStorage; clientOptions?: { baseUrl?; fetch? } }): {
    status: 'loading'|'logged-out'|'selecting-alias'|'connecting'|'connected'|'error';
    error?: string; busy: boolean;
    account?: { alias: string; deliveryAlias?: string };
    client?: SirvClient; deliveryAlias?: string; aliasOptions: AliasOption[];
    connectWithCredentials(clientId: string, clientSecret: string): Promise<void>;
    selectAlias(host: string): Promise<void>;
    logout(): Promise<void>; clearError(): void;
  }
  ```
  Note: this hook expects the **browser** to hold the raw `clientId/secret` (it builds
  `createSirvClient({ clientId, clientSecret })`). Payload's hard constraint forbids that, so
  Payload does **not** drive browsing through `useSirvAuth` (see section 2, and how Strapi also
  bypasses it).
- Data hooks (consumed unchanged, given any `SirvClient`):
  - `useFolders(client: SirvClient | undefined, dirname: string, opts?: { includeOther?: boolean }):
    { folders: DamFolder[]; assets: DamAsset[]; loading; error?; hasMore; loadMore(); reload() }`
  - `useSearch(client, term: string, opts?: { types?: BrowseType[]; size?; enabled?; includeOther? }):
    { results: DamAsset[]; total; loading; error?; hasMore; loadMore() }`
  - `useTypeFilter(allowedTypes?: BrowseType[]):
    { allowed; active; isActive(t); toggle(t); setActive(ts); visible }`
  - `filterAssetsByType(assets: DamAsset[], active: BrowseType[]): DamAsset[]`
  - `buildSearchQuery`, `typeClause`
- Normalizers + types: `folderFromEntry`, `assetFromEntry`, `assetFromSearch`;
  `type DamFolder` (`{ name; path }`), `type DamAsset`
  (`{ type: BrowseType; path; name; contentType?; bytes; width?; height?; durationSec? }`);
  plus the Sanity-era Zod value schemas (`SirvImageValueSchema`, etc.) which Payload will **not**
  use for its stored value (it uses the flat shape below).
- Headless components (emit `sirv-*` CSS classes; host wraps them with chrome + a stylesheet):
  `DamBrowser`, `Breadcrumb`, `SearchBar`, `TypeFilter`, `ThumbnailGrid`, `AssetThumbnail`,
  `AssetPreview` (each with its `*Props` type).
  > In practice Strapi/Contentful/Storyblok did **not** mount the shipped `DamBrowser`; they wired
  > their own chrome directly onto the `useFolders`/`useSearch`/`useTypeFilter` hooks (see Strapi's
  > `SirvDamBrowser.tsx`). Payload should follow that pattern: reuse the hooks, render the grid with
  > `@payloadcms/ui` primitives, keep live spin/view/model previews via `sirv.js`.

### `@sirv/react` (published, frontend only)
- `@sirv/react@0.2.2`, peer `react`/`react-dom` `^18 || ^19`, ships a `'use client'` boundary and
  ESM+CJS+types, plus a `./next` subpath (`sirvLoader`). Use as-is in `examples/payload/`.
- Components: `<SirvImage>`, `<SirvVideo>`, `<SirvSpin>`, `<SirvView>`, `<SirvModel>`,
  `<SirvMedia>` (polymorphic on `_type`), `<SirvGallery layout="separate"|"viewer">`, plus
  `<SirvProvider alias=...>`.
- Value shim: `fromSanityMedia(value: SanityMediaValue): SirvMediaLike`. `SanityMediaValue` is the
  **flat** shape (`{ mediaType, sirvAlias, sirvPath, width?, height?, durationSec?, alt?,
  transformations?, autoplay?, loop?, muted?, controls? }`), which is exactly the value Payload
  stores. Re-export it as a host-neutral `fromStoredMedia` alias in the example (same move as
  Contentful/Storyblok). No transformation layer needed.

---

## 2. Needs Payload-specific adaptation

### 2.1 The token seam - the sharpest divergence

Constraint (CLAUDE.md + `payload-plugin.md`): the **secret never reaches the browser**. The
`sirv-settings` global holds the encrypted credentials; `POST /api/sirv/token` mints the 20-min
bearer server-side; the admin browser then talks to `api.sirv.com` **directly** with that bearer.

This breaks the Sanity assumption behind `useSirvAuth` + `TokenStorage`: that interface returns
`StoredCredentials` (which include `clientSecret`) into the browser. Payload cannot use it that way.
Two host precedents:
- **Strapi** - server proxies every DAM call. `StrapiTokenStorage` is a status-only client;
  browsing uses `createProxyClient(fetchClient): SirvClient` (a `SirvClient`-shaped adapter that
  routes `listFolder`/`searchFiles`/... through `/sirv/dam/*` admin endpoints; `getToken` returns
  `''`). Credentials never leave the server.
- **Payload (spec's choice)** - hybrid: the server mints a bearer; the browser calls Sirv directly.
  So the browser builds `createSirvClient({ accessToken })` (the static-token variant) using a
  bearer fetched from `POST /api/sirv/token`.

**PayloadTokenStore is therefore a bearer *provider*, not a `TokenStorage`.** It does not implement
`read/write/clear` over `StoredCredentials` (that would leak the secret). It exposes something like:
```ts
class PayloadTokenStore {
  async getBearer(): Promise<{ token: string; deliveryAlias: string; expiresAt: number }>;
  // POST /api/sirv/token -> { token, deliveryAlias, expiresIn }
}
```
Because `createStaticTokenManager` has `canRefresh: false`, an expired bearer surfaces as a
`SirvApiError` with `status === 401`. Wrap the client so a 401 (or near-expiry) re-fetches from
`/api/sirv/token` and rebuilds `createSirvClient({ accessToken })`. This wrapper is the genuinely
new bit - see section 3. Cache the bearer with expiry skew, mirroring `createTokenManager`.

### 2.2 Settings global + endpoints (server; no `@sirv/core` imports)

- **`sirv-settings` global**: stores `StoredCredentials` (`clientId`, `clientSecret`,
  `accountAlias`, `deliveryAlias`) encrypted, admin-only access control, and field-level access so
  the secret is never returned to the browser. This mirrors Strapi's plugin store + `encryption`
  service (`server/src/services/{token-storage,encryption}.ts`) and its admin-only routes
  (`admin::isAuthenticatedAdmin` on every `/sirv/*` route).
- **Endpoints** (registered via the plugin config's `endpoints`, all admin-gated):
  - `POST /api/sirv/connect` - body `{ clientId, clientSecret }`. Server calls
    `createSirvClient({ clientId, clientSecret }).getAccountInfo()` to validate, then
    `accountAliasOptions(info)`; returns `{ accountAlias, aliasOptions }` (no secret echoed). If a
    single alias, may connect directly. Persists on alias selection. (Mirrors Strapi
    `auth.connectWithCredentials`.)
  - `POST /api/sirv/token` - reads the stored credentials, mints a bearer via the server-side
    `SirvClient.getToken()`, returns `{ token, deliveryAlias, expiresIn }`. Never returns the secret.
  - `GET /api/sirv/status` - `{ connected: boolean; accountAlias?; deliveryAlias? }` for the
    settings view (Strapi `settings.find` / `getStatus`).
  - `POST /api/sirv/disconnect` - clears the global (Strapi `auth.logout`).
- **Server keeps zero `@sirv/core` imports** (it is a React-hooks package; the App-Router server
  half must stay free of it). Use `@sirv/sirv-client` + `@sirv/url-builder` only on the server.

### 2.3 Field factories (vs Strapi's custom field type)

Strapi registers a single custom **field type** (`registerCustomField`, uid
`plugin::sirv.sirv-media`) with one input component. Payload has no custom-field registry; instead
each field is a **factory returning a standard Payload field config** with custom admin components:
```ts
sirvMediaField({ name, allowedTypes? })  -> { name, type: 'json',  admin: { components: { Field, Cell } } }
sirvMediaListField({ name, allowedTypes? }) -> { name, type: 'json',  admin: { components: { Field, Cell } } } // array value
sirvAssetUrlField({ name, allowedTypes? })  -> { name, type: 'text',  admin: { components: { Field, Cell } } }
```
- `Field` opens the DAM browser modal (the reused `@sirv/core` hooks + `@payloadcms/ui` chrome +
  a `sirv-*` stylesheet), writes the stored value, and edits alt/caption; `Cell` renders a
  list-view thumbnail. `allowedTypes` feeds `useTypeFilter`.
- `sirvMediaListField` adds multi-select + drag-reorder (the cheap UX win, already proven in
  Contentful/Storyblok).

### 2.4 Admin chrome via `@payloadcms/ui`

Replace Strapi's `@strapi/design-system` / `@strapi/icons` with `@payloadcms/ui`. All interactive
components are `'use client'`. Keep the `sirv-*` class contract and ship the stylesheet. Reuse the
`sirv.js` live-embed pattern (`loadSirvJs`/`startSirv`) for spin/view/video/model previews.

### 2.5 Import-map / path-string component registration (new to this series)

Payload resolves admin components by **import-path string** through the host's import map, not by
direct import. Register components as strings like
`'@sirv/payload-plugin/client#SirvMediaField'`, ship a `./client` subpath export from the package,
and document that installers must run **`payload generate:importmap`** after install (and the
example app must run it too). None of Sanity/Strapi/Contentful/Storyblok has this indirection.

---

## 3. Genuinely new (no analogue in the four prior ports)

1. **Bearer-provider client wrapper.** `createSirvClient` accepts only `clientId/secret` (mints via
   Sirv) or a static `accessToken` (no refresh). Payload needs a third mode: "refresh the bearer by
   calling `POST /api/sirv/token`." Implement it app-side as a wrapper around
   `createSirvClient({ accessToken })` that re-fetches on `SirvApiError.status === 401` / near
   expiry. (Flag upstream: `sirv-client` could grow a `{ tokenProvider: () => Promise<string> }`
   option - noted for `@sirv/dam-core`.) Strapi sidestepped this by proxying; Sanity/Contentful/
   Storyblok held the secret client-side, so neither hit this case.
2. **Payload import-map indirection** for admin components (2.5) - a registration mechanism unique
   to Payload v3's App-Router admin.
3. **React 19 admin host** - first port on React 19; requires widening the `@sirv/core` react peer
   and re-verifying the hooks/components under RSC + `'use client'` boundaries (see extraction
   notes).

Everything else (connect flow, encrypted server store, admin-only endpoints, flat stored value,
`@sirv/react` frontend, boundary guardrails) has a direct precedent in Strapi and/or Contentful.

---

## 4. Stored value shape (frozen flat `sirvMedia` JSON)

Payload stores the **flat** shape used by Storyblok/Contentful and read directly by `@sirv/react`'s
`fromSanityMedia`. Copy `value.ts` from
`/Users/igor/Projects/Sirv/extensions/storyblok/apps/storyblok-plugin/src/value.ts` (rename Storyblok
references). Exact keys:

```jsonc
{
  "_type": "sirvMedia",                 // literal marker (parity / migrations)
  "mediaType": "image",                 // "image" | "video" | "spin" | "view" | "model"
  "sirvPath": "/products/shoe-01.jpg",  // absolute path in the account
  "sirvAlias": "demo.sirv.com",         // chosen delivery host
  "originalUrl": "https://demo.sirv.com/products/shoe-01.jpg", // buildUrl({alias,path})
  "bytes": 48213,
  "width": 1200,                        // optional (image/video)
  "height": 800,                        // optional (image/video)
  "durationSec": 12.4,                  // optional (video)
  "frameCount": 0,                      // optional (spin)
  "format": "jpg",                      // optional (extension)
  "alt": "",                            // optional; auto-filled from Sirv ?info title (image)
  "caption": "",                        // optional; auto-filled from ?info description
  "transformations": {                  // optional
    "quality": 82,
    "format": "auto"                    // "auto" | "webp" | "avif" | "jpeg" | "png"
  },
  "autoplay": false,                    // optional (video)
  "loop": false,                        // optional (video)
  "muted": false,                       // optional (video)
  "controls": true                      // optional (video)
}
```

- `sirvMediaField` stores one such object; `sirvMediaListField` stores an ordered **array** of them;
  `sirvAssetUrlField` stores a plain **string** (the delivery URL, `damAssetToUrl(asset, alias)`),
  and is the only field that may pick generic `file` assets (PDF/zip).
- Builders to port from `value.ts`: `damAssetToMediaValue(asset, alias)`, `enrichMediaValue(value)`
  (Sirv `?info` -> alt/caption), `damAssetToUrl(asset, alias)`, plus `SirvMediaValueSchema` /
  `SirvMediaListSchema` (Zod, on every boundary).

> Drift caution: the **Strapi** port's `custom-fields/sirv-media/value.ts` uses an **older nested**
> shape (`_type: 'sirv.image'`, `asset: { sirvPath, sirvAlias, ... }`). Do **not** copy that one.
> Payload must use the flat `sirvMedia` shape above (the frozen series contract per
> `payload-plugin.md` and Contentful `DECISIONS.md`), which `@sirv/react` consumes with no converter.

---

## 5. Porting method to reuse (from Contentful `DECISIONS.md` + Storyblok `PORTING-GUIDE.md`)

- Keep a running **`DECISIONS.md`** in the Contentful format: a "Kickoff key questions (defaults
  taken)" block, "Architectural notes", then one dated **Milestone N - DONE** section each, ending
  with a "verified green: boundaries, lint, typecheck, test" line and an "Outstanding / for live
  verification" tail.
- Keep this **port-notes** doc in the Storyblok `PORTING-GUIDE.md` spirit: an explicit "what to
  REUSE" vs "what is host-SPECIFIC" split, a mapping table (Sanity concept -> Payload equivalent),
  a "UX improvements (do if cheap)" list, suggested milestones with `[DONE]` + Evidence lines, and
  a "Definition of done".
- **Boundary guardrails** (copy Strapi's approach, retarget to Payload): `biome.json` override on
  `packages/**` with `noRestrictedImports` listing `payload` + `@payloadcms/*`; a
  `scripts/check-package-boundaries.mjs` walking `packages/` for any `payload`/`@payloadcms/*`
  specifier (regex like `/(?:from|import|require)\s*\(?\s*['"](payload|@payloadcms\/[^'"]+)['"]/g`);
  and a Vitest test asserting the script finds zero violations so `pnpm test` enforces it.
