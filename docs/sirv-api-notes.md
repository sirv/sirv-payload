# Sirv REST API Notes

Practical reference for the `@sirv/payload-plugin` project. This is the subset of the Sirv
REST API that the plugin actually calls: mint a bearer from a pasted Client ID + Secret,
discover delivery domains, browse/search the DAM, and read asset metadata.

## Sources

- Public REST docs: `/Users/igor/www/sirv/sirv/rest-api/docs-next/`
  (`llms.txt`, `llms-full.txt`, `md/`, `openapi.json`, `openapi.3.json`,
  `sirv.postman_collection.json`). NOTE: the OpenAPI/Postman response examples are
  auto-generated placeholders (search response shows `"string"`, `meta` shows `{}`), so they
  document the endpoints but not the real payload shapes.
- Real, live-verified response shapes come from the vendored `sirv-client` package
  (`/Users/igor/Projects/Sirv/extensions/sanity/packages/sirv-client/src/{types,account,dam,asset-type,token-manager}.ts`)
  and the Sanity project's live-captured notes
  (`/Users/igor/Projects/Sirv/extensions/sanity/docs/sirv-api-notes.md`, account "igor").
  These `packages/*` are vendored verbatim into this repo, so their Zod schemas are the
  contract the Payload plugin consumes.

## Payload-specific auth model (differs from the Sanity notes)

Per the project constraints, the Payload plugin uses **only** the machine / client-credentials
flow. There is **NO email/password/OTP connect flow** here (that whole path was removed across
the series). The editor pastes a REST **Client ID + Secret** into the `sirv-settings` Payload
global; the secret is stored encrypted server-side and **never reaches the browser**. A Payload
custom endpoint (`POST /api/sirv/token`) mints the 20-minute bearer server-side; the admin
browser then talks to `api.sirv.com` directly using only that bearer.

---

## Summary of endpoints

| # | Method | Path | Purpose | Plugin use |
| --- | --- | --- | --- | --- |
| 1 | POST | `/v2/token` | Mint short-lived bearer from Client ID + Secret | Server-side token mint (`/api/sirv/token`) |
| 2 | GET | `/v2/account` | Account info: alias, cdnURL, aliases (custom domains) | Delivery-domain picker + URL builder |
| 3 | GET | `/v2/files/readdir` | List one folder's immediate contents | DAM browser folder navigation |
| 4 | POST | `/v2/files/search` | Lucene search across the account | DAM type filters + search box |
| 5 | POST | `/v2/files/search/scroll` | Page a search past 1000 results | Edge case for very large accounts |
| 6 | GET | `/v2/files/stat` | Single-file info + computed meta (w/h/duration) | Resolve dimensions on pick |
| 7 | GET | `/v2/files/meta` | Editorial meta (title, description, tags) | Default alt / caption text |
| - | GET | `/v2/account/storage` | Storage allowance + usage (bytes) | Optional settings display |
| - | GET | `/v2/billing/plan` | Subscription plan | Optional settings display |
| - | GET | `/v2/account/limits` | Rolling 60-min API request quota | Optional rate-limit diagnostics |

Conventions:

- **Base URL:** `https://api.sirv.com/v2`. All paths are prefixed with `/v2`.
  (In code: `SIRV_API_BASE = 'https://api.sirv.com/v2'`.)
- **Auth header:** every call except `POST /v2/token` requires `Authorization: Bearer <token>`.
- **Content type:** `application/json` for JSON request bodies.
- **File paths** are absolute and start with `/` (e.g. `/products/shoe-01.jpg`), EXCEPT
  `readdir.contents[].filename` which is a **basename** (see endpoint 3).
- **Query-search path escaping:** in the Lucene `query` string, escape leading slashes as `\/`
  (e.g. `dirname:\/products`).

---

## 1. Mint bearer token

| Method | Path |
| --- | --- |
| POST | `https://api.sirv.com/v2/token` |

The first call. Exchange the account's REST `clientId` + `clientSecret` for a short-lived
bearer. This is **client-credentials only** - there is no authorization-code OAuth and no
refresh token. To "refresh", just call `POST /v2/token` again.

Request body:

```json
{
  "clientId": "ZcnZNfzwRhQExoHFoGpxWJ4p2R",
  "clientSecret": "TM3d0Cf...==",
  "expiresIn": 1200
}
```

