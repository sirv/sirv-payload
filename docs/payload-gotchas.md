# Payload CMS v3 - Gotchas Reference for `@sirv/payload-plugin`

Research notes gathered from the official Payload v3 docs (July 2026). Each claim cites the
source doc URL. Facts that could not be confirmed from docs are marked **NEEDS VERIFICATION**.

Primary sources:
- Plugin authoring: https://payloadcms.com/docs/plugins/build-your-own
- Custom components + import map: https://payloadcms.com/docs/custom-components/overview
- Admin components: https://payloadcms.com/docs/admin/components
- Custom views: https://payloadcms.com/docs/custom-components/custom-views
- JSON field: https://payloadcms.com/docs/fields/json
- Fields overview (hooks): https://payloadcms.com/docs/fields/overview
- Globals: https://payloadcms.com/docs/configuration/globals
- REST / custom endpoints: https://payloadcms.com/docs/rest-api/overview
- Access control: https://payloadcms.com/docs/access-control/overview
- Releases: https://github.com/payloadcms/payload/releases

---

## 1. Exact minimum Payload v3 version to target

- Current stable 3.x at time of research: **v3.85.2**, released **2026-07-01**
  (source: https://github.com/payloadcms/payload/releases). The 3.x line ships frequent
  patch/minor releases (v3.80.0 in March 2026 up through v3.85.2 in July 2026), all backward
  compatible: "Payload 3.0 is stable, with no further breaking changes as long as we're on
  this version."
- **v4 status:** No 4.0 alpha, beta, or pre-release tag appears on the GitHub releases page as
  of 2026-07-01. Payload 4.0 is described as "in progress" and "not stable"; for production,
  Payload 3 is the recommended choice
  (source: WebSearch, buildwithmatija.com/blog/payload-4-0, GitHub releases). Treat v4 as
  not-yet-shippable and target v3.

**Recommendation for `peerDependencies`:**

```json
{
  "peerDependencies": {
    "payload": "^3.37.0"
  }
}
```

- Pin the floor to a mid-3.x minor rather than `^3.0.0`. The import-map component-object syntax
  (`{ path, exportName }`), the Web-standard `Response.json()` endpoint handler signature, and
  the App-Router RSC component model were all present and stable well before mid-2026, but the
  exact minor that froze each surface is **NEEDS VERIFICATION**. `^3.37.0` is a safe, widely
  available floor; bump it if CI on the dev app reveals an API added later. `^3.x` (i.e.
  `>=3 <4`) is the correct upper bound - it keeps you off the unstable v4.

---

## 2. Import-map resolution for a plugin's client components

This is the single most important Payload-specific mechanic for this plugin.

**Why it exists.** Payload keeps its config "fully Node.js compatible and as lightweight as
possible", so the config file cannot directly `import` React client components. Instead every
custom component is referenced by a **path string**, and a generated **import map** maps those
strings to real modules
(source: https://payloadcms.com/docs/custom-components/overview).

**Path-string syntax** (source: same page):

```js
// Named export via hash
Field: '@sirv/payload-plugin/client#SirvMediaField'

// Default export (no hash)
Field: '@sirv/payload-plugin/client'

// Object form (equivalent to the hash form)
Field: { path: '@sirv/payload-plugin/client', exportName: 'SirvMediaField' }
```

Paths are resolved relative to the project base dir (cwd, or
`config.admin.importMap.baseDir`). Bare package specifiers like
`@sirv/payload-plugin/client#SirvMediaField` resolve through normal Node module resolution,
which is exactly how a third-party plugin ships components.

**What `payload generate:importmap` does.** It scans every Custom Component path in the config
and writes a generated file that imports each one, keyed by its path string. The file lives in
the **host app** at one of:

- `src/app/(payload)/admin/importMap.js`
- `app/(payload)/admin/importMap.js`

(source: https://payloadcms.com/docs/custom-components/overview). This file must never be edited
by hand. It auto-regenerates on app startup and during dev HMR, but **not** during normal
runtime and **not** after a production build - so a user who adds the plugin and builds without
regenerating will get unresolved components.

**What the plugin must ship.** A resolvable **client subpath export** that exposes the React
components as named exports. In `package.json`:

```json
{
  "exports": {
    ".":        { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./client": { "types": "./dist/client/index.d.ts", "import": "./dist/client/index.js" }
  }
}
```

The `./client` entry's source file starts with `'use client'` and re-exports
`SirvMediaField`, `SirvMediaListField`, `SirvAssetUrlField`, the settings View, and any Cell
components. Field factories reference them by the bare specifier
`@sirv/payload-plugin/client#SirvMediaField`.

**What the README must tell users to run** (mandatory, or components 404):

```bash
payload generate:importmap
```

Run it after installing the plugin and after any upgrade that changes the component set. In a
typical project this is `pnpm payload generate:importmap`. Note that the host's
`package.json` "build" script for Payload apps usually already chains this before `next build`;
call it out anyway because a fresh install will not have re-run it.

---

## 3. The RSC / `'use client'` split

Payload v3's admin panel is a Next.js App Router app. "All Custom Components in Payload are
React Server Components by default"; interactivity requires the `'use client'` directive
(source: https://payloadcms.com/docs/custom-components/overview).

**Server side of the plugin (no client-only imports):**
- The plugin function `sirvPlugin(options) => (config) => config`.
- The `sirv-settings` global config and its field/access/hook definitions.
- Custom endpoints (`endpoints: [...]`) including the `POST /api/sirv/token` handler.
- Field **configs** produced by the factories (the plain `json`/`text` field objects). The
  config is server-safe; only the referenced component modules are client.

Keep all of the above free of `@sirv/core`, React, and browser APIs. Per the CLAUDE.md hard
constraint, `@sirv/core` imports live only behind `'use client'` in the `./client` bundle,
never in the server entry.

**Client side (`'use client'`, shipped under `./client`):**
- `SirvMediaField`, `SirvMediaListField`, `SirvAssetUrlField` Field components.
- Cell components for list-view thumbnails.
- The Sirv settings admin View and the DAM browser (wraps headless `@sirv/core`).

**How official `@payloadcms/*` plugins split exports.** They use the same two-entry shape:
the root export (`.`) is server-safe config code that the user imports in
`payload.config.ts`; a `./client` (or `#/rsc` in some packages) subpath holds the
`'use client'` component bundle referenced only by path string, never imported into the config.
This keeps the config Node-compatible while letting `generate:importmap` pull the client
bundle into the browser build. Mirror that split exactly.

**Practical guardrail:** if the server entry (`.`) ever transitively imports the client entry,
Next will try to pull React client code into server config evaluation. Enforce the one-way
boundary (config -> path string -> importMap -> client bundle) and keep `@sirv/core` out of
`.` entirely. This aligns with the existing Biome/boundary-script guardrails in `packages/`.

---

## 4. React 19 peer-dep compatibility

- Payload v3's admin requires **React 19** and **Next.js 15+** ("Updating to Next.js 15
  requires an update to react@19"; v3 needed a React newer than Next 15's default at the time)
  (source: WebSearch - payloadcms/payload issues #7301, #8995; dev.to Next15+Payload3 writeup).
  The exact pinned React range inside Payload's own `package.json` is **NEEDS VERIFICATION**,
  but functionally the host app runs React 19.
- **Action for this plugin:** verify `@sirv/core`'s React peer range admits 19. A range such as
  `>=18 <20` or `^18 || ^19` is compatible; a hard `^18.0.0` cap would exclude React 19 and
  must be widened. `@sirv/payload-plugin` should itself declare React as a peer (not a
  dependency) with a range that includes 19, e.g. `"react": "^19.0.0"` (or `"^18 || ^19"` if
  the shared components must also run on the other CMS hosts) to inherit the host's single React
  copy.
- Ecosystem note: React 19 triggers peer-dep warnings from older transitive libs (e.g.
  `@monaco-editor/react`); npm users may need `--legacy-peer-deps`, and Payload recommends
  pnpm. Not a blocker for us, but worth a README line.

---

## 5. Known v4-beta migration risks

No v4 release exists yet, so this is forward-looking risk assessment, not confirmed migration
steps. All items below are **NEEDS VERIFICATION** against a future v4 migration guide. Payload
4.0 is framed as "more polished / more scalable", i.e. incremental rather than a rearchitecture,
which is reassuring for a small integration surface (source: WebSearch, buildwithmatija).

Per plugin surface:
- **Fields (`json`/`text` factories):** Lowest risk. Field config shape (`name`, `type`,
  `admin.components.Field/Cell`) is core and stable. Watch for renamed/relocated
  `admin.components` keys.
- **Custom endpoints:** Handler already uses Web-standard `Request`/`Response.json()` in v3
  (source: https://payloadcms.com/docs/rest-api/overview), which aligns with the App Router
  direction, so low migration risk. Watch for `PayloadRequest` shape changes
  (`req.routeParams`, `req.json()`).
- **One global (`sirv-settings`):** Low risk. `GlobalConfig` (`slug`, `fields`, `access`,
  `admin`) is core. Watch for access-control signature tweaks.
- **One custom admin view:** **Highest risk.** `admin.components.views` registration,
  `path`/`Component`/`exact` semantics, and view props are the surface most likely to shift
  between major versions. Isolate the settings View behind a thin adapter so a v4 bump touches
  one file.
- **Import map:** Medium risk. The generated file location and the `generate:importmap` command
  could move or change output format in v4. The path-string reference contract itself is
  fundamental and unlikely to disappear, but the generation mechanics may change - keep the
  README's "run generate:importmap" instruction version-agnostic.

**Mitigation:** keep the v3 integration surface minimal (per CLAUDE.md constraint 1), isolate
each Payload touch point (view, endpoint, global, field factory) in its own module, and gate
the v4 port on an official migration guide.

---

## Briefly: mechanics with code snippets

### Plugin function signature

Source: https://payloadcms.com/docs/plugins/build-your-own. Higher-order
`(options) => (config) => config`. Use spread to preserve existing arrays; wrap `onInit`
instead of spreading (functions cannot be spread).

```ts
import type { Config } from 'payload'

export const sirvPlugin =
  (pluginOptions: SirvPluginOptions) =>
  (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }

    config.globals = [...(config.globals || []), sirvSettingsGlobal]

    config.endpoints = [...(config.endpoints || []), sirvTokenEndpoint]

    // Register the settings admin view (path string -> resolved via import map)
    config.admin = {
      ...(config.admin || {}),
      components: {
        ...(config.admin?.components || {}),
        views: {
          ...(config.admin?.components?.views || {}),
          sirvSettings: {
            Component: '@sirv/payload-plugin/client#SirvSettingsView',
            path: '/sirv-settings',
          },
        },
        // afterNavLinks adds a sidebar link to the view (component path string)
        afterNavLinks: [
          ...(config.admin?.components?.afterNavLinks || []),
          '@sirv/payload-plugin/client#SirvNavLink',
        ],
      },
    }

    // Extend, do not replace, any existing onInit
    const existingOnInit = config.onInit
    config.onInit = async (payload) => {
      if (existingOnInit) await existingOnInit(payload)
      // one-time setup if needed
    }

    return config
  }
```

Note: `afterNavLinks` is Payload's standard slot for adding sidebar nav links; it takes an
array of component path strings. The docs pages fetched did not reproduce the `afterNavLinks`
example verbatim, so treat the exact key name as **NEEDS VERIFICATION** against
https://payloadcms.com/docs/admin/components (the mechanism - a component-path array under
`admin.components` - is confirmed; the precise slot name should be double-checked).

### Custom endpoint (Web Request/Response handler)

Source: https://payloadcms.com/docs/rest-api/overview. Handlers receive a `PayloadRequest`
(Web `Request` plus `req.user`, `req.payload`, `req.json()`, `req.routeParams`) and return a
standard `Response`. Endpoints are **not authenticated by default** - guard them yourself.

```ts
import type { Endpoint } from 'payload'

export const sirvTokenEndpoint: Endpoint = {
  path: '/sirv/token',
  method: 'post',
  handler: async (req) => {
    // Admin-only guard - endpoints are unauthenticated by default
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read encrypted creds from the global via the Local API (secret stays server-side)
    const settings = await req.payload.findGlobal({ slug: 'sirv-settings' })
    const bearer = await mintSirvBearer(settings.clientId, settings.clientSecret)

    return Response.json({ token: bearer.token, expiresIn: bearer.expiresIn })
  },
}
```

The final path is prefixed by the configured API route, so this resolves at `POST
/api/sirv/token` by default.

### Global with an encrypted, admin-only secret field

Sources: https://payloadcms.com/docs/configuration/globals,
https://payloadcms.com/docs/access-control/overview,
https://payloadcms.com/docs/fields/overview.

- Global-level `access.read/update` gate the whole singleton to admins
  (`Boolean(req.user)` is Payload's default; tighten to a role check as needed).
- Field-level `access` on the secret adds defense in depth.
- Field-level `hooks.beforeChange` encrypts before persist; `hooks.afterRead` decrypts on read.
  Combine with `admin.readOnly`/hidden handling so the ciphertext never surfaces to the browser.

```ts
import type { GlobalConfig } from 'payload'

const adminOnly = ({ req: { user } }) => Boolean(user) // tighten to user?.role === 'admin'

export const sirvSettingsGlobal: GlobalConfig = {
  slug: 'sirv-settings',
  access: {
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: 'Sirv',
  },
  fields: [
    {
      name: 'clientId',
      type: 'text',
    },
    {
      name: 'clientSecret',
      type: 'text',
      access: {
        // never send the secret to the admin browser on read
        read: () => false,
        update: adminOnly,
      },
      hooks: {
        beforeChange: [
          ({ value }) => (value ? encrypt(value) : value),
        ],
        afterRead: [
          // decrypt only server-side (Local API); field read access blocks the browser
          ({ value }) => (value ? decrypt(value) : value),
        ],
      },
    },
    {
      name: 'deliveryDomain',
      type: 'text',
    },
  ],
}
```

Caveat: `afterRead` runs for Local-API reads too, so the token endpoint above receives the
decrypted secret - which is what we want (server mints the bearer). The `read: () => false`
field access is what stops the plaintext (or ciphertext) from reaching the admin UI / REST
responses. Verify this interplay in the dev app: field-level `read` access should win over the
hook for API/browser responses while the Local API in the endpoint (which bypasses access
control by default) still gets the decrypted value.

### Field config referencing a client component by path string

Sources: https://payloadcms.com/docs/fields/json,
https://payloadcms.com/docs/custom-components/overview. The factory returns a plain,
server-safe `json` field whose `admin.components.Field` and `.Cell` are **path strings**
resolved through the import map - the component modules themselves are never imported here.

```ts
import type { Field } from 'payload'

export const sirvMediaField = (overrides?: Partial<Field>): Field => ({
  name: 'sirvMedia',
  type: 'json',
  admin: {
    components: {
      Field: '@sirv/payload-plugin/client#SirvMediaField',
      Cell:  '@sirv/payload-plugin/client#SirvMediaCell', // list-view thumbnail
    },
    ...overrides?.admin,
  },
  ...overrides,
})
```

Custom Field/Cell components receive `clientField`, `path`, `permissions`, and `schemaPath`
props (client components get `clientField` with non-serializable props stripped); server
components get the full `field` object plus the injected `payload` and `i18n`
(source: https://payloadcms.com/docs/custom-components/overview,
https://payloadcms.com/docs/fields/json).
