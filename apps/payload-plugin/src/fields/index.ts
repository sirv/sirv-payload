import type { AssetType, BrowseType } from '@sirv/core';
import type { Field } from 'payload';

/** Shared options for the Sirv field factories. */
export interface SirvFieldOptions {
  /** Field name (stored key). */
  name: string;
  label?: string;
  required?: boolean;
  /**
   * Restrict which media types the DAM browser offers for this field. Defaults to all five
   * media types.
   */
  allowedTypes?: AssetType[];
  admin?: Field['admin'];
}

/** Options for `sirvAssetUrlField`, which additionally accepts generic files (`'file'`). */
export interface SirvUrlFieldOptions extends Omit<SirvFieldOptions, 'allowedTypes'> {
  allowedTypes?: BrowseType[];
}

const CLIENT = '@sirv/payload-plugin/client';

/**
 * `sirvMediaField({ name })` -> a Payload `json` field storing a single frozen `sirvMedia`
 * value, edited through the Sirv DAM browser. List-view cells render a thumbnail.
 */
export function sirvMediaField(options: SirvFieldOptions): Field {
  const { name, label, required, allowedTypes, admin } = options;
  return {
    name,
    type: 'json',
    label,
    required,
    admin: {
      ...admin,
      components: {
        Field: `${CLIENT}#SirvMediaField`,
        Cell: `${CLIENT}#SirvMediaCell`,
        ...admin?.components,
      },
      custom: { sirvAllowedTypes: allowedTypes, ...admin?.custom },
    },
  } as Field;
}

/**
 * `sirvMediaListField({ name })` -> a Payload `json` field storing an ARRAY of `sirvMedia`
 * values (gallery / multi-select, drag-reorder). List-view cells render a thumbnail strip.
 */
export function sirvMediaListField(options: SirvFieldOptions): Field {
  const { name, label, required, allowedTypes, admin } = options;
  return {
    name,
    type: 'json',
    label,
    required,
    admin: {
      ...admin,
      components: {
        Field: `${CLIENT}#SirvMediaListField`,
        Cell: `${CLIENT}#SirvMediaListCell`,
        ...admin?.components,
      },
      custom: { sirvAllowedTypes: allowedTypes, ...admin?.custom },
    },
  } as Field;
}

/**
 * `sirvAssetUrlField({ name })` -> a Payload `text` field storing a delivery URL string, backed
 * by the DAM picker. Allows generic files (PDF/zip) in addition to media.
 */
export function sirvAssetUrlField(options: SirvUrlFieldOptions): Field {
  const { name, label, required, allowedTypes, admin } = options;
  return {
    name,
    type: 'text',
    label,
    required,
    admin: {
      ...admin,
      components: {
        Field: `${CLIENT}#SirvAssetUrlField`,
        ...admin?.components,
      },
      custom: { sirvAllowedTypes: allowedTypes, ...admin?.custom },
    },
  } as Field;
}
