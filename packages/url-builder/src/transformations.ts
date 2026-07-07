// Sirv dynamic-imaging parameters. See https://sirv.com/help/articles/dynamic-imaging/
// and docs/sanity-and-rendering-notes.md. Values are bare pixels unless noted.

/**
 * Output format. Sirv negotiates AVIF/WebP via `format=optimal` (there is no standalone
 * `avif` param); 'auto' and 'avif' are accepted as friendly aliases that map to 'optimal'.
 */
export type SirvFormat = 'optimal' | 'webp' | 'jpg' | 'png' | 'original' | 'auto' | 'avif' | 'jpeg';

/** Sirv scale.option values. */
export type ScaleOption = 'fit' | 'fill' | 'ignore' | 'noup';

/** Crop type. */
export type CropType = 'trim' | 'poi' | 'face';

export interface CropOptions {
  width?: number;
  height?: number;
  /** Crop offset from the left (px). */
  x?: number;
  /** Crop offset from the top (px). */
  y?: number;
  type?: CropType;
}

export interface Transformations {
  // Sizing
  width?: number;
  height?: number;
  /** Longest dimension (Sirv `s`). */
  maxSize?: number;
  scale?: ScaleOption;
  // Output
  quality?: number;
  format?: SirvFormat;
  // Crop
  crop?: CropOptions;
  // Geometry
  rotate?: number;
  flip?: boolean;
  flop?: boolean;
  // Color / effects
  blur?: number;
  sharpen?: number;
  grayscale?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  colortone?: string;
  // Misc
  /** Saved Sirv profile/preset name. */
  profile?: string;
  /** Page number for multi-page sources (PDF). */
  page?: number;
  /** Force download (Sirv `dl`). */
  download?: boolean;
  /** Escape hatch for any param not modelled above; emitted verbatim. */
  extras?: Record<string, string | number | boolean>;
}

const FORMAT_MAP: Record<SirvFormat, string> = {
  optimal: 'optimal',
  auto: 'optimal',
  avif: 'optimal',
  webp: 'webp',
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  original: 'original',
};

/** Maps the friendly transformation shape onto Sirv's query-string parameter names. */
export function toQueryParams(t: Transformations): Record<string, string> {
  const p: Record<string, string> = {};
  if (t.width != null) p.w = String(t.width);
  if (t.height != null) p.h = String(t.height);
  if (t.maxSize != null) p.s = String(t.maxSize);
  if (t.scale != null) p['scale.option'] = t.scale;
  if (t.quality != null) p.q = String(t.quality);
  if (t.format != null) p.format = FORMAT_MAP[t.format];

  if (t.crop) {
    if (t.crop.width != null) p.cw = String(t.crop.width);
    if (t.crop.height != null) p.ch = String(t.crop.height);
    if (t.crop.x != null) p.cx = String(t.crop.x);
    if (t.crop.y != null) p.cy = String(t.crop.y);
    if (t.crop.type != null) p['crop.type'] = t.crop.type;
  }

  if (t.rotate != null) p.rotate = String(t.rotate);
  if (t.flip) p.flip = 'true';
  if (t.flop) p.flop = 'true';

  if (t.blur != null) p.blur = String(t.blur);
  if (t.sharpen != null) p.sharpen = String(t.sharpen);
  if (t.grayscale) p.grayscale = 'true';
  if (t.brightness != null) p.brightness = String(t.brightness);
  if (t.contrast != null) p.contrast = String(t.contrast);
  if (t.saturation != null) p.saturation = String(t.saturation);
  if (t.hue != null) p.hue = String(t.hue);
  if (t.colortone != null) p.colortone = t.colortone;

  if (t.profile != null) p.profile = t.profile;
  if (t.page != null) p.page = String(t.page);
  if (t.download) p.dl = 'true';

  if (t.extras) {
    for (const [key, value] of Object.entries(t.extras)) p[key] = String(value);
  }
  return p;
}
