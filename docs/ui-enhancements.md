# DAM / admin UI enhancements

The admin UI that ships in `@sirv/payload-plugin`, beyond the baseline port. Most of these are
host-agnostic UX patterns built on the `@sirv/core` data hooks, so they transfer directly to the
other Sirv CMS ports (Sanity, Storyblok, Contentful, Strapi, Atlassian). Grouped by area, with
the file that implements each.

## Settings / connect view

- **Card-based layout** matching the other plugins: a page title ("Sirv configuration"), a
  **Connection** card, and a **Help & support** card. (`components/SirvSettingsClient.tsx`)
  - Connection card: Client ID + Client secret inputs with required markers and a helper link
    ("my.sirv.com -> Settings -> API"), a Connect button. Connected state shows the account
    alias, a delivery-domain picker (when the account has more than one), and a danger-styled
    Disconnect button.
  - Help & support card: Documentation / Contact support / Your API keys links.
- **Raw settings global hidden from the admin nav** (`admin.hidden: true`) so the custom view is
  the only entry point (no auto-generated global Edit/API page). (`globals/sirv-settings.ts`)
- **Full admin chrome**: the custom view is wrapped in Payload's `DefaultTemplate` (via a server
  component shipped under the `./rsc` entry) so it keeps the sidebar / header / footer.
  (`views/SirvSettingsView.tsx`)

## DAM browser

Built on the `@sirv/core` data hooks (`useFolders` / `useSearch` / `useTypeFilter`), not the
headless `DamBrowser` component, for full control. (`components/SirvDamBrowser.tsx`)

- **Two-row toolbar**: search field on the first row (with action icons), type-filter chips on
  the second row.
- **Folder cards** with an SVG folder glyph; **breadcrumb** with a home icon.
  (`components/dam/icons.tsx`)
- **Per-type grid thumbnails**, each with an `onError` fallback to a type badge:
  - image -> resized delivery URL
  - spin -> `?image=24` (frame 24)
  - video / view / model -> `?thumbnail`
  - generic file -> type badge only
- **Item details / preview**: a live preview (image, video, or sirv.js embed for spin/view/model)
  plus a metadata list (Name, **Folder**, Type, Dimensions, Duration, Size), two external links
  (**Open original** = delivery URL, **Open on my.sirv.com** = file-manager deep link), and a
  bottom action row aligned `space-between` (Back on the left, "Use this asset" on the right).
- **Infinite scroll**: the grid is a bounded, internally-scrolling container with an
  `IntersectionObserver` sentinel that auto-loads the next page (folders and search). A "Load
  more" button stays as a keyboard / no-observer fallback.
- **Single vs multiple selection**:
  - single fields -> click an asset -> preview -> confirm.
  - gallery field -> select several across folders and searches, then a confirm bar ("Add N
    assets"); items drag-to-reorder in the field.
- **Create folder + Upload** icon buttons next to the search field. New folder prompts for a name
  and **navigates into the freshly created folder**; upload sends the chosen file(s) to the
  current folder. Both refresh the listing afterwards. (Backed by `createFolder` /`uploadFile`
  added to `@sirv/sirv-client`: `POST /v2/files/mkdir` and `POST /v2/files/upload`.)
- **Close** button is an X icon; the modal closes on **Esc** (capture-phase listener) and on
  backdrop click. (`components/SirvModal.tsx`)

## Field components (document editor)

- **Single field card**: thumbnail preview for every media type (via a shared `SirvThumb` with
  `onError` fallback), path, type + dimensions, inline alt/caption for image/video, and
  **Replace / Remove** buttons with SVG icons. (`components/SirvMediaField.tsx`,
  `components/SirvThumb.tsx`)
- **Gallery field**: thumbnail grid, drag-to-reorder, per-item remove (SVG close icon), "Add
  media" multi-pick. (`components/SirvMediaListField.tsx`)
- **URL field**: text input + Browse button; allows generic files.
  (`components/SirvAssetUrlField.tsx`)
- **List-view cells**: a thumbnail (single) or a 4-up thumbnail strip with a `+N` overflow
  (list), both via `SirvThumb`. (`components/SirvMediaCell.tsx`, `SirvMediaListCell.tsx`)

## Theme / styling (`styles.css`)

- **Accent color `#579be8`** throughout (replacing Payload's green `--theme-success-500/600`):
  primary buttons, active filter chips, selected-card outlines, links, input focus, breadcrumb,
  and the folder icon.
- **Type badges** on thumbnails use a light background with `#000` text for legibility.
- **Buttons** are `inline-flex` with a gap so icon + text align.
- Styles reference Payload admin CSS variables (light/dark aware) with hardcoded fallbacks. The
  host app must import `@payloadcms/next/css` before the plugin's `styles.css`.

## Reusable checklist for the other ports

These are the same in any host that builds its DAM browser over `@sirv/core`; only the chrome
primitives change:

1. Card-based settings/connect screen (Connection + Help & support).
2. Two-row toolbar (search + action icons, then type-filter chips).
3. Folder SVG icon + home-icon breadcrumb.
4. Per-type thumbnails (image resize, spin `?image=24`, video/view/model `?thumbnail`) with an
   `onError` fallback to a type badge - shared by the grid, the field cards and the list cells.
5. Item-details preview with a metadata list (incl. Folder) + "Open original" / "Open on
   my.sirv.com" links + `space-between` action buttons.
6. Infinite scroll via an `IntersectionObserver` sentinel (keep a "Load more" fallback).
7. Single-select (preview + confirm) vs multi-select (confirm bar + drag-reorder).
8. Create-folder + upload toolbar icons (`mkdir` / `upload`); navigate into a new folder.
9. Close-as-icon + Esc-to-close (capture phase) + backdrop close.
10. SVG icons for Replace / Remove / gallery-remove.
11. One accent color applied consistently (buttons, chips, selections, links, focus, folder).
12. Legible thumbnail badges (light background, dark text).