- `clientId` (string, required)
- `clientSecret` (string, required)
- `expiresIn` (number, optional) - requested TTL in seconds. Default **1200 (20 minutes)**.
  Schema bounds in openapi.3.json: `minimum: 5`, `maximum: 604800` (7 days). The docs prose,
  however, states tokens expire after 20 minutes; treat 1200 as the practical/default TTL and
  mark any longer TTL as NEEDS LIVE VERIFICATION.

Response:

```json
{
  "token": "<JWT access token>",
  "expiresIn": 1200,
  "scope": ["account:read account:write"]
}
```

- `token` - the bearer to send as `Authorization: Bearer <token>`.
- `expiresIn` - seconds until it expires (echoes the granted TTL).
- `scope` - array of space-separated scope strings.

How the plugin uses this:
The Payload endpoint `POST /api/sirv/token` reads the encrypted `clientId`/`clientSecret` from
the `sirv-settings` global and calls this endpoint **server-side**, then returns just the bearer
(and its expiry) to the admin browser. Cache the bearer with an expiry skew (the vendored client
uses `EXPIRY_SKEW_MS = 60_000`, i.e. re-mint if it expires within 60s) and transparently re-mint
once on a `401`. The secret must never be sent to the browser.

---

## 2. Account info (delivery-domain discovery)

| Method | Path |
| --- | --- |
| GET | `https://api.sirv.com/v2/account` |

Live response shape (account "igor"):

```json
{
  "dateCreated": "2014-05-30T06:30:47.848Z",
  "alias": "igor",
  "cdnURL": "igor.sirv.com",
  "cdnTempURL": "igor.sirv.com",
  "fetching": { "enabled": false, "type": "http" },
  "minify": { "enabled": false },
  "aliases": {
    "igor":  { "prefix": "/", "cdn": true },
    "igor3": { "prefix": "/", "cdn": true, "customDomain": "shugurov.com" }
  },
  "status": { "status": "active", "details": {} }
}
```

Fields the plugin relies on (the rest passes through untyped):

- `alias` (string) - the primary account name; the default CDN host is `<alias>.sirv.com`.
- `cdnURL` (string) - CDN host for building `https://<host>/<path>` delivery URLs.
- `cdnTempURL` (string) - fallback host.
- `aliases` (object, keyed by alias name) - each value may carry `customDomain`. This is how you
  enumerate the account's selectable **delivery domains**.

Discovering delivery domains (from the vendored `account.ts` `accountAliasOptions()`):

- If `aliases` is empty, offer a single option: `{ alias, host: cdnURL ?? "<alias>.sirv.com" }`.
- Otherwise, for each key in `aliases`: `host = customDomain` if set and non-empty, else
  `"<key>.sirv.com"`. The primary `alias` is sorted first; the rest sort alphabetically
  (numeric-aware).

How the plugin uses this:
Populates the delivery-domain dropdown in the Sirv settings view, and feeds the chosen host to
`packages/url-builder` for constructing asset URLs. The chosen host is persisted as
`deliveryAlias` in the stored credentials.

(NOTE: the OpenAPI example shows `cdnURL: "https://my-account.sirv.com"` with a scheme, while the
live account returned a bare host `"igor.sirv.com"`. The URL builder should tolerate both -
strip/normalize the scheme.)

---

## 3. Read folder contents (browse)

| Method | Path |
| --- | --- |
| GET | `https://api.sirv.com/v2/files/readdir?dirname=<path>` |

Parameters:

- `dirname` (query, required) - folder path; `/` for root.
- `continuation` (query, optional) - opaque token for the next page.

Pagination: up to **100 entries per page** (docs say 100; note the OpenAPI prose text also says
"100"). If the response includes a `continuation` field, resend the request with that value to get
the next page. No `continuation` field means the last page.

Live response shape (root):

```json
{
  "continuation": "<opaque token, present only if more pages>",
  "contents": [
    {
      "filename": "1x1.png",
      "mtime": "2025-02-04T09:25:19.175Z",
      "contentType": "image/png",
      "size": 81,
      "isDirectory": false,
      "meta": { "width": 1, "height": 1, "duration": 0 }
    },
    {
      "filename": ".Trash",
      "mtime": "2023-10-12T04:57:06.667Z",
      "size": 0,
      "isDirectory": true,
      "meta": {}
    },
    {
      "filename": "products05.view",
      "mtime": "2026-05-25T13:11:38.190Z",
      "contentType": "application/json",
      "size": 1107,
      "isDirectory": false,
      "meta": {}
    }
  ]
}
```

