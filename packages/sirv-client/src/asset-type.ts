import { z } from 'zod';

/**
 * The five media types the plugin supports. This is the canonical definition;
 * @sirv/core re-exports it so the UI and field-value layers share one source of truth.
 */
export const AssetTypeSchema = z.enum(['image', 'video', 'spin', 'view', 'model']);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * The DAM browser's classification universe: the media types plus a catch-all
 * `'file'` for generic, non-media files (PDF, zip, etc.). Only the file-field Asset Source
 * and the `sirvAssetUrl` field opt into `'file'`; media pickers stay restricted to the media
 * types, and field VALUES (SirvFieldValue / sirvMedia) only ever store the media types.
 */
export const BrowseTypeSchema = z.enum(['image', 'video', 'spin', 'view', 'model', 'file']);
export type BrowseType = z.infer<typeof BrowseTypeSchema>;

/**
 * Classifies a Sirv file into one of the four supported types, or null if unsupported.
 *
 * IMPORTANT: spins and views MUST be detected by extension, never by contentType -
 * both .spin and .view report contentType "application/json" (confirmed against the
 * live API; see docs/sirv-api-notes.md).
 */
export function classifyAssetType(input: {
  filename?: string;
  extension?: string;
  contentType?: string;
}): AssetType | null {
  const ext = (input.extension ?? extractExtension(input.filename)).toLowerCase();
  if (ext === '.spin') return 'spin';
  if (ext === '.view') return 'view';
  if (ext === '.glb') return 'model';

  const contentType = input.contentType?.toLowerCase() ?? '';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  return null;
}

/**
 * Like {@link classifyAssetType} but never returns null: any file that is not one of the four
 * media types is classified as a generic `'file'`. Used by the file-field Asset Source and the
 * `sirvAssetUrl` field so editors can browse and pick non-media files (PDF, zip, etc.).
 */
export function classifyBrowseType(input: {
  filename?: string;
  extension?: string;
  contentType?: string;
}): BrowseType {
  return classifyAssetType(input) ?? 'file';
}

function extractExtension(filename?: string): string {
  if (!filename) return '';
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot);
}
