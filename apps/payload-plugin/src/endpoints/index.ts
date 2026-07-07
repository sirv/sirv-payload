import type { Endpoint } from 'payload';
import { connectEndpoint } from './connect.js';
import { deliveryEndpoint } from './delivery.js';
import { disconnectEndpoint } from './disconnect.js';
import { statusEndpoint } from './status.js';
import { tokenEndpoint } from './token.js';

/** All Sirv plugin endpoints, mounted under the host's API route (default `/api`). */
export const sirvEndpoints: Endpoint[] = [
  connectEndpoint,
  tokenEndpoint,
  statusEndpoint,
  deliveryEndpoint,
  disconnectEndpoint,
];

export { connectEndpoint, tokenEndpoint, statusEndpoint, deliveryEndpoint, disconnectEndpoint };
