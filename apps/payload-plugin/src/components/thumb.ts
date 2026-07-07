import { buildUrl } from '@sirv/url-builder';
import type { SirvMediaValue } from '../fields/value.js';

/**
 * A small preview URL for a stored media value, or null for types without an image thumbnail
 * (spin/view/model - the caller renders a type badge instead). Images use a resized delivery
 * URL; videos use Sirv's `?thumbnail=` frame.
 */
export function thumbUrl(value: SirvMediaValue, size = 240): string | null {
  if (value.mediaType === 'image') {
    return buildUrl({ alias: value.sirvAlias, path: value.sirvPath }, { width: size });
  }
  if (value.mediaType === 'video') {
    return `${value.originalUrl}?thumbnail=${size}`;
  }
  return null;
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
