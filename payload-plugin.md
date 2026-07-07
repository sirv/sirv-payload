# Sirv for Payload CMS — `@sirv/payload-plugin`

## Goal

Ship an official Payload CMS v3 plugin that adds Sirv as a first-class media source inside the
Payload admin panel: editors connect a Sirv account, browse the Sirv DAM (folder tree, search,
type filters, previews, multi-select), and pick images, videos, 360 spins, views, 3D models, or
generic files. Picked assets are stored as the same flat `sirvMedia` JSON value used by the
Sanity / Storyblok / Contentful / Strapi plugins and render on the frontend with the published
`@sirv/react` package — which is trivial here, because Payload v3 lives inside Next.js, the
native home of `@sirv/react`.

This is the **fifth headless-CMS port** of the same shared core. Everything hard is already
built and battle-tested on four hosts. The Payload-specific work is glue: a plugin function, a
settings global, a token endpoint, and field-config factories with custom admin components.

## Background

- Payload is the momentum leader in headless CMS: ~43K GitHub stars, ~434K weekly npm downloads
  (June 2026), growing since the Figma acquisition while Strapi declines. "TypeScript-first,
  Next.js-native, backed by Figma."
- **Cloudinary has no official Payload integration** (as of July 2026). First-mover window.
- Payload v3 is the stable production line (3.x still receiving releases, June 2026). v4 is in
  beta (`4.0.0-beta.0` only); Payload recommends v3 for production. **Target v3**, keep the
  integration surface small (fields, endpoints, one global, one admin view) so the v4 migration
  is cheap — plugins that avoid touching auth/admin internals are expected to migrate easily.
- Payload has no marketplace review. Distribution = npm + Payload community plugins directory +
  GitHub topic `payload-plugin`.

### What already exists (reuse, do not rebuild)

| Piece | Where | State |
|---|---|---|
| `@sirv/react` renderer (`<SirvImage>` `<SirvVideo>` `<SirvSpin>` `<SirvView>` `<SirvModel>`) | npm (repo: `sirv/sirv-react`, local `../sirv-react`) | Published (0.2.x) |
| `packages/sirv-client` — REST client, token mint from clientId/secret, readdir/search/account, Zod types, `classifyAssetType` | Sanity monorepo `../sanity/packages/` | Battle-tested ×4 |
| `packages/url-builder` — pure Sirv URL/srcset builders | same | Battle-tested ×4 |
| `packages/core` — headless React hooks + components: `useSirvAuth` (clientId/secret + delivery-alias state machine over a `TokenStorage` adapter), `useFolders`, `useSearch`, `useTypeFilter`, `DamBrowser`, `AssetPreview`, `ThumbnailGrid`, `TypeFilter` (emit `sirv-*` CSS classes, host provides chrome) | same | Battle-tested ×4 |
| Stored value shape — flat JSON: `_type: 'sirvMedia'`, `mediaType` (`image\|video\|spin\|view\|model`), `sirvPath`, `sirvAlias`, `originalUrl`, dims, `alt`, `caption`, … | all four shipped plugins | Frozen contract |
| Connect UX — paste per-account REST Client ID + Secret (my.sirv.com → Account → Settings → API), validate via `GET /v2/account`, pick delivery domain (auto if single) | all four shipped plugins | Frozen contract |

## Reference Material

Read BEFORE writing code; produce the notes files listed in Implementation Order M0.

- **Sirv REST API docs (source of truth):** `/Users/igor/www/sirv/sirv/rest-api/docs-next/`
- Sirv Dynamic Imaging: https://sirv.com/help/articles/dynamic-imaging/
- Sirv Responsive Images / sirv.js: https://sirv.com/help/articles/responsive-images-smv/
- Payload plugin authoring: https://payloadcms.com/docs/plugins/build-your-own (+ official
  plugin template repo)
- Payload custom components & import map: https://payloadcms.com/docs/custom-components/overview
- Payload fields (JSON, text) and custom Field/Cell components: https://payloadcms.com/docs/fields/overview
- Payload globals, endpoints, access control: https://payloadcms.com/docs/configuration/globals ,
  https://payloadcms.com/docs/rest-api/overview#custom-endpoints
- **Sister projects (heavy reuse):**
  - Sanity (origin of shared packages): `/Users/igor/Projects/Sirv/extensions/sanity/`
  - Strapi (closest architecturally — server-side host): `/Users/igor/Projects/Sirv/extensions/strapi/`
  - Contentful `DECISIONS.md` + Storyblok `PORTING-GUIDE.md` — porting playbooks worth copying
    as a working method (decision log, port notes, boundary guardrails).

## Hard Constraints

