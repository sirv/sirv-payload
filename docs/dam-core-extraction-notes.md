# `@sirv/dam-core` extraction notes (flag for later)

Not an action item. This captures the Payload-specific facts that a future extraction of the
vendored `packages/{url-builder,sirv-client,core}` into a published `@sirv/dam-core` would have to
absorb, so they are not lost. Today: keep vendoring (fifth consumer; still cheaper to copy than to
publish and version a shared package).

## React 19 (Payload v3 admin)

- `@sirv/core` currently declares `peerDependencies.react: "^18.0.0"`. Payload v3's admin is
  **React 19**, which that range does not satisfy. In the vendored copy widen it to
  `"^18.0.0 || ^19.0.0"`. A published `@sirv/dam-core` must ship this wider range from day one.
  `@sirv/react` already does (`^18.0.0 || ^19.0.0`), so there is precedent.
- `url-builder` and `sirv-client` have no React peer, so they are unaffected; only `core` needs the
  widening. Re-run the `core` hook/component tests under React 19 + React Testing Library before
  trusting the port (`react`/`react-dom`/`@types/react*` devDeps also bump to 19 in this repo).

## RSC / `'use client'` constraints (App Router)

- Payload v3 admin is a Next.js App Router surface. Everything in `@sirv/core` that uses hooks/state
  (`useSirvAuth`, `useFolders`, `useSearch`, `useTypeFilter`, and all components) is client-only and
  must sit behind a `'use client'` boundary in the consuming components. The vendored source has no
  `'use client'` directive of its own, so the host wrappers must supply it (as `@sirv/react` does at
  its entry). A published `@sirv/dam-core` should mark its client entry `'use client'` and consider
  a server-safe subpath that exposes only the non-React parts.
- The plugin's **server half** (plugin config, `sirv-settings` global, `/api/sirv/*` endpoints)
  must import **only** `@sirv/sirv-client` + `@sirv/url-builder` (both React-free, browser+Node
  safe) and never `@sirv/core`. An extraction should preserve this split - ideally distinct entry
  points (`@sirv/dam-core/client` vs a React-free `@sirv/dam-core/rest`) so a server bundle cannot
  accidentally pull React in.

## Token-provider seam (would remove Payload's app-side wrapper)

- `createSirvClient` supports only `{ clientId, clientSecret }` (mint via Sirv) or `{ accessToken }`
  (static, `canRefresh: false`). Payload's hybrid flow needs "refresh the bearer by calling an
  arbitrary async function" (`POST /api/sirv/token`), which neither mode covers, so the port adds an
  app-side wrapper that re-fetches on `SirvApiError.status === 401` / near expiry.
- Extraction opportunity: add a third `SirvClientOptions` variant, e.g.
  `{ tokenProvider: (force?: boolean) => Promise<string> }`, wired to a `TokenManager` that honours
  the same 60s expiry skew and refresh-on-401 path as `createTokenManager`. That would let the
  browser-direct hosts (Payload, and any future proxy-free host) drop the bespoke wrapper.

## `TokenStorage` seam mismatch for server-secret hosts

- The `TokenStorage` interface (`read/write/clear` over `StoredCredentials`, which include
  `clientSecret`) assumes a browser that legitimately holds the secret (Sanity/Contentful/
  Storyblok). Server-secret hosts (Strapi, Payload) cannot honour it in the admin without leaking
  the secret, so both bypass it: Strapi keeps `StrapiTokenStorage` as a status-only client; Payload
  uses a bearer *provider* instead. A future `@sirv/dam-core` should formalise this as two distinct
  seams - a credentials store (client-secret hosts) and a bearer/token provider (server-secret
  hosts) - rather than overloading `TokenStorage`.

## Misc

- All three packages are `version: 0.0.0`, `type: module`, `main/module/types` pointing at raw
  `./src/index.ts` (workspace-internal, TS-consumed). Publishing `@sirv/dam-core` means adding a
  real build (tsup, ESM+CJS+d.ts) as `@sirv/react` already has, plus real semver.
- The Sanity-era Zod value schemas still exported from `@sirv/core` (`SirvImageValueSchema`, the
  nested `sirv.image` shape) are unused by the flat-`sirvMedia` hosts. An extraction could drop them
  or move them behind a `legacy` subpath to avoid confusing new consumers.
