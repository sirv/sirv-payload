import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The plugin and the vendored @sirv/* packages are TypeScript ESM consumed from source, and
  // use `.js` import specifiers (the TS-ESM convention). Transpile them and teach webpack to
  // resolve a `.js` specifier to the real `.ts`/`.tsx` file.
  transpilePackages: [
    '@sirv/payload-plugin',
    '@sirv/core',
    '@sirv/sirv-client',
    '@sirv/url-builder',
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
