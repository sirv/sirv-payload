import { buildUrl } from '@sirv/url-builder';
import type { SirvMediaValue } from '../fields/value.js';

/**
 * A small preview URL for a stored media value (matches the DAM browser's per-type thumbnails):
 * image = resize, spin = `?image=24` frame, video/view/model = Sirv's `?thumbnail` poster. Only
 * generic files have no thumbnail. Callers should render a type badge on load error (the poster
 * does not always exist).
 */
export function thumbUrl(value: SirvMediaValue, size = 240): string | null {
  const input = { alias: value.sirvAlias, path: value.sirvPath };
  switch (value.mediaType) {
    case 'image':
      return buildUrl(input, { width: size, height: size, scale: 'fit', format: 'optimal' });
    case 'spin':
      return buildUrl(input, { width: size, height: size, extras: { image: 24 } });
    case 'video':
    case 'view':
    case 'model':
      return buildUrl(input, { extras: { thumbnail: size } });
    default:
      return null;
  }
}

/** Short human label for a media type. */
export function mediaTypeLabel(value: SirvMediaValue): string {
  switch (value.mediaType) {
    case 'spin':
      return '360 spin';
    case 'view':
      return 'View';
    case 'model':
      return '3D model';
    case 'video':
      return 'Video';
    default:
      return 'Image';
  }
}