Entry fields (vendored `FileEntrySchema`): `filename` (string), `mtime` (string, optional),
`contentType` (string, optional), `size` (number), `isDirectory` (boolean), `meta` (optional
computed meta - see endpoint 6).

Important observations:

- **`filename` here is a basename, not a full path.** Build full paths by joining
  `dirname` + `/` + `filename`. (Contrast with `search`, where `filename` is absolute.)
- Folders have `isDirectory: true`, `size: 0`, no `contentType`, empty `meta`.
- Image files carry `meta.width` / `meta.height` / `meta.duration` (`duration` is `0` for stills).
- `.spin` and `.view` files report `contentType: "application/json"` - key off extension for type
  detection, never contentType (see section 6c).
- The root contains hidden/system folders (`.Trash`, `.processed`, `Profiles`, `Shared`). The
  browser should filter `.Trash` / dot-folders.

How the plugin uses this:
Drives folder-by-folder navigation in the `@sirv/core` DAM browser.

---

## 4. Search files (type filtering + search box)

| Method | Path |
| --- | --- |
| POST | `https://api.sirv.com/v2/files/search` |

The workhorse for the DAM browser's type filters and free-text search. Lucene-style query,
offset-paginated up to 1000 results.

Request body (vendored `searchFiles` sends `query`, `from`, `size`, optional `sort`, optional
`scroll`):

```json
{
  "query": "extension:.jpg AND mtime:[now-30d TO now] AND -dirname:\\/.Trash",
  "sort": { "mtime": "desc" },
  "from": 0,
  "size": 100,
  "scroll": false
}
```

- `query` (string) - Lucene query (fields below). Max length 1024.
- `sort` (object, optional) - e.g. `{ "filename.raw": "asc" }` or `{ "mtime": "desc" }`. Use the
  `filename.raw` keyword field for alphabetical sort.
- `from` / `size` - offset pagination; **max 1000 results total** per non-scroll search
  (`from` max 1000; `size` max per docs is 1000, though the request-schema `example` caps `size`
  at 100 - use a conservative page size). Vendored default `size` is 50.
- `scroll` (boolean, optional) - set `true` to start a scrolling search for > 1000 results.

Response is an **Elasticsearch-style envelope** (live-verified; the OpenAPI placeholder just
shows `"string"`):

```json
{
  "hits": [
    {
      "_index": "sirvfs-v4",
      "_id": "255dfe14...",
      "_score": 2,
      "_source": {
        "accountId": "toqx8kku...",
        "filename": "/.Trash/.processed/D3/jF/..._thumbnail.jpg",
        "dirname": "/.Trash/.processed/D3/jF",
        "basename": "..._thumbnail.jpg",
        "extension": ".jpg",
        "id": "a0IN1zKF...",
        "ctime": "2026-05-08T09:50:05.509Z",
        "mtime": "2026-06-09T04:02:46.592Z",
        "size": 30259,
        "contentType": "image/jpeg",
        "meta": { "width": 996, "height": 960, "format": "JPEG", "duration": 0 }
      }
    }
  ],
  "total": 3484,
  "_relation": "eq"
}
```

Vendored `SearchResponseSchema`: `hits` (array of `{ _id?, _source }`), `total` (number,
optional), `_relation` (string, optional - `"eq"` = exact, `"gte"` = at least),
`scrollId` (string, optional - present only when `scroll: true` was sent).

Key differences from `readdir`:

- Each result is wrapped in `_source`. **`_source.filename` is the FULL absolute path** (not a
  basename). It also exposes `dirname`, `basename`, `extension`, `contentType`, and a richer
  `meta` (which can include `format`, e.g. `"JPEG"`).

Searchable Lucene fields (from openapi.3.json `query.notes` + live): `filename`, `dirname`,
`extension`, `basename`, `ctime`, `mtime`, `size`, `contentType`, `isDirectory`, `meta.title`,
`meta.description`, `meta.tags`, `meta.approval.approved`, `meta.product.id` / `.name` / `.brand`
/ `.category1` / `.category2`, `meta.width`, `meta.height`, `meta.format`, `meta.duration`, plus
EXIF / IPTC / XMP fields (`meta.EXIF.*`, `meta.IPTC.*`, `meta.XMP.*`).

Type-filter recipes for the five media types + generic file:

```
Images:  contentType:image*
Videos:  contentType:video*
Spins:   extension:.spin
Views:   extension:.view
Models:  extension:.glb
```

