# @sirv/payload-plugin

Add [Sirv](https://sirv.com) as a first-class media source inside the [Payload CMS](https://payloadcms.com)
v3 admin panel. Connect a Sirv account, browse the Sirv DAM (folders, search, type filters,
previews, multi-select), and pick images, videos, 360 spins, views, 3D models, or generic files.
Picked assets are stored as a flat `sirvMedia` JSON value and render on the frontend with
[`@sirv/react`](https://www.npmjs.com/package/@sirv/react).

- **Secure by design.** Your Sirv REST secret is stored encrypted server-side and never reaches
  the browser. A plugin endpoint mints short-lived (20 min) bearer tokens on demand; the admin
  browses the DAM directly against `api.sirv.com` with that bearer only.
- **Every Sirv media type.** image, video, 360 spin (`.spin`), view (`.view`), 3D model
  (`.glb`), plus generic files (PDF/zip) in URL mode.
- **Three field factories.** single, gallery (multi-select, drag-reorder), and URL.

Targets Payload `^3.x` (React 19 / Next.js 15).

## Install

```bash
pnpm add @sirv/payload-plugin
# npm i @sirv/payload-plugin   (you may need --legacy-peer-deps on npm; pnpm is recommended)
```

### 1. Add the plugin to your Payload config

```ts
// payload.config.ts
import { buildConfig } from 'payload';
import { sirvPlugin, sirvMediaField, sirvMediaListField, sirvAssetUrlField } from '@sirv/payload-plugin';

export default buildConfig({
  // ...
  plugins: [sirvPlugin()],
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text' },
        sirvMediaField({ name: 'hero' }),                       // single asset
        sirvMediaListField({ name: 'gallery' }),                // gallery (multi-select)
        sirvMediaField({ name: 'spin', allowedTypes: ['spin'] }), // restrict to one type
        sirvAssetUrlField({ name: 'attachment' }),              // URL (allows PDF/zip)
      ],
    },
  ],
});
```

### 2. Regenerate the import map

Payload resolves the plugin's admin components through its import map. Run this after install and
after any upgrade that changes the component set (it is otherwise not re-run by a production
build):

```bash
pnpm payload generate:importmap
```

### 3. Import the stylesheet

Import the admin stylesheet once so the DAM browser and field components are styled. In an App
Router Payload project, add it to `src/app/(payload)/custom.scss`:

```scss
@import '@sirv/payload-plugin/styles.css';
```

### 4. Connect your Sirv account

Start the app, open the admin, and click **Sirv** in the sidebar (or visit `/admin/sirv`). Paste
your REST **Client ID** and **Secret** (Sirv account > Settings > API > REST API tokens) and pick
a delivery domain if prompted. That is it.

## Field factories

All three accept `{ name, label?, required?, allowedTypes?, admin? }` and return a standard
Payload field config, so you can drop them into any collection or global.

| Factory | Payload field | Stored value |
|---|---|---|
| `sirvMediaField` | `json` | one `sirvMedia` object |
| `sirvMediaListField` | `json` | array of `sirvMedia` objects |
| `sirvAssetUrlField` | `text` | delivery URL string |

`allowedTypes` restricts the DAM browser to a subset of
`'image' | 'video' | 'spin' | 'view' | 'model'` (the URL field additionally allows `'file'`).

## Stored value shape

`sirvMedia` fields store a flat, CMS-neutral JSON value (the same shape used by the Sirv Sanity,
Storyblok, Contentful and Strapi plugins):

```jsonc
{
  "_type": "sirvMedia",
  "mediaType": "image",        // image | video | spin | view | model
  "sirvPath": "/products/shoe.jpg",
  "sirvAlias": "your-alias.sirv.com",
  "originalUrl": "https://your-alias.sirv.com/products/shoe.jpg",
  "bytes": 12345,
  "width": 1200, "height": 800,
  "alt": "...", "caption": "..."
}
```

## Render on the frontend with `@sirv/react`

Because Payload v3 runs inside Next.js, rendering is trivial:

```tsx
import { SirvMedia, fromSanityMedia } from '@sirv/react';

export function Hero({ value }) {
  // `value` is the stored sirvMedia object from your Payload document.
  return <SirvMedia value={fromSanityMedia(value)} />;
}
```

`fromSanityMedia` reads the flat `sirvMedia` shape directly, so no conversion layer is needed. See
the runnable [`examples/payload`](https://github.com/sirv/sirv-payload/tree/main/examples/payload)
app for image / video / spin / view / model rendering.

## How the security model works

1. Credentials live in an admin-only `sirv-settings` global. The `clientSecret` field is
   encrypted at rest (AES-256-GCM, key derived from your `PAYLOAD_SECRET`) and its read access is
   hard-denied, so it is never returned to the admin UI or the REST/GraphQL API.
2. `POST /api/sirv/token` mints a 20-minute bearer server-side from the stored credentials.
3. The admin browser caches that bearer and calls `api.sirv.com` directly for DAM browsing. The
   secret never leaves your server.

## Requirements

- Payload `^3.37.0` (any recent 3.x), React 19, Next.js 15.
- A Sirv account with REST API credentials.

## License

MIT
