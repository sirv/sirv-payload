import { type Transformations, toQueryParams } from './transformations.js';

export interface SirvUrlInput {
  /** e.g. "alias.sirv.com" or a custom domain (with or without protocol). */
  alias: string;
  /** Absolute Sirv path, e.g. "/products/aw26/shoe-01.jpg". */
  path: string;
}

function origin(alias: string): string {
  return alias.includes('://') ? alias.replace(/\/+$/, '') : `https://${alias}`;
}

function withQuery(base: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Percent-encodes each path segment (preserving the slashes) so paths with spaces or Unicode
 * (e.g. "/my folder/Кира.jpg") produce valid delivery URLs. Sirv decodes them server-side.
 * Already-safe paths like "/products/shoe-01.jpg" pass through unchanged.
 */
function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function baseUrl(input: SirvUrlInput): string {
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
  return `${origin(input.alias)}${encodePath(path)}`;
}

/** Builds a Sirv delivery URL with optional transformation query params. */
export function buildUrl(input: SirvUrlInput, transformations: Transformations = {}): string {
  return withQuery(baseUrl(input), toQueryParams(transformations));
}

/** Image delivery URL (alias of buildUrl, for symmetry with the other media types). */
export const buildImageUrl = buildUrl;

/** Builds a width-descriptor srcset string for responsive images. */
export function buildSrcSet(
  input: SirvUrlInput,
  widths: number[],
  transformations: Transformations = {},
): string {
  return widths.map((w) => `${buildUrl(input, { ...transformations, width: w })} ${w}w`).join(', ');
}

/**
 * Video delivery URL. Sirv serves the video file directly; sizing/format params apply.
 * Format defaults to leaving the source untouched.
 */
export function buildVideoUrl(
  input: SirvUrlInput,
  options: { width?: number; height?: number } = {},
): string {
  return buildUrl(input, { width: options.width, height: options.height });
}

/**
 * A still poster frame for a video, as an image. Sirv derives a JPG frame from the video
 * when an image format is requested.
 */
export function buildVideoPosterUrl(
  input: SirvUrlInput,
  options: { width?: number; height?: number; quality?: number } = {},
): string {
  return buildUrl(input, {
    width: options.width,
    height: options.height,
    quality: options.quality,
    format: 'jpg',
  });
}

/** Spin (.spin) delivery URL - pointed at by sirv.js `data-src`. */
export function buildSpinUrl(input: SirvUrlInput): string {
  return baseUrl(input);
}

/** View (.view) delivery URL - pointed at by sirv.js `data-src`. */
export function buildViewUrl(input: SirvUrlInput): string {
  return baseUrl(input);
}
