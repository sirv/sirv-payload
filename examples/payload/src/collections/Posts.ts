import { sirvAssetUrlField, sirvMediaField, sirvMediaListField } from '@sirv/payload-plugin';
import type { CollectionConfig } from 'payload';

/**
 * Demo collection exercising every Sirv field type and every media restriction:
 *
 * Single media (`sirvMediaField`, single-select):
 *  - `hero`     : any media type
 *  - `image`    : image only
 *  - `video`    : video only
 *  - `spin`     : 360 spin only
 *  - `view`     : Sirv Media Viewer (.view) only
 *  - `model`    : 3D model (.glb) only
 *
 * Gallery (`sirvMediaListField`, multi-select + drag-reorder):
 *  - `gallery`      : any media type
 *  - `imageGallery` : images + videos only
 *
 * URL (`sirvAssetUrlField`, single-select, stores a delivery URL string):
 *  - `assetUrl`   : any asset, including generic files (PDF/zip)
 *  - `attachment` : generic files only
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'hero', 'gallery'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },

    sirvMediaField({ name: 'hero', label: 'Hero (any media)' }),
    sirvMediaField({ name: 'image', label: 'Image', allowedTypes: ['image'] }),
    sirvMediaField({ name: 'video', label: 'Video', allowedTypes: ['video'] }),
    sirvMediaField({ name: 'spin', label: '360 spin', allowedTypes: ['spin'] }),
    sirvMediaField({ name: 'view', label: 'Sirv Media Viewer', allowedTypes: ['view'] }),
    sirvMediaField({ name: 'model', label: '3D model', allowedTypes: ['model'] }),

    sirvMediaListField({ name: 'gallery', label: 'Multiple selection (any media)' }),
    sirvMediaListField({
      name: 'imageGallery',
      label: 'Image/video gallery',
      allowedTypes: ['image', 'video'],
    }),

    sirvAssetUrlField({ name: 'assetUrl', label: 'Asset URL (any, incl. files)' }),
    sirvAssetUrlField({
      name: 'attachment',
      label: 'Attachment (files only)',
      allowedTypes: ['file'],
    }),
  ],
};

export default Posts;
