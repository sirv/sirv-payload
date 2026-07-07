import type { BrowseType } from '@sirv/sirv-client';
import { z } from 'zod';

// The four supported asset types are defined once in @sirv/sirv-client (it classifies
// API responses) and re-exported here for the UI and field-value layers. BrowseType adds the
// generic-`file` browse category (image|video|spin|view|file) used only by the DAM browser.
export {
  AssetTypeSchema,
  type AssetType,
  BrowseTypeSchema,
  type BrowseType,
} from '@sirv/sirv-client';

// --- DAM browser items (what the browser lists and the user picks) ---

/** A folder in the DAM tree. */
export interface DamFolder {
  name: string;
  /** Absolute path, e.g. "/products/aw26". */
  path: string;
}

/** A selectable asset in the DAM browser, normalized from the Sirv API. */
export interface DamAsset {
  /** image|video|spin|view, or `file` for generic non-media files (only in file-mode pickers). */
  type: BrowseType;
  /** Absolute path, e.g. "/products/aw26/shoe-01.jpg". */
  path: string;
  /** Basename, e.g. "shoe-01.jpg". */
  name: string;
  contentType?: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
}

// --- Stored field value (sanity-plugin.md section 9) ---

export const SirvAssetBaseSchema = z.object({
  sirvPath: z.string(),
  sirvAlias: z.string(),
  originalUrl: z.string(),
  bytes: z.number(),
});
export type SirvAssetBase = z.infer<typeof SirvAssetBaseSchema>;

export const ImageTransformationsSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  quality: z.number().optional(),
  format: z.enum(['auto', 'webp', 'avif', 'jpeg', 'png']).optional(),
  crop: z.enum(['fit', 'fill', 'scale']).optional(),
  focalPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  effects: z.record(z.unknown()).optional(),
});
export type ImageTransformations = z.infer<typeof ImageTransformationsSchema>;

export const SirvImageValueSchema = z.object({
  _type: z.literal('sirv.image'),
  asset: SirvAssetBaseSchema.extend({
    width: z.number(),
    height: z.number(),
    format: z.string(),
  }),
  transformations: ImageTransformationsSchema.optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});
export type SirvImageValue = z.infer<typeof SirvImageValueSchema>;

export const SirvVideoValueSchema = z.object({
  _type: z.literal('sirv.video'),
  asset: SirvAssetBaseSchema.extend({
    width: z.number(),
    height: z.number(),
    durationSec: z.number(),
    format: z.string(),
  }),
  poster: SirvImageValueSchema.optional(),
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  muted: z.boolean().optional(),
  controls: z.boolean().optional(),
  caption: z.string().optional(),
});
export type SirvVideoValue = z.infer<typeof SirvVideoValueSchema>;

export const SirvSpinValueSchema = z.object({
  _type: z.literal('sirv.spin'),
  asset: SirvAssetBaseSchema.extend({ frameCount: z.number() }),
  options: z.record(z.unknown()).optional(),
  caption: z.string().optional(),
});
export type SirvSpinValue = z.infer<typeof SirvSpinValueSchema>;

export const SirvViewValueSchema = z.object({
  _type: z.literal('sirv.view'),
  asset: SirvAssetBaseSchema,
  options: z.record(z.unknown()).optional(),
  caption: z.string().optional(),
});
export type SirvViewValue = z.infer<typeof SirvViewValueSchema>;

/** Discriminated union over the four asset types. */
export const SirvFieldValueSchema = z.discriminatedUnion('_type', [
  SirvImageValueSchema,
  SirvVideoValueSchema,
  SirvSpinValueSchema,
  SirvViewValueSchema,
]);
export type SirvFieldValue = z.infer<typeof SirvFieldValueSchema>;
