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

## Outstanding / for live verification by Igor

- Token TTL: docs prose says 20 min (1200s); `openapi` allows `expiresIn` up to 604800. Confirm
  the real default and max against a live account.
- Sirv `api.sirv.com` CORS for the Payload admin origin (proven in shipped siblings, not re-run
  here). Verify in devtools on first live connect.
- `GET /v2/account/limits` response shape (rate-limit quota) is undocumented; confirm live.
- Exact current stable Payload 3.x at build time and the exact minimum minor per API surface;
  Payload's internal React pin; the `afterNavLinks` (or equivalent) nav-link slot name.
- Whether npm consumers need `--legacy-peer-deps` for the React 19 peer graph (pnpm recommended).
