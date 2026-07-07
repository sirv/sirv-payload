# Decisions log - Sirv for Payload CMS

Running record of every decision made during the autonomous build, so it can be reviewed and
corrected later. Method copied from the Contentful project. Newest milestones appended at the
bottom. Anything marked NEEDS LIVE VERIFICATION has no credentialed/live confirmation in this
environment and must be checked by Igor.

## Pre-made decisions (from the spec - do not relitigate without a note here)

1. **Hybrid token flow.** The client secret never reaches the browser. Credentials live in the
   `sirv-settings` Payload global (field-level encryption via `beforeChange`/`afterRead` hooks,
   admin-only access, secret excluded from `afterRead`). A plugin endpoint `POST /api/sirv/token`
   mints the 20-min bearer server-side; the admin browser then talks to `api.sirv.com` directly
   with that bearer only. This is safer than Sanity/Contentful (which hold the secret client-side)
   and cheaper than Strapi (which proxies every DAM call through the server).

2. **Field factories, not a field registry.** Payload has no custom-field-type registry. The
   plugin exports typed factories returning standard Payload field configs:
   - `sirvMediaField({ name, allowedTypes? })` -> `json` field, single frozen `sirvMedia` object.
   - `sirvMediaListField({ name, allowedTypes? })` -> `json` field, array of `sirvMedia` objects.
   - `sirvAssetUrlField({ name, allowedTypes? })` -> `text` field, delivery URL string.
   Each attaches custom `admin.components.Field` and (where relevant) `Cell`, referenced by
   import-path strings and resolved via the host's import map (`payload generate:importmap`).

3. **Vendored shared packages.** Copy `packages/{sirv-client,url-builder,core}` verbatim from the
   Sanity monorepo (`/Users/igor/Projects/Sirv/extensions/sanity/packages/`). They stay
   framework-agnostic: zero `payload` / `@payloadcms/*` imports, enforced by three guardrails
   (Biome `noRestrictedImports`, `scripts/check-package-boundaries.mjs`, a Vitest assertion),
   retargeted from the Contentful/Strapi originals.

