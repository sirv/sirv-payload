# Sirv for Payload CMS

Monorepo for [`@sirv/payload-plugin`](./apps/payload-plugin) - the official
[Sirv](https://sirv.com) media plugin for [Payload CMS](https://payloadcms.com) v3. Browse the
Sirv DAM and pick images, videos, 360 spins, views and 3D models inside the Payload admin, and
render them on the frontend with [`@sirv/react`](https://www.npmjs.com/package/@sirv/react).

See the plugin's [README](./apps/payload-plugin/README.md) for install and usage.

## Layout

```
apps/payload-plugin/   the @sirv/payload-plugin npm package
packages/              vendored, host-agnostic Sirv core (no Payload imports)
  core/                headless DAM hooks + components
  sirv-client/         Sirv REST client (token mint, browse, search, account)
  url-builder/         pure Sirv URL / srcset builders
examples/payload/      runnable Next.js 15 + Payload v3 app
docs/                  API notes, Payload gotchas, port notes
DECISIONS.md           running decision log
```

`packages/*` are vendored verbatim from the Sirv Sanity monorepo and must never import Payload;
this is enforced by Biome `noRestrictedImports`, `scripts/check-package-boundaries.mjs`, and a
Vitest assertion (`pnpm boundaries`).

## Develop

```bash
pnpm install
pnpm check            # boundaries + lint + typecheck + test
pnpm --filter @sirv/payload-plugin build
```

Live smoke tests against a real Sirv account (skipped by default):

```bash
cp .env.example .env.local          # fill SIRV_CLIENT_ID / SIRV_CLIENT_SECRET
set -a; source .env.local; set +a; SIRV_LIVE=1 pnpm test
```

Run the example app: see [`examples/payload/README.md`](./examples/payload/README.md).

## License

MIT
