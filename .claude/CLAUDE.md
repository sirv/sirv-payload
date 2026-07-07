# Sirv Payload Plugin — Project Context

## What this is

A Payload CMS v3 plugin (`@sirv/payload-plugin`) that adds Sirv as a first-class media source
inside the Payload admin panel. Editors connect a Sirv account (paste REST Client ID + Secret,
pick delivery domain), browse the Sirv DAM (folders, search, type filters, previews,
multi-select), and pick assets. Picked assets are stored as the series-standard flat `sirvMedia`
JSON value and rendered on the frontend with the published `@sirv/react` package.

Supported media types: **image, video, 360 spin (`.spin`), view (`.view`), 3D model (`.glb`)**,
plus generic **file** (PDF/zip) in URL mode — matching the shipped Sanity plugin.

This is the **fifth headless-CMS port** of the shared Sirv DAM core, after Sanity, Storyblok,
Contentful, and Strapi (all shipped). It should be the cheapest port yet.

## Read this first

Full spec: `payload-plugin.md` at the repo root. Read it completely before writing any code.
Keep `DECISIONS.md` (running decision log) current — copy the Contentful project's method.

## Hard constraints (summary — spec wins on conflict)

1. Single npm package `@sirv/payload-plugin`: `sirvPlugin(options) → (config) => config`.
   Targets Payload `^3.x` (v4 is beta-only; keep the integration surface small).
2. **Auth:** paste Client ID + Secret + delivery-domain pick — same as all shipped Sirv CMS
   plugins. Zero credentials shipped. NO email/OTP flow (removed across the series).
3. **Secret never reaches the browser.** Credentials in the `sirv-settings` Payload global
   (encrypted, admin-only); `POST /api/sirv/token` mints the 20-min bearer server-side; the
   admin browser talks to api.sirv.com directly with that bearer only.
4. No external backend service; no Sirv core changes.
5. **Vendor** `packages/{core,sirv-client,url-builder}` verbatim from
   `/Users/igor/Projects/Sirv/extensions/sanity/`. Guardrails ban `payload` / `@payloadcms/*`
   imports from `packages/` (Biome + boundary script + Vitest assertion).
6. Stored value = frozen flat `sirvMedia` JSON (same as the other four plugins). Fields are
   **factories** returning standard Payload field configs (`json` / `text`) with custom
   admin components: `sirvMediaField`, `sirvMediaListField`, `sirvAssetUrlField`.
7. Not an upload storage adapter (that's v1.1 roadmap: `@sirv/payload-storage`).

## Tech stack

TypeScript; React (Payload v3 admin = React 19 — verify `@sirv/core` peers); `@payloadcms/ui`
for admin chrome around the headless `@sirv/core` components (`sirv-*` CSS classes); Zod on
every boundary; Vitest + React Testing Library; Biome; pnpm workspaces.

## Reference material

- Sirv REST API docs (source of truth): `/Users/igor/www/sirv/sirv/rest-api/docs-next/`
- Payload docs: plugins/build-your-own, custom-components (import map!), fields, globals,
  custom endpoints.
- Sister repos: `../sanity` (origin of shared packages), `../strapi` (closest host
  architecturally), `../contentful/DECISIONS.md`, `../storyblok/PORTING-GUIDE.md`.
- Frontend renderer: published `@sirv/react` (repo `../sirv-react`) — use as-is.

## Credentials — two paths

1. **End users (the product):** own per-account Client ID + Secret pasted in the Sirv settings
   admin view; persisted encrypted in the `sirv-settings` global; bearer minted on demand.
2. **Developer/CI (testing only):** `.env.local` (gitignored) with `SIRV_CLIENT_ID` /
   `SIRV_CLIENT_SECRET`, live tests gated by `SIRV_LIVE=1`. Never committed, never logged.
   npm publish via temporary gitignored `.npmrc`, deleted after.

## Payload-specific gotchas

- Custom admin components are **import-path strings** resolved via the host's import map —
  users must run `payload generate:importmap` after install; ship a client subpath export.
- Payload v3 admin is Next.js App Router: interactive components are `'use client'`; keep
  server code (plugin config, global, endpoints) free of `@sirv/core` imports.
- Cache the 20-min bearer with expiry skew; refresh transparently on 401.

## What "done" means for MVP

1. Fresh Payload v3 project: install + `sirvPlugin()` + `generate:importmap` → Sirv settings
   view appears; connect flow works; secret absent from all browser traffic.
2. All three field factories work; every media type pickable; values persist in the frozen
   shape; list-view cells show thumbnails.
3. `examples/payload/` renders image/video/spin/view/model via `@sirv/react`.
4. `packages/*` green with zero Payload imports (CI-enforced boundaries).
5. Published to npm; submitted to the Payload community plugins directory.

## Things to NOT do

- Don't rebuild the DAM browser — reuse `@sirv/core` headless components.
- Don't replace Payload's upload storage (wrong layer for MVP).
- Don't put Payload-specific code in `packages/` (one-way contract: app depends on packages).
- Don't reintroduce email/OTP auth or any bootstrap credential.
- Don't publish `@sirv/dam-core` from here — note extraction findings in
  `docs/dam-core-extraction-notes.md` instead.

## Working method

Milestones M0–M6 in `payload-plugin.md`. **Stop after each milestone and report.** Run
`/igor-audit-spec` between milestones. Ukrainian for conversation, English for files.
