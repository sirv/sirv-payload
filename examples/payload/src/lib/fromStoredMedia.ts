import { type SanityMediaValue, fromSanityMedia } from '@sirv/react';

/**
 * The value stored by `@sirv/payload-plugin`'s `sirvMedia` fields is the same flat shape the
 * Sanity plugin stores, so `@sirv/react`'s `fromSanityMedia` reads it directly. This host-neutral
 * alias just makes the intent explicit in a Payload app.
 */
export const fromStoredMedia = fromSanityMedia;
export type StoredMediaValue = SanityMediaValue;