Combine and scope, e.g.:

```
(contentType:image* OR contentType:video*) AND dirname:\/products AND -dirname:\/.Trash
```

Ranges: `size:[5242880 TO *]`, `mtime:[now-7d TO now]`. Negation with a leading `-`.

How the plugin uses this:
The DAM browser's type filter chips map to these query fragments; the search box appends a
free-text clause. `from`/`size` paging up to 1000 is sufficient for typical accounts.

---

## 5. Scroll (result sets > 1000)

| Method | Path |
| --- | --- |
| POST | `https://api.sirv.com/v2/files/search/scroll` |

Body: `{ "scrollId": "<id from the preceding /files/search or /files/search/scroll>" }`.

Start a scroll by sending `scroll: true` on `/v2/files/search`; the response carries `scrollId`;
keep posting it until results are exhausted. The scroll context lives ~30 seconds between calls.

How the plugin uses this:
Edge case only. Offset paging (endpoint 4) covers normal use; scroll is for accounts with very
large filtered result sets.

---

## 6. Asset metadata

There are two different meta "namespaces" that share the key name `meta`:

- **Computed** meta (width/height/format/duration) - returned inline by `readdir`, `search`, and
  `stat`.
- **Editorial** meta (title/description/tags/product/approval) - returned by `/v2/files/meta`.

### 6a. Stat a single file (computed meta)

| Method | Path |
| --- | --- |
| GET | `https://api.sirv.com/v2/files/stat?filename=<path>` |

`filename` (query, required) - absolute path.

Live response:

```json
{
  "mtime": "2026-06-09T04:02:46.592Z",
  "ctime": "2026-05-08T09:50:05.509Z",
  "contentType": "image/jpeg",
  "size": 30259,
  "isDirectory": false,
  "meta": { "width": 996, "height": 960, "duration": 0 }
}
```

Vendored `FileStatSchema`: `mtime?`, `ctime?`, `contentType?`, `size`, `isDirectory`,
`meta?`. Computed `meta` fields (`FileMetaSchema`, all nullable - the API returns `null`, not just
absent, and the client normalizes `null` to `undefined`): `width`, `height`, `duration` (seconds;
`0` for images), `format` (present in `search`, often absent in `stat`/`readdir`).

How the plugin uses this:
On pick, resolve exact `width`/`height` (and `duration` for video) to store in the frozen
`sirvMedia` value and to set correct aspect ratios for the `@sirv/react` renderer.

### 6b. Editorial meta (alt / caption source)

| Method | Path |
| --- | --- |
| GET | `https://api.sirv.com/v2/files/meta?filename=<path>` |
| POST | `https://api.sirv.com/v2/files/meta?filename=<path>` |

`GET /v2/files/meta` response (fields from `Model1`):

```json
{
  "tags": ["string"],
  "title": "Product photo",
  "description": "A high-resolution product photo.",
  "product": {
    "id": "SKU-12345", "name": "top-left", "brand": "Acme",
    "category1": "Cards", "category2": "Lakes"
  },
  "approval": { "datetime": "2024-05-01T12:00:00.000Z", "approved": true, "comment": "" }
}
```

- `title` - meta title of the file.
- `description` - meta description. Per the Sirv docs: **"For images, this is the meta field that
  is used for showing alt tags on images."** This is the natural source for default **alt text**;
  `title` is the natural source for a default **caption**.
- `tags` - array of string tags.
- Convenience: file meta is also available by requesting the delivery URL with `?info` appended
  (e.g. `https://demo.sirv.com/example.jpg?info`) - a non-REST alternative to this endpoint.

There are also granular sub-endpoints if you only need one field:
`GET/POST /v2/files/meta/title`, `.../description`, `GET/POST/DELETE .../tags`,
`GET/POST .../product`, `GET/POST .../approval`. Bodies are the obvious single-field shapes
(e.g. `{ "title": "..." }`, `{ "description": "..." }`).

How the plugin uses this:
Populate default `alt` (from `description`) and caption (from `title`) when an asset is picked,
so editors get sensible defaults they can override.

### 6c. Spin / view / model type classification

From the vendored `asset-type.ts` (`classifyAssetType`), detection is **extension-first**:

- `.spin` -> `spin`
- `.view` -> `view`
- `.glb`  -> `model`
- then `contentType` starts with `image/` -> `image`, `video/` -> `video`
- anything else -> `null` (or `'file'` in the browse variant, for PDFs/zips in URL mode).

