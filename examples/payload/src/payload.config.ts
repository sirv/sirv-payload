import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { sirvPlugin } from '@sirv/payload-plugin';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { Posts } from './collections/Posts.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Posts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-me',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./payload.db',
    },
  }),
  sharp,
  // The Sirv plugin: adds the sirv-settings global, the connect/token/status endpoints,
  // the Sirv settings admin view and the field factories used in Posts above.
  plugins: [sirvPlugin()],
});