1. **Single npm package `@sirv/payload-plugin`**, a standard Payload plugin: a function
   `sirvPlugin(options)` returning `(incomingConfig: Config) => Config`. Installable in any
   Payload v3 project; no fork, no patching.
2. **Targets Payload `^3.x`** (verify exact minimum at kickoff). Note v4-beta compat risks in
   `docs/payload-gotchas.md`; do not block on v4.
3. **Auth = paste Client ID + Secret + delivery-domain pick** — identical UX to the shipped
   Sanity / Storyblok / Contentful / Strapi plugins. **Zero credentials shipped in the package.**
   No email/OTP flow (removed across the series).
4. **The client secret never reaches the browser.** Credentials live server-side in a Payload
   global; a plugin endpoint mints the 20-minute bearer on demand. (Payload gives us a real
   server — use it. This is a security *improvement* over the Sanity/Contentful client-side
   pattern; see Architecture.)
5. **No external backend service.** The plugin's endpoints run inside the host's own
   Payload/Next.js server. No Sirv core/backend changes.
6. **Vendor the shared packages** (`packages/{sirv-client,url-builder,core}`) verbatim from the
   Sanity monorepo, exactly like Storyblok/Contentful/Strapi did. Boundary guardrails retargeted:
   ban `payload` and `@payloadcms/*` imports from `packages/` (Biome `noRestrictedImports` +
   `scripts/check-package-boundaries.mjs` + a Vitest assertion). See Notes for the Implementer
   re: `@sirv/dam-core` extraction — flag it, don't do it here.
7. **Asset/media types:** image, video, spin, view, **model** (`.glb`), plus generic **file** in
   URL mode — match the shipped Sanity plugin (not the older four-type spec).
8. **Stored value shape is the frozen flat `sirvMedia` JSON.** No Payload-specific value schema.
   `@sirv/react` consumes it via the same `fromStoredMedia` shim as the Contentful example.
9. **DAM browser UX matches the series.** Reuse `@sirv/core` headless components; provide
   Payload-admin chrome via `@payloadcms/ui` primitives + a stylesheet for the `sirv-*` classes.
10. **No credentials in code or committed files.** `.env.local` (gitignored) for dev/live-test
    machine credentials only, gated by `SIRV_LIVE=1`. Temporary gitignored `.npmrc` for
    publishing, deleted after.

## Architecture

```
Payload admin (browser)                      Host's Payload/Next.js server            Sirv
┌─────────────────────────────┐             ┌──────────────────────────────┐
│ Field components (client)   │             │ @sirv/payload-plugin (server)│
│  SirvMediaField ──┐         │             │                              │
│  SirvMediaList ───┼─ DAM    │  bearer     │  sirv-settings GLOBAL        │
│  SirvAssetUrl ────┘ browser │◄────────────│   clientId, clientSecret     │
│        │                    │ POST /api/  │   (encrypted hooks, admin-   │
│        │ @sirv/core hooks   │ sirv/token  │    only access, secret never │
│        │ (useSirvAuth via   │             │    returned to admin UI)     │
│        │  PayloadTokenStore)│             │   accountAlias,deliveryAlias │
│        ▼                    │             │                              │
│  api.sirv.com direct calls  │─────────────┼──────────────────────────────┼──► /v2/files/readdir
│  with 20-min bearer (CORS-  │             │  endpoints:                  │    /v2/files/search
│  proven in Sanity/Ctfl)     │             │   POST /api/sirv/connect     │──► /v2/token
│                             │             │   POST /api/sirv/token       │    /v2/account
│  Admin view: Sirv Settings  │────────────►│   GET  /api/sirv/status      │
└─────────────────────────────┘             └──────────────────────────────┘
Frontend (same Next.js app or any consumer): stored sirvMedia JSON ──► @sirv/react
```

