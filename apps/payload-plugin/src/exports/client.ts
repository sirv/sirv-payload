'use client';

/**
 * Client-components entry (the `@sirv/payload-plugin/client` subpath). Every component the
 * plugin references by import-map path string is re-exported here. Keep this file free of any
 * server-only imports - it is the boundary that `payload generate:importmap` pulls into the
 * admin browser bundle.
 */
export { SirvSettingsClient } from '../components/SirvSettingsClient.js';
export { SirvNavLink } from '../components/SirvNavLink.js';
export { SirvMediaField } from '../components/SirvMediaField.js';
export { SirvMediaCell } from '../components/SirvMediaCell.js';
export { SirvMediaListField } from '../components/SirvMediaListField.js';
export { SirvMediaListCell } from '../components/SirvMediaListCell.js';
export { SirvAssetUrlField } from '../components/SirvAssetUrlField.js';
