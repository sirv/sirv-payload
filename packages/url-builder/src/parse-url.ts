import type { SirvUrlInput } from './build-url.js';
import type { CropType, ScaleOption, SirvFormat, Transformations } from './transformations.js';

export interface ParsedSirvUrl extends SirvUrlInput {
  transformations: Transformations;
}

function intOf(value: string | null): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Reverse of buildUrl: parses a Sirv delivery URL into its alias, path and the
 * transformation params it carries. Unrecognised params land in `transformations.extras`.
 */
export function parseUrl(url: string): ParsedSirvUrl {
  const parsed = new URL(url);
  const alias = parsed.host;
  const path = parsed.pathname;
  const q = parsed.searchParams;
  const t: Transformations = {};
  const crop: NonNullable<Transformations['crop']> = {};
  const known = new Set<string>();
  const take = (key: string) => {
    known.add(key);
    return q.get(key);
  };

  const w = intOf(take('w'));
  if (w != null) t.width = w;
  const h = intOf(take('h'));
  if (h != null) t.height = h;
  const s = intOf(take('s'));
  if (s != null) t.maxSize = s;

  const scale = take('scale.option');
  if (scale) t.scale = scale as ScaleOption;
  const quality = intOf(take('q'));
  if (quality != null) t.quality = quality;
  const format = take('format');
  if (format) t.format = format as SirvFormat;

  const cw = intOf(take('cw'));
  if (cw != null) crop.width = cw;
  const ch = intOf(take('ch'));
  if (ch != null) crop.height = ch;
  const cx = intOf(take('cx'));
  if (cx != null) crop.x = cx;
  const cy = intOf(take('cy'));
  if (cy != null) crop.y = cy;
  const cropType = take('crop.type');
  if (cropType) crop.type = cropType as CropType;
  if (Object.keys(crop).length > 0) t.crop = crop;

  const rotate = intOf(take('rotate'));
  if (rotate != null) t.rotate = rotate;
  if (take('flip') === 'true') t.flip = true;
  if (take('flop') === 'true') t.flop = true;

  const blur = intOf(take('blur'));
  if (blur != null) t.blur = blur;
  const sharpen = intOf(take('sharpen'));
  if (sharpen != null) t.sharpen = sharpen;
  if (take('grayscale') === 'true') t.grayscale = true;
  const brightness = intOf(take('brightness'));
  if (brightness != null) t.brightness = brightness;
  const contrast = intOf(take('contrast'));
  if (contrast != null) t.contrast = contrast;
  const saturation = intOf(take('saturation'));
  if (saturation != null) t.saturation = saturation;
  const hue = intOf(take('hue'));
  if (hue != null) t.hue = hue;
  const colortone = take('colortone');
  if (colortone) t.colortone = colortone;

  const profile = take('profile');
  if (profile) t.profile = profile;
  const page = intOf(take('page'));
  if (page != null) t.page = page;
  if (take('dl') === 'true') t.download = true;

  const extras: Record<string, string> = {};
  for (const [key, value] of q.entries()) {
    if (!known.has(key)) extras[key] = value;
  }
  if (Object.keys(extras).length > 0) t.extras = extras;

  return { alias, path, transformations: t };
}