Key decisions (made — don't relitigate without documenting in `DECISIONS.md`):

- **Hybrid token flow.** Secret stays server-side (global, admin-only access, field-level
  encryption via beforeChange/afterRead hooks); browser gets only the 20-min bearer from
  `POST /api/sirv/token`; DAM browsing then talks to api.sirv.com directly (pattern proven in
  the browser since Sanity). Cheaper than Strapi's full Koa proxy, safer than
  Sanity/Contentful's client-held secret. `TokenStorage` adapter = `PayloadTokenStore`, backed
  by the token endpoint instead of a local secret store.
- **Field factories, not a field registry.** Payload has no custom-field-type registry (unlike
  Strapi). The plugin exports typed factories that return standard Payload field configs:
  `sirvMediaField({ name, allowedTypes? })` → `json` field with custom `admin.components.Field`
  + `Cell`; `sirvMediaListField(...)` → `json` (array value); `sirvAssetUrlField(...)` → `text`
  field with picker-backed component. Custom components are referenced by import path strings
  and resolved via Payload's import map (`payload generate:importmap`) — document this in the
  README install steps.
- **Settings UI = custom admin view** (`/admin/sirv`) registered by the plugin: connect flow,
  account status, delivery-domain pick, disconnect. Plus the same DAM browser as a standalone
  browse page.
- **Not an upload storage adapter.** Payload's storage adapters (`@payloadcms/storage-*`)
  replace where native uploads land. Wrong layer for the DAM-picker MVP — same reasoning as
  Strapi's upload-provider rejection. A `@sirv/payload-storage` adapter is a natural v1.1
  (Payload's storage-adapter interface is public and simple) — roadmap, not MVP.

## Capabilities

1. **Connect Sirv account** — Settings view: paste Client ID + Secret → validate via
   `GET /v2/account` → pick delivery domain (auto-select if single) → persisted in the
   `sirv-settings` global. Silent reconnect afterwards; disconnect button.
2. **DAM browser** — folder tree, account-wide search, thumbnail grid, live preview (image /
   video / sirv.js spin, view, model), type-filter chips, generic files where relevant,
   multi-select (for the list field). Identical UX to the four shipped plugins.
3. **Fields** — `sirvMediaField` (single), `sirvMediaListField` (gallery, multi-select,
   drag-reorder), `sirvAssetUrlField` (URL backed by the picker). `allowedTypes` restriction per
   field. Alt/caption auto-filled from Sirv `?info`, editable inline. List-view `Cell` renders a
   thumbnail.
4. **Frontend rendering** — example Next.js app (the same app hosting Payload) renders all
   media types via `@sirv/react` with responsive srcset, lazy loading, sirv.js auto-load for
   spin/view/model.

## Repo Layout

```
extensions/payload/                     → github.com/sirv/sirv-payload (create; push from day 1)
├── apps/
│   └── payload-plugin/                 # the @sirv/payload-plugin npm package
│       └── src/
│           ├── index.ts                # sirvPlugin(options) → (config) => config
│           ├── fields/                 # sirvMediaField / sirvMediaListField / sirvAssetUrlField factories
│           ├── components/             # client components: Field, Cell, DamBrowser chrome, Settings view
│           │   └── adapters/PayloadTokenStore.ts
│           ├── endpoints/              # connect / token / status handlers
│           ├── globals/sirv-settings.ts
│           └── exports/                # subpath exports for importMap (client components)
├── packages/                           # vendored from ../sanity — ZERO payload/@payloadcms imports
│   ├── core/
│   ├── sirv-client/
│   └── url-builder/
├── examples/
│   └── payload/                        # Next.js + Payload v3 app: plugin installed AND frontend
│                                       # pages rendering stored values via published @sirv/react
├── docs/
│   ├── architecture.md
│   ├── sirv-api-notes.md
│   ├── port-notes-from-sanity.md
│   └── payload-gotchas.md              # importMap, RSC/client split, v4-beta risks
├── scripts/check-package-boundaries.mjs
├── tests/
├── DECISIONS.md                        # running decision log (copy the Contentful method)
├── .claude/CLAUDE.md
├── .env.local                          # gitignored
├── .env.example
├── .gitignore                          # set BEFORE git init
├── README.md                           # install: plugin config + generate:importmap + field usage
├── payload-plugin.md                   # this spec
├── package.json                        # pnpm workspace root
└── pnpm-workspace.yaml
```

Tech stack (series-standard): TypeScript, React (Payload v3 admin = React 19 — verify
`@sirv/core` peer ranges), `@payloadcms/ui` for admin chrome, Zod on every boundary, Vitest +
React Testing Library, Biome, pnpm workspaces.

## Deliverables

1. `@sirv/payload-plugin` published to npm (public), README with full install walkthrough.
2. Vendored `packages/*` green: `pnpm boundaries && pnpm lint && pnpm typecheck && pnpm test`.
3. Example app in `examples/payload/` runnable with `SIRV_LIVE=1` dev credentials.
4. `docs/` notes files + `DECISIONS.md` kept current throughout.
5. Listing submitted to the Payload community plugins directory; GitHub topics
   `payload-plugin`, `sirv`, `dam`.
6. Draft help article (`sirv-payload.article.html`, same format as the Contentful/Storyblok
   articles) for sirv.com/help.

## Success Criteria

1. Fresh Payload v3 project: `pnpm add @sirv/payload-plugin` → add `sirvPlugin()` to
   `payload.config.ts` → `payload generate:importmap` → admin shows the Sirv settings view.
   Nothing else required.
2. Connect flow works against a real Sirv account; secret is never present in any browser
   response (verify in devtools — acceptance test).
3. A collection with all three field factories: editors pick assets of every media type via the
   DAM browser; values persist as frozen-shape `sirvMedia` JSON; list view shows thumbnails.
4. Example frontend renders image / video / spin / view / model correctly with `@sirv/react`.
5. `packages/core` builds and tests with zero `payload`/`@payloadcms` imports (CI-enforced).
6. `docs/port-notes-from-sanity.md` records every divergence from the Sanity/Strapi codebases.

## Non-Goals (MVP)

- Replacing Payload's upload storage (the `@sirv/payload-storage` adapter is v1.1 roadmap).
- Auto-rewriting existing media URLs ("Deliver via Sirv") — Webflow-style, different product.
- Payload v4 support (beta only; keep surface small, migrate when GA).
- Rich-text (Lexical) inline Sirv embeds — v1.2 candidate, high value but separate scope.
- Payload Cloud specifics (sign-ups paused post-acquisition; standard self-hosting only).
- Publishing `@sirv/dam-core` (see Notes).

## Implementation Order

Each milestone is stoppable — **stop after each one and report before continuing.**

- **M0 — Read & decide (no code).** Read this spec; Sirv REST API docs; Payload plugin/custom-
  component/fields/globals/endpoints docs; the Sanity + Strapi repos end-to-end; Contentful
  `DECISIONS.md` + Storyblok `PORTING-GUIDE.md`. Write `docs/sirv-api-notes.md`,
  `docs/port-notes-from-sanity.md`, `docs/payload-gotchas.md` (importMap mechanics, RSC/client
  component split, exact minimum Payload version, React 19 peer-dep check for `@sirv/core`).
  Seed `DECISIONS.md`.
- **M1 — Scaffold.** pnpm workspace; vendor `packages/*` from `../sanity`; retarget boundary
  guardrails to `payload`/`@payloadcms/*`; Biome, tsconfig, Vitest wiring; `.gitignore` +
  `.env.example`; git init + push to `sirv/sirv-payload`. Green: boundaries, lint, typecheck,
  test.
- **M2 — Plugin skeleton + auth.** `sirvPlugin()` config transform; `sirv-settings` global
  (encrypted secret, admin-only access, secret excluded from afterRead); endpoints
  `connect` / `token` / `status`; `PayloadTokenStore` adapter; Sirv settings admin view with the
  full connect flow. Acceptance: connect a real account; secret absent from all browser traffic.
- **M3 — `sirvMediaField`.** JSON field factory + client Field component opening the DAM
  browser modal (`@sirv/core` components + Payload chrome + `sirv-*` stylesheet); store frozen
  `sirvMedia` value; `Cell` thumbnail; alt/caption editing; `allowedTypes`.
- **M4 — Remaining fields.** `sirvMediaListField` (multi-select, drag-reorder),
  `sirvAssetUrlField` (URL mode incl. generic files); shared modal state; tests.
- **M5 — Example app + live verification.** `examples/payload/` Next.js app with plugin
  installed, a demo collection, and frontend pages rendering every media type via published
  `@sirv/react`. Live smoke tests gated by `SIRV_LIVE=1`.
- **M6 — Publish & list.** README install walkthrough (incl. `generate:importmap`); npm publish
  (temporary gitignored `.npmrc`, delete after); community-directory submission; help article
  draft; final `/igor-audit-spec` pass.

## Notes for the Implementer

- **This is the fifth vendor copy of `packages/*`.** The Contentful decision log said "extract
  a published `@sirv/dam-core` once Storyblok also consumes them"; that threshold is long
  passed. Still: **vendor here anyway** (velocity, consistency), but write a short
  `docs/dam-core-extraction-notes.md` capturing anything Payload-specific that would affect the
  extraction (React 19, RSC constraints). The extraction is its own future project across all
  five repos.
- **Payload custom components are path strings, not imports.** Field/Cell/View components are
  registered as `'@sirv/payload-plugin/client#SirvMediaField'`-style references resolved by the
  host's import map. Ship a dedicated client-components subpath export; test that
  `generate:importmap` resolves it in the example app.
- **Mind the RSC boundary.** Payload v3 admin is Next.js App Router; everything interactive is
  `'use client'`. `@sirv/core` hooks/components are client-only — fine, but the plugin's
  endpoints/global/config code must not import them (keep server and client entry points
  separate, mirroring how `@payloadcms/*` plugins split exports).
- **Bearer caching:** mint on demand, cache in memory with expiry (~20 min minus skew) on both
  sides; `PayloadTokenStore` should refresh transparently on 401, same as the Strapi service.
- **When in doubt, do what the Strapi port did** (closest host: server-side runtime, admin as
  React SPA-ish layer) and record divergences in `docs/port-notes-from-sanity.md`.
- Conversation with Igor in Ukrainian; all files in English.
