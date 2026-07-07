import type { StoredCredentials } from '@sirv/sirv-client';

/**
 * The portability seam. Each host (Sanity secrets store, Contentful, Storyblok)
 * provides its own implementation; packages/core never knows which store it runs on.
 * It persists the durable per-account REST credentials obtained via the connect flow;
 * presence of stored credentials is what lets later sessions skip connecting.
 * See sanity-plugin.md section 8.1 and docs/architecture.md.
 */
export interface TokenStorage {
  read(): Promise<StoredCredentials | null>;
  write(credentials: StoredCredentials): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory implementation for tests and Storybook. Never use in production. */
export function createMemoryTokenStorage(initial: StoredCredentials | null = null): TokenStorage {
  let credentials = initial;
  return {
    read: async () => credentials,
    write: async (next) => {
      credentials = next;
    },
    clear: async () => {
      credentials = null;
    },
  };
}
