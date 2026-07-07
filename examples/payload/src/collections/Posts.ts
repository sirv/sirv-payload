import { sirvAssetUrlField, sirvMediaField, sirvMediaListField } from '@sirv/payload-plugin';
import type { CollectionConfig } from 'payload';

/**
 * Demo collection exercising all three Sirv field factories:
 * - `hero`     : a single sirvMedia value (any media type)
 * - `gallery`  : an array of sirvMedia values (multi-select, drag-reorder)
 * - `spin`     : a single sirvMedia restricted to 360 spins
 * - `assetUrl` : a delivery URL string (allows generic files too)
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'hero', 'gallery'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    sirvMediaField({ name: 'hero', label: 'Hero media' }),
    sirvMediaListField({ name: 'gallery', label: 'Gallery' }),
    sirvMediaField({ name: 'spin', label: '360 spin', allowedTypes: ['spin'] }),
    sirvAssetUrlField({ name: 'assetUrl', label: 'Attachment URL' }),
  ],
};

export default Posts;
