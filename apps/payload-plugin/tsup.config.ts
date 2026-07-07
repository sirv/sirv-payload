import { defineConfig } from 'tsup';

/**
 * Bundles the plugin for npm. The vendored `@sirv/*` workspace packages are NOT published, so
 * they are inlined into the output (only `zod` and the Payload/React peers stay external). The
 * three entries mirror the package `exports`:
 *  - `index`         server-safe config (plugin fn, global, endpoints, field factories)
 *  - `exports/client` the `'use client'` component bundle (inlines `@sirv/core`)
 *  - `exports/rsc`    the server component view; it imports the client bundle via the package's
 *                     own `@sirv/payload-plugin/client` subpath (kept external) so the RSC
 *                     server/client boundary survives bundling.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'exports/client': 'src/exports/client.ts',
    'exports/rsc': 'src/exports/rsc.ts',
  },
  format: ['esm'],
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  // Keep the host's own copies external; inline everything else (the @sirv/* vendored packages).
  external: [
    'payload',
    /^@payloadcms\//,
    'react',
    'react-dom',
    /^react\//,
    /^react-dom\//,
    'zod',
    // Self-reference: the rsc entry imports the client bundle by this specifier; leaving it
    // external preserves the 'use client' boundary between the two output files.
    '@sirv/payload-plugin/client',
  ],
});