CRITICAL: `.spin` and `.view` both report `contentType: "application/json"` (they are JSON config
files). You **cannot** distinguish spin/view/model by contentType - always key off the file
extension. `.glb` models likewise are not reliably typed by contentType.

Not exposed as metadata: spin **frame count** and view **composition**. `.spin`/`.view` carry no
spin-specific fields in `stat`/`search` meta. If you ever need frame count, fetch and parse the
`.spin`/`.view` JSON file itself. For MVP (pick + render), the extension classification is enough.

---

## 7. Optional account/usage endpoints

Not required for the pick flow, but handy for the settings view.

`GET /v2/account/storage` (live; all sizes in bytes, `files` is a count):

```json
{
  "plan": 100000000000,
  "burstable": 500000000000,
  "extra": 0,
  "used": 6588815733,
  "files": 6537,
  "quotaExceededDate": null
}
```

`GET /v2/billing/plan` (live):

```json
{
  "dateActive": "2026-02-18T00:00:00.000Z",
  "id": "MagicToolbox",
  "period": "year",
  "name": "Magic Toolbox",
  "price": { "month": 0, "quarter": 0, "year": 0 },
  "storage": 100000000000,
  "burstableStorage": 500000000000
}
```

---

## 8. Errors, rate limits, CORS

### Error response shape

Errors are JSON. The vendored client reads `message` first:

```json
{ "message": "Missing authentication" }
```

Observed status semantics:

- `401` + `{ "message": "Missing authentication" }` - token missing or expired. The client's
  contract is to **re-mint once and retry** on a `401` (see `client.ts` refresh-on-401).
- `403` - forbidden / bad credentials.

### Rate limits

- `GET /v2/account/limits` reports "the allowed number of API requests and the number of requests
  used in the past 60 minutes" - i.e. a **rolling 60-minute request quota** per account, not a
  fixed per-second rate. (Its concrete response shape is not documented; the OpenAPI placeholder
  is `"string"`. NEEDS LIVE VERIFICATION for exact fields.)
- No explicit numeric cap, `429` code, or `Retry-After` header is documented. **Assume `429` is
  possible and back off; poll `/v2/account/limits` if you need the live quota.**

### CORS (browser calls api.sirv.com directly with a bearer)

The plugin's design has the admin browser call `https://api.sirv.com/v2/*` directly, using only a
bearer minted server-side. This same browser-direct pattern is in production in the shipped Sanity
/ Storyblok / Contentful / Strapi plugins, so `api.sirv.com` returns permissive CORS for
authenticated bearer calls in practice. The Sirv docs do not spell out a CORS policy, so:
**VERIFY** that `api.sirv.com` returns the expected `Access-Control-Allow-Origin` for the Payload
admin origin (including the `POST /v2/token`-derived bearer calls and any preflight for
`POST /v2/files/search`) during the first live smoke test. Only the `POST /v2/token` mint runs
server-side (to keep the secret off the wire); everything else is browser-direct.

---

## Gaps / items needing live verification

1. **`expiresIn` upper bound.** openapi.3.json allows up to `604800` (7 days) on `POST /v2/token`,
   but the prose says tokens expire after 20 minutes. Confirm whether a longer TTL is actually
   granted, or whether 1200 is effectively enforced. Plan around 1200s + 60s skew regardless.
2. **`/v2/account/limits` response shape** is undocumented (placeholder `"string"`). Capture the
   real body if you surface quota diagnostics.
3. **`meta.format` is inconsistent** - present in `search`, absent in the live `stat` response.
   Derive format from `extension`/`contentType` when missing.
4. **Video metadata depth** - `meta.duration` exists; width/height for video files were not probed
   live. Verify video returns usable dimensions + duration before relying on them for
   `<SirvVideo>` aspect ratios.
5. **Spin frame count / view composition** are not exposed as metadata; parse the `.spin`/`.view`
   JSON if ever needed. Type detection MUST key off extension, never contentType.
6. **`filename` semantics differ by endpoint:** `readdir.contents[].filename` is a basename;
   `search.hits[]._source.filename` is a full path; `stat`/`meta` take a full path. Normalize in
   `packages/sirv-client`.
7. **CORS for the Payload admin origin** - confirm on first live test (see section 8).
8. **`cdnURL` scheme** - live account returned a bare host (`igor.sirv.com`); the OpenAPI example
   includes a scheme. Normalize in the URL builder.
