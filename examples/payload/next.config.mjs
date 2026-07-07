import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @sirv/react and the plugin ship as ESM/TSX; let Next transpile the workspace packages.
  transpilePackages: [
    '@sirv/payload-plugin',
    '@sirv/core',
    '@sirv/sirv-client',
    '@sirv/url-builder',
  ],
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
