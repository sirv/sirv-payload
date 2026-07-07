# Sirv + Payload example

A Next.js 15 + Payload v3 app with `@sirv/payload-plugin` installed. It demonstrates:

- the Sirv settings/connect view at `/admin/sirv`,
- a `posts` collection using all three field factories (`sirvMediaField`,
  `sirvMediaListField`, `sirvAssetUrlField`),
- a frontend page (`/`) rendering stored `sirvMedia` values with the published `@sirv/react`.

## Run

From the monorepo root (so the workspace `@sirv/payload-plugin` resolves and builds):

```bash
pnpm install
pnpm --filter @sirv/payload-plugin build      # emit the plugin's dist the app consumes
cd examples/payload
cp .env.example .env                           # set PAYLOAD_SECRET
pnpm payload generate:importmap                # regenerate src/app/(payload)/admin/importMap.js
pnpm dev                                        # http://localhost:3005
```

First run: open `http://localhost:3005/admin`, create the first admin user, then go to
**Sirv** in the nav (`/admin/sirv`) and paste your REST Client ID + Secret (Sirv account >
Settings > API). Pick a delivery domain if prompted.

Then create a **Post**: each Sirv field opens the DAM browser. Pick images, videos, 360 spins,
views, and 3D models. Save, then visit `/` to see them rendered by `@sirv/react`.

## Notes

- The client secret never reaches the browser: it is stored encrypted in the `sirv-settings`
  global and the bearer token is minted server-side by `POST /api/sirv/token`. Verify in
  devtools that no response contains the secret.
- `payload generate:importmap` must be re-run whenever the plugin's component set changes. The
  checked-in `importMap.js` is pre-generated so the example runs immediately.
- The frontend page also renders a static sample of every media type, so it shows content even
  before you create any posts. Those samples use the Sirv demo domain and are illustrative.
