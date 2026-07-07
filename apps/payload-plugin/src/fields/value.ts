import type { AssetType, DamAsset } from '@sirv/core';
import { buildUrl } from '@sirv/url-builder';
import { z } from 'zod';

/**
 * The value stored by the `sirvMedia` field, in a Payload `json` field. Flat and CMS-neutral -
 * identical in shape to the Sanity/Storyblok/Contentful/Strapi plugins' `sirvMedia` value, so
 * the published `@sirv/react` renders it via the same `fromSanityMedia`/`fromStoredMedia`
 * converter. `mediaType` is the discriminator. Includes `model` (.glb), matching the Sanity
 * plugin's five supported media types.
 */
export const SirvMediaValueSchema = z.object({
  _type: z.literal('sirvMedia'),
  mediaType: z.enum(['image', 'video', 'spin', 'view', 'model']),
  sirvPath: z.string(),
  sirvAlias: z.string(),
  originalUrl: z.string(),
  bytes: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  durationSec: z.number().optional(),
  frameCount: z.number().optional(),
  format: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  transformations: z
    .object({
      quality: z.number().optional(),
      format: z.enum(['auto', 'webp', 'avif', 'jpeg', 'png']).optional(),
    })
    .optional(),
  // Video / spin playback options
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  muted: z.boolean().optional(),
  controls: z.boolean().optional(),
});
export type SirvMediaValue = z.infer<typeof SirvMediaValueSchema>;

/** A `sirvMediaList` field stores an array of these. */
export const SirvMediaListValueSchema = z.array(SirvMediaValueSchema);
export type SirvMediaListValue = z.infer<typeof SirvMediaListValueSchema>;

function extensionFormat(path: string): string | undefined {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? undefined : path.slice(dot + 1).toLowerCase();
}

/**
 * Best-effort fetch of an asset's title/description from Sirv's `?info` delivery endpoint
 * (public, CORS-open, no auth). Auto-populates alt text (from `original.title`) and caption
 * (from `original.description`) when an image/video is picked. Never throws.
 */
export async function fetchSirvInfo(
  originalUrl: string,
): Promise<{ title?: string; description?: string }> {
  try {
    const res = await fetch(`${originalUrl}?info`);
    if (!res.ok) return {};
    const data = (await res.json()) as { original?: { title?: unknown; description?: unknown } };
    const original = data.original ?? {};
    return {
      title: typeof original.title === 'string' ? original.title : undefined,
      description: typeof original.description === 'string' ? original.description : undefined,
    };
  } catch {
    return {};
  }
}

/** Picked value enriched with Sirv `?info` metadata (alt from title, caption from description). */
export async function enrichMediaValue(value: SirvMediaValue): Promise<SirvMediaValue> {
  // Only image/video carry meaningful alt/caption metadata via ?info.
  if (value.mediaType !== 'image' && value.mediaType !== 'video') return value;
  const { title, description } = await fetchSirvInfo(value.originalUrl);
  if (!title && !description) return value;
  return {
    ...value,
    ...(title && !value.alt ? { alt: title } : {}),
    ...(description && !value.caption ? { caption: description } : {}),
  };
}

/** Builds the stored sirvMedia value from a picked DAM asset and the account delivery host. */
export function damAssetToMediaValue(asset: DamAsset, alias: string): SirvMediaValue {
  // sirvMedia stores only the five media types; generic files never reach here because the
  // media pickers never allow `'file'`.
  if (asset.type === 'file') {
    throw new Error('Cannot store a generic file as Sirv media.');
  }
  const mediaType: AssetType = asset.type;
  const base = {
    _type: 'sirvMedia',
    mediaType,
    sirvPath: asset.path,
    sirvAlias: alias,
    originalUrl: buildUrl({ alias, path: asset.path }),
    bytes: asset.bytes,
    format: extensionFormat(asset.path),
  } satisfies Partial<SirvMediaValue> & { _type: 'sirvMedia'; mediaType: AssetType };

  switch (mediaType) {
    case 'image':
      return { ...base, width: asset.width, height: asset.height, alt: '' };
    case 'video':
      return {
        ...base,
        width: asset.width,
        height: asset.height,
        durationSec: asset.durationSec,
        controls: true,
      };
    case 'spin':
      return { ...base, frameCount: 0 };
    case 'view':
      return base;
    case 'model':
      return base;
  }
}