4. **No storage adapter in MVP.** This is a DAM picker, not an upload-storage replacement.
   `@sirv/payload-storage` (Payload's public storage-adapter interface) is a v1.1 roadmap item,
   not MVP. Same reasoning as Strapi's upload-provider rejection.

5. **Stored value = frozen flat `sirvMedia` JSON.** No Payload-specific value schema. Consumed by
   `@sirv/react` via the same `fromStoredMedia` shim as the Contentful example. Keys below.

6. **Asset/media types:** image, video, spin (`.spin`), view (`.view`), model (`.glb`), plus
   generic file in URL mode - matching the shipped Sanity plugin, not the older four-type spec.

## Frozen `sirvMedia` value shape (the contract)

Flat JSON, identical to the four shipped plugins (verified against Storyblok `value.ts`, read by
`@sirv/react`'s `fromSanityMedia`):

```
_type: 'sirvMedia'
mediaType: 'image' | 'video' | 'spin' | 'view' | 'model'
sirvPath: string          // account-relative path, e.g. /folder/asset.jpg
sirvAlias: string         // delivery host, e.g. igor.sirv.com
originalUrl: string       // full delivery URL
bytes: number
width?, height?, durationSec?, frameCount?, format?
alt?, caption?
transformations?: { quality?, format? }
autoplay?, loop?, muted?, controls?   // video/spin playback flags
```

- Single field stores one object; list field stores an array; URL field stores `originalUrl`
  as a plain string.
- Do NOT copy Strapi's older nested `sirv.image` shape - that is drift. Use the flat shape.

## Defaults taken during M0 (research)

1. **Minimum Payload version -> peer `^3.37.0` (floor), engines `<4`.** Current stable is v3.85.2
   (2026-07-01); the 3.x line ships frequent backward-compatible releases. `^3.37.0` is a safe
   widely-available floor; bump if the example-app CI needs a newer API. Target v3 only; v4 has no
   stable/beta tag yet and is not a blocker. (Exact minor that froze each API surface: NEEDS
   VERIFICATION - see `docs/payload-gotchas.md`.)

2. **Two-entry export split.** The package ships `.` (server-safe: plugin fn, global, endpoints,
   field CONFIG objects - `@sirv/sirv-client` + `@sirv/url-builder` only, never `@sirv/core`) and
   `./client` (`'use client'` Field/Cell/View components wrapping `@sirv/core`). Matches how
   official `@payloadcms/*` plugins split. Component path strings look like
   `'@sirv/payload-plugin/client#SirvMediaField'`. The one-way boundary (server entry must not
   import client/`@sirv/core`) is added to the boundary guardrail.

3. **Widen `@sirv/core` React peer to `^18 || ^19`.** Payload v3 admin requires React 19 + Next
   15. `@sirv/core` currently declares `react ^18.0.0`; this is the first port on React 19, so the
   vendored copy's peer range is widened. `@sirv/sirv-client` and `@sirv/url-builder` have no React
   peer, so they are unaffected. (Payload's exact internal React pin: NEEDS VERIFICATION.)

4. **Bearer-provider seam is the one genuinely new piece.** `createSirvClient({ accessToken })`
   has no "refresh via my endpoint" mode, and the shared `TokenStorage` interface leaks
   `clientSecret` into the browser - so Payload does NOT use `TokenStorage` or `useSirvAuth`
   (same call as Strapi). Instead an app-side `PayloadTokenStore`/token-provider wraps
   `createSirvClient({ accessToken })` and re-fetches from `POST /api/sirv/token` on
   `SirvApiError.status === 401` or near-expiry. Cache the bearer with an expiry skew on both
   sides, mirroring the shared `createTokenManager`.

5. **Settings UI = custom admin view at `/admin/sirv`,** registered by the plugin: connect flow
   (paste Client ID + Secret -> validate via `GET /v2/account` -> pick delivery domain, auto if
   single), status, disconnect. Plus the DAM browser as a standalone browse page. The custom
   admin VIEW is the highest v4-migration-risk surface - isolate it behind a thin adapter.

6. **Endpoints (Web Request/Response handlers, unauthenticated by default -> guard on `req.user`):**
   - `POST /api/sirv/connect` - body `{ clientId, clientSecret }`; validates via `GET /v2/account`;
     writes the encrypted global; returns `{ accountAlias, aliases }` (never the secret).
   - `POST /api/sirv/token` - reads stored credentials, mints a bearer via `POST /v2/token`,
     returns `{ token, expiresIn }` only.
   - `GET /api/sirv/status` - `{ connected, accountAlias?, deliveryAlias? }` for the settings view.
   - `POST /api/sirv/disconnect` - clears the global.

7. **Alt/caption source.** Sirv `GET /v2/files/meta` `description` is the documented image alt-text
   field; `title` is the natural caption. Computed dims (`width`/`height`/`duration`) come from
   `stat`/`search` `meta`. Auto-fill on pick, editable inline. (Both reachable via `<url>?info`.)

8. **Asset-type classification is extension-first** for `.spin` / `.view` / `.glb`, because `.spin`
   and `.view` both report `contentType: application/json`; never classify spin/view/model by
   contentType. Provided by the vendored `classifyAssetType` - no new logic.

## Architectural notes

- The connect flow in the vendored `@sirv/core` is already the paste-clientId/secret variant; the
  legacy email/password/OTP flow and the embedded bootstrap credential were already removed
  upstream in Sanity. Nothing to strip; nothing to reintroduce.
- `@sirv/core` ships HEADLESS React components (`DamBrowser`, `AssetPreview`, `ThumbnailGrid`,
  `TypeFilter`, ...) emitting `sirv-*` CSS classes. The Payload plugin provides `@payloadcms/ui`
  chrome + a stylesheet for those classes, and feeds them a `SirvClient` built from a bearer
  (not from `useSirvAuth`).
- Payload v3 admin is Next.js App Router (RSC by default). All interactive components are
  `'use client'`; the server half (config/global/endpoints/field-config objects) must never import
  `@sirv/core` or React-client code. Custom components are referenced by path string and resolved
  by the host import map, which the README must instruct users to regenerate
  (`payload generate:importmap`) after install/upgrade (it does not regenerate after a production
  build).
- Because Payload v3 lives inside Next.js, the frontend renderer is trivial: the same app hosting
  Payload renders stored values via the published `@sirv/react`, no transformation layer beyond
  the `fromStoredMedia` alias.

## `@sirv/dam-core` extraction

- This is the FIFTH vendor copy. The extraction threshold is long passed, but per the spec we
  vendor here anyway (velocity, consistency) and only FLAG extraction findings. Payload-specific
  factors that would affect a future `@sirv/dam-core` (React 19 peer, RSC/`'use client'`
  boundaries, the two-entry server/client split, the bearer-provider seam that `TokenStorage` does
  not model) are captured in `docs/dam-core-extraction-notes.md`. The extraction itself is a
  separate future project across all five repos - not done here.

## Milestone 0 (read and decide, no code) - DONE (2026-07-07)

- Read the full spec (`payload-plugin.md`) and `.claude/CLAUDE.md`.
- Read the Sirv REST API docs (`/Users/igor/www/sirv/sirv/rest-api/docs-next/`, incl.
  `llms-full.txt`, `md/`, `openapi.json`); cross-checked auto-generated placeholder examples
  against the vendored `sirv-client` Zod schemas and the Sanity project's live-captured shapes.
  Wrote `docs/sirv-api-notes.md` (token / account / readdir / search / meta, with real shapes).
- Read the Payload v3 docs (plugins/build-your-own, custom-components + import map, fields, JSON,
  text, globals, endpoints, admin views, access control) plus release-status research. Wrote
  `docs/payload-gotchas.md` answering: minimum version, import-map resolution, RSC/`'use client'`
  split, React 19 peer compatibility, and v4-beta migration risks.
- Studied the sister repos end-to-end: the Sanity `packages/{core,sirv-client,url-builder}` source
  (recorded exact public APIs), the Strapi port (closest architecturally - server-side token
  mint/cache, boundary guardrails, stored-value shape), and the Contentful `DECISIONS.md` +
  Storyblok `PORTING-GUIDE.md` porting method. Wrote `docs/port-notes-from-sanity.md` (ports
  unchanged / needs adaptation / genuinely new) and `docs/dam-core-extraction-notes.md`.
- Seeded this `DECISIONS.md` with the pre-made decisions and the M0 defaults above.
- No production code written; workspace not scaffolded (that is M1). No credentials touched.

## Milestone 1 (scaffold) - DONE (2026-07-07)

- pnpm workspace root: `package.json` (`@sirv/payload-monorepo`), `pnpm-workspace.yaml`
  (`packages/*`, `apps/*`, `examples/*`), `tsconfig.base.json` + `tsconfig.json`, `biome.json`,
  `vitest.config.ts`. Mirrors the Strapi setup (closest architecturally).
- Vendored `packages/{url-builder,sirv-client,core}` verbatim from `../sanity` (47 files, source +
  package.json + tsconfig). ONE edit to the vendored source: `@sirv/core` react peer widened from
  `^18.0.0` to `^18.0.0 || ^19.0.0` (Payload v3 admin runs React 19). No other package changes.
- Boundary guardrails retargeted from `@strapi/*` to Payload: Biome `noRestrictedImports`
  (enumerates `payload`, `@payloadcms/ui`, `@payloadcms/next`, db + richtext packages) +
  `scripts/check-package-boundaries.mjs` (wildcard regex catching bare `payload`, `payload/...`
  subpaths, and any `@payloadcms/*`) + `tests/package-boundaries.test.ts` (`findPayloadImports`).
- Toolchain: this env is Node 20.20.2 / pnpm 10.28.2. Root devDeps keep React 18 (mirrors Strapi)
  so the vendored packages test in the exact environment they were proven in; the React 19
  requirement is satisfied per-app in M2 (plugin) and M5 (example), where `@payloadcms/*` + Next 15
  bring React 19. core's widened peer accepts both.
- `git init` + initial commit (65 files tracked). Remote `github.com/sirv/sirv-payload` NOT pushed:
  this non-interactive session has no git remote auth. PUSH IS OUTSTANDING for Igor (see below).
- Verified green: `pnpm check` (boundaries + lint + typecheck + test) exits 0. Tests: 56 passed,
  5 live-only skipped (the `sirv-client/live.test.ts` set, gated by `SIRV_LIVE=1`).

## Milestone 2 (plugin skeleton + auth) - DONE (2026-07-07)

Built `apps/payload-plugin` (`@sirv/payload-plugin@0.1.0`). Installed `payload@3.85.2` +
`@payloadcms/ui` as dev/peer deps; the plugin package carries its own React 19 dev deps (pnpm
isolates them per-package) so it matches the Payload admin host while root packages stay on React
18. Two-entry export split: `.` (server-safe) and `./client` (`'use client'` bundle), plus
`./styles.css`.

- **Plugin function** (`src/index.ts`): `sirvPlugin(options) => (config) => config`. Spreads
  existing globals/endpoints/nav links, wraps `onInit`. Registers the settings admin view at
  `/admin/sirv` (`admin.components.views.sirvSettings`, path-string Component) and a sidebar link
  via `afterNavLinks`. `enabled: false` returns the config untouched. Verified against the real
  `payload@3.85.2` types (`Endpoint`, `GlobalConfig`, `AdminViewConfig`, `CustomComponent`,
  `PayloadComponent = ... | string`).
- **`sirv-settings` global** (`src/globals/sirv-settings.ts`): admin-only `access.read/update`;
  `clientSecret` field has `access.read: () => false` (never leaves the server) + field hooks
  `beforeChange` (encrypt) / `afterRead` (decrypt). clientId/accountAlias/deliveryAlias texts +
  `aliases` json cache, all admin-readOnly.
- **Encryption** (`src/lib/encryption.ts`): AES-256-GCM, key = sha256(`req.payload.secret`),
  random 96-bit IV, self-describing `sirv-enc:v1:` prefix so decrypt/re-save are idempotent.
- **Server Sirv helper** (`src/lib/sirv-server.ts`, sirv-client only, never client): `mintBearer`
  (POST /v2/token), `getCachedBearer` (process-local cache, 60s skew), `clearBearerCache`,
  `validateCredentials` (GET /v2/account -> alias + `accountAliasOptions`).
- **Endpoints** (`src/endpoints/*`), all guarded on `req.user`, secret never in any response:
  `POST /api/sirv/connect` (validate + persist + auto-pick single delivery domain),
  `POST /api/sirv/token` (mint bearer), `GET /api/sirv/status`, `POST /api/sirv/delivery`
  (save chosen domain without re-sending the secret - the browser never holds it),
  `POST /api/sirv/disconnect`.
- **Client seam** (`src/components/adapters/`): `createSirvAdminApi` (typed fetch wrapper over the
  plugin endpoints), `createPayloadTokenStore` (bearer cache + skew + coalesced mints, sourced
  from `POST /api/sirv/token`), `createBrowserSirvClient` (reuses the shared `createSirvClient`
  by injecting a live bearer through a custom `fetch` and owning the 401-refresh retry - the
  static token manager cannot refresh, so the placeholder `accessToken` is overwritten per
  request). This is the "genuinely new" seam; `TokenStorage`/`useSirvAuth` are intentionally NOT
  used (they would leak the secret into the browser).
- **Settings view** (`src/components/SirvSettingsView.tsx`, `'use client'`): full connect flow
  (paste ID+secret -> validate -> auto/pick delivery domain -> disconnect), plus `SirvNavLink`.
  Chrome via `sirv-*` CSS classes in `src/styles.css` (uses Payload admin CSS variables).
- **Tests** (25 new assertions): encryption round-trip/tamper/idempotency, token-store
  cache/refresh/coalesce, server bearer-cache with a stubbed `/v2/token` fetch.
- Verified green: `pnpm boundaries && lint && typecheck && test` (66 passed, 5 live-skipped) and
  `pnpm --filter @sirv/payload-plugin build` emits `dist/{index,exports/client,styles.css}` with
  `'use client'` preserved in the client bundle.

**Decisions taken here**
- API base defaults to `/api` and admin route to `/admin` (Payload defaults). Custom
  `routes.api`/`routes.admin` are a documented limitation to wire through `useConfig` later.
- The settings view is registered as a client-component view (renders standalone at
  `/admin/sirv`). Wrapping it in `@payloadcms/next`'s `DefaultTemplate` for full nav chrome is a
  refinement deferred to keep the server/client boundary clean; the nav link + view are
  functional now.
- A 5th endpoint (`/sirv/delivery`) was added beyond the spec's connect/token/status because the
  browser cannot re-send the secret to change only the delivery domain.

**Acceptance still needing live creds (Igor):** connect against a real Sirv account and confirm
in devtools that no browser response ever contains the secret. The design guarantees it (field
`read:()=>false` + status/token responses omit it); needs a live confirmation run.

## Milestone 3 (sirvMediaField) - DONE (2026-07-07)

- **Value contract nailed down.** Verified the frozen flat shape against the published
  `@sirv/react` `fromSanityMedia` (`../sirv-react/src/from-sanity.ts`) and a shipped sibling
  (`../contentful/.../value.ts`). NOTE: `@sirv/core`'s own `SirvFieldValue` is a DIFFERENT nested
  `sirv.image` shape (Sanity-internal) - NOT what we store. We store the flat `sirvMedia`
  (`_type:'sirvMedia'`, `mediaType`, `sirvPath`, `sirvAlias`, `originalUrl`, `bytes`, optional
  dims/format/alt/caption/transformations/playback). Extended the Contentful mapper's enum to 5
  types (added `model`).
- **`src/fields/value.ts`**: `SirvMediaValueSchema` (+`SirvMediaListValueSchema`),
  `damAssetToMediaValue(asset, alias)` (URL via `@sirv/url-builder` `buildUrl`, percent-encoded
  paths), `enrichMediaValue` + `fetchSirvInfo` (auto-fill alt from `?info` title, caption from
  description, image/video only, never overwrites edited values, never throws).
- **`src/fields/index.ts`**: `sirvMediaField` (+`sirvMediaListField`/`sirvAssetUrlField` stubs
  wired for M4) factories returning server-safe `json`/`text` configs. Components referenced by
  path string (`@sirv/payload-plugin/client#SirvMediaField` + `#SirvMediaCell`); per-field
  `allowedTypes` stashed in `admin.custom.sirvAllowedTypes` and read by the client component.
  Returns cast `as Field` because `Field` is a big union that fights a literal component string.
- **Client** (`'use client'`, all under `./client`): `useSirvClient` hook + `runtime.ts`
  singletons (one shared `SirvClient` + token store + cached status across all fields);
  `SirvDamBrowser` wraps the headless `@sirv/core` `DamBrowser` and maps the picked `DamAsset`
  into an enriched `sirvMedia` value; `SirvModal` (self-contained fixed-overlay modal - no
  `@faceless-ui/modal` dependency, avoids the React-copy coupling; Escape + backdrop close);
  `SirvMediaField` (pick/replace/remove, thumbnail preview, inline alt/caption for image/video,
  respects `allowedTypes` + `readOnly`); `SirvMediaCell` (list-view thumbnail/badge). `thumb.ts`
  builds preview URLs (image via resize, video via `?thumbnail=`, spin/view/model -> badge).
- **Styles**: authored the full DAM/modal/asset-card/cell CSS for the ACTUAL vendored-core class
  names (`sirv-grid__items`, `sirv-thumb__frame`, `sirv-preview__media`, ... - the Contentful
  stylesheet predates these), using Payload admin CSS variables for light/dark.
- **Tests**: 6 value-mapper assertions (each media type, unicode path encoding, file rejection,
  schema round-trip). Total suite 71 passed, 5 live-skipped.
- Verified green: `pnpm check` exit 0; plugin `build` emits the new client components with
  `'use client'` preserved.

**Decisions taken here**
- Own modal instead of `@payloadcms/ui`'s `Modal`/`@faceless-ui`: fewer moving parts, no
  dependency on the admin ModalProvider container, sidesteps the React 18 (faceless) vs 19
  (payload) split. Revisit if we want the exact Payload modal look.
- `allowedTypes` travels via `admin.custom` (client-readable) rather than component `clientProps`
  (not expressible through a bare path-string reference).

## Milestone 4 (remaining fields) - DONE (2026-07-07)

- **Generalized `SirvDamBrowser`** so all three fields share one browser: `onPick(asset,
  deliveryAlias)` (field decides the mapping) + `closeOnPick` (false for galleries). Reused the
  headless `@sirv/core` DamBrowser unchanged.
- **`SirvMediaListField`** (`json` array): gallery grid, multi-pick (modal stays open,
  `closeOnPick=false`), per-item remove, HTML5 drag-and-drop reorder, `readOnly` aware. Reuses
  `readAllowedTypes` and the value mapper. `SirvMediaListCell` renders a 4-up thumbnail strip
  with a `+N` overflow.
- **`SirvAssetUrlField`** (`text`): stores a delivery URL string, hand-editable, with a Browse
  button opening the DAM browser. Allows generic files (`file`) plus all media types by default
  (`ALL_BROWSE_TYPES`), narrowable via `allowedTypes`. On pick, stores
  `buildUrl({ alias, path })`.
- Wired all five client components into `./client`; factories from M3 already pointed at these
  path strings, so `sirvMediaListField` / `sirvAssetUrlField` are now fully functional.
- **Tests**: 3 factory-config assertions (type, component path strings, allowedTypes, url field
  has no Cell). Suite 74 passed, 5 live-skipped.
- Verified green: `pnpm check` exit 0; plugin builds.

**Decisions taken here**
- Multi-select UX: append-per-pick with the modal held open (`closeOnPick=false`) rather than a
  checkbox multi-select inside the browser, because the headless `@sirv/core` DamBrowser exposes
  a single-asset preview/confirm flow, not batch selection. Good enough and reuses the shared
  browser verbatim; a true batch-select is a possible `@sirv/core` enhancement later.
- Drag-reorder via native HTML5 DnD (no dnd library) to keep the dependency surface minimal.

## Milestone 5 (example app + live verification) - DONE (2026-07-07)

- **`examples/payload`**: a combined Next.js 15 + Payload v3 app (in the workspace, so
  `@sirv/payload-plugin: workspace:*` resolves). `payload.config.ts` wires `sirvPlugin()` +
  sqlite adapter + lexical; `collections/Posts.ts` uses all three factories (`hero`
  sirvMediaField, `gallery` sirvMediaListField, `spin` sirvMediaField restricted to `['spin']`,
  `assetUrl` sirvAssetUrlField). Standard App-Router `(payload)` admin + api routes (verified
  export names against installed `@payloadcms/next@3.85.2`: `handleServerFunctions` is in
  `/layouts` not `/utilities`; graphql route exposes only `GRAPHQL_POST`). Pre-generated
  `importMap.js` registers all seven client components so it runs before `generate:importmap`.
- **Frontend** `(frontend)/page.tsx`: reads the first post via the Local API and renders
  hero/gallery/spin/assetUrl through `@sirv/react`'s polymorphic `SirvMedia` + a `fromStoredMedia`
  alias of `fromSanityMedia`; also renders a static sample of every media type so the page shows
  content with no data. Confirms the stored `sirvMedia` value renders with NO transformation
  layer (the spec's key simplification: Payload lives in Next, the native home of `@sirv/react`).
- **Live smoke test** `apps/payload-plugin/src/lib/sirv-server.live.test.ts` (gated
  `SIRV_LIVE=1` + creds, `describe.skipIf`): mints a bearer with positive `expiresIn`, verifies
  the server bearer cache, and validates credentials returning `accountAlias` + delivery domains.
  Skipped in the hermetic suite (now 8 live-only skipped total).
- **Dual React-types fix (important).** The example runs React 19 (Payload admin host) while the
  vendored `packages/*` test on React 18; a bare `tsc` on the example produced spurious
  `ReactNode`/`bigint` mismatches from two `@types/react` copies. Added a workspace
  `pnpm.overrides` pinning `@types/react@19.2.17` + `@types/react-dom@19.2.3`. Verified this keeps
  `packages/*` + plugin typecheck AND all tests green, and drops the example's `tsc` errors to 0
  (so `next build`, which typechecks, works in-repo). In a real standalone consumer project there
  is only one `@types/react`, so this is a monorepo-only accommodation.
- Verified green: `pnpm check` exit 0; `examples/payload` `tsc --noEmit` exit 0.

**Decisions taken here**
- SQLite (`@payloadcms/db-sqlite`) as the example DB: zero-setup local file, lightest adapter.
- `next` pinned to `~15.4.11` to satisfy `@payloadcms/next@3.85.2`'s peer window; added
  `monaco-editor` to satisfy the `@payloadcms/ui` optional peer.
- Example is validated structurally + by typecheck here; a live `pnpm dev` + connect + pick +
  render pass needs a real Sirv account and a running DB (Igor's machine).

## Milestone 6 (publish and list) - DONE where possible; publish PENDING (2026-07-07)

- **`apps/payload-plugin/README.md`**: the npm-facing README with the full install walkthrough
  (add `sirvPlugin()`, `payload generate:importmap`, import `styles.css`, connect flow, the three
  field factories + `allowedTypes`, the frozen stored shape, `@sirv/react` rendering, the security
  model). Root `README.md`: monorepo overview + dev/live-test commands.
- **`sirv-payload.article.html`**: sirv.com/help article draft, mirroring the shipped
  Storyblok/Contentful article HTML exactly (intro with floated logo, anchored `h2`/`h3`,
  `prettyprint` code blocks, numbered `<strong>N.</strong>` steps, `.Sirv` screenshot
  placeholders, FAQ card + JSON-LD, trailing sirv.js script). 13.5 KB, 8 headings, no em-dashes.
- **Spec audit**: ran `/igor-audit-spec` - added the Status snapshot, tagged M0-M5 `[DONE]` /
  M6 `[IN-PROGRESS]` with Evidence lines, and added drift notes (5 endpoints vs 3, the token-seam
  realization, the standalone settings view / own modal).
- Verified green after all doc changes: `pnpm check` exit 0.

**PENDING (cannot run in this environment; Igor to do):**
- Push the local git history to `github.com/sirv/sirv-payload` (no remote auth here).
- `npm publish` `@sirv/payload-plugin` via a temporary gitignored `.npmrc` (delete after). Bump
  `version` from `0.1.0` if desired; set `publishConfig.access: public` for the scoped package.
- Submit to the Payload community plugins directory; add GitHub topics `payload-plugin`, `sirv`,
  `dam`.
- Replace the article's placeholder screenshots (`sirv.sirv.com/website/screenshots/payload/*`)
  and the `payload-logo.png` with real uploads.

## Live smoke test of the example (2026-07-07) - example runs end-to-end

Booted `examples/payload` with `pnpm dev` (no Sirv creds) and probed it. Results:
- `GET /admin` -> **200**; Payload auto-ran `generate:importmap` on startup and resolved all
  seven Sirv client components (confirms the import-map path-string mechanic works in a real app).
- `GET /api/sirv/status` -> **401 `{"error":"Unauthorized"}`** (the plugin endpoints are mounted
  under `/api/sirv/*` and correctly guarded on `req.user`).
- `GET /` -> **200**; all five media types render via `@sirv/react` - the image emitted a full
  responsive `srcset` (`w=320 ... w=1600`, `format=optimal`, `loading="lazy"`), video with
  poster + controls, spin/view/model as `.Sirv` sirv.js containers.

The smoke test caught and fixed **three real integration bugs** (all in the example/glue, not the
plugin core):
1. **`.js` specifier resolution.** Next's webpack could not resolve the TS-ESM `.js` import
   specifiers used by the example and the source-consumed `@sirv/*` packages. Fixed with
   `resolve.extensionAlias` (`.js -> .ts/.tsx`) in `examples/payload/next.config.mjs`.
2. **Lost `'use server'` directive.** Biome's `useArrowFunction` autofix had rewritten the
   Payload `serverFunction` in `(payload)/layout.tsx` into an arrow, silently dropping the
   `'use server'` directive, so `/admin` 500'd ("Functions cannot be passed to Client
   Components"). Restored the function-expression form with a `biome-ignore`.
3. **`@sirv/react` is client-only.** `fromSanityMedia`/`SirvMedia` are Client Components; calling
   them from the RSC frontend page 500'd. Added `(frontend)/MediaBlock.tsx` (`'use client'`) that
   converts + renders, with the server page passing the plain stored value across the boundary.
   Updated the README and help article render examples to show the `'use client'` pattern.

These are the kind of bugs only a live run surfaces; the plugin's server + field code was
unaffected. `pnpm check` remains exit 0 and the example `tsc` is clean after the fixes.

## Settings UX refinement (2026-07-07)

Feedback: the raw `sirv-settings` global was visible in the admin nav and rendered by Payload's
default global edit UI (unstyled fields + an "Edit"/"API" tab), which is not the intended entry
point. Fixes:
- **Hid the global from the nav** (`admin.hidden: true` in `globals/sirv-settings.ts`). It still
  backs the endpoints through the Local API (which bypasses access control). The custom view at
  `/admin/sirv` is now the sole settings entry.
- **Redesigned `SirvSettingsView`** to match the other Sirv CMS plugins (the Strapi settings page
  the user referenced): a titled "Sirv configuration" page with a **Connection** card (Client ID
  + Client secret, required markers, the "my.sirv.com -> Settings -> API" helper link, Connect
  button; connected state shows the account + delivery-domain picker + a danger Disconnect) and a
  **Help & support** card (Documentation / Contact support / Your API keys links). Added the
  matching `sirv-card`/`sirv-hint`/`sirv-links`/`sirv-btn--danger` CSS.

Note on the "API" tab the user asked about: that is Payload's built-in per-document view toggle
(Edit vs API) auto-added to every collection/global edit screen; it previews the REST/GraphQL JSON
for that document. It appeared only because the global was nav-visible. The `clientSecret` was
already excluded from it (`read:()=>false`); hiding the global removes the tab from view entirely.

## Settings view chrome fix (2026-07-07) - the deferred refinement, now done

Feedback: the settings view rendered full-screen, losing the admin sidebar/header/footer. This
was the refinement flagged in M2 (custom views render as the whole page; you must wrap them in
Payload's `DefaultTemplate` yourself). Implemented:
- Split the view: the interactive form is now `SirvSettingsClient` (`'use client'`, under
  `./client`); a new Server Component `views/SirvSettingsView.tsx` wraps it in
  `DefaultTemplate` (from `@payloadcms/next/templates`) + `Gutter`, mapping the required props
  from `initPageResult` (`req`, `payload`, `permissions`, `locale`, `user`, `visibleEntities`).
- Added a third package entry **`./rsc`** (server components, no `'use client'`) exporting
  `SirvSettingsView`; the plugin now registers the view as `@sirv/payload-plugin/rsc#SirvSettingsView`.
  This keeps the RSC/client split clean: `.` (server-safe config), `./client` (client bundle),
  `./rsc` (server components that use `@payloadcms/next`).
- Added `@payloadcms/next` as a peer/dev dependency (needed for `DefaultTemplate`).
- Verified live: `/admin/sirv` -> 200, compiles with the template, no errors. Import map
  regenerates to `rsc#SirvSettingsView`.

Removes the earlier M2 drift note about the standalone view; the view now has full admin chrome.

## Outstanding / for live verification by Igor

- Token TTL: docs prose says 20 min (1200s); `openapi` allows `expiresIn` up to 604800. Confirm
  the real default and max against a live account.
- Sirv `api.sirv.com` CORS for the Payload admin origin (proven in shipped siblings, not re-run
  here). Verify in devtools on first live connect.
- `GET /v2/account/limits` response shape (rate-limit quota) is undocumented; confirm live.
- Exact current stable Payload 3.x at build time and the exact minimum minor per API surface;
  Payload's internal React pin; the `afterNavLinks` (or equivalent) nav-link slot name.
- Whether npm consumers need `--legacy-peer-deps` for the React 19 peer graph (pnpm recommended).
- **Git push:** repo is committed locally but not pushed. Igor to create/attach the
  `github.com/sirv/sirv-payload` remote and push (this session had no remote auth).
- **npm publish** of `@sirv/payload-plugin` (M6) needs a credentialed `.npmrc` (temporary,
  gitignored, deleted after) - cannot run in this session.
