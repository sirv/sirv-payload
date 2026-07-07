'use client';

import { SirvMedia } from '@sirv/react';
import { type StoredMediaValue, fromStoredMedia } from '../../lib/fromStoredMedia.js';

/**
 * `@sirv/react` components (and `fromSanityMedia`) are Client Components, so the flat->renderable
 * conversion must run on the client. The server page passes the plain stored JSON value across
 * the RSC boundary; this client component converts and renders it.
 */
export function MediaBlock({ value }: { value: StoredMediaValue }) {
  return <SirvMedia value={fromStoredMedia(value)} />;
}

export default MediaBlock;
