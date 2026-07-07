#!/usr/bin/env node
// Guarantees the client bundle keeps its `'use client'` directive as the very first line, even if
// the bundler drops directive prologues. The `./client` entry is the plugin's client boundary, so
// the whole emitted module must be a client module.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const file = join(root, 'dist', 'exports', 'client.js');

const src = readFileSync(file, 'utf8');
const hasDirective = /^\s*['"]use client['"];/.test(src);
if (!hasDirective) {
  writeFileSync(file, `'use client';\n${src}`);
  console.log("ensure-use-client: prepended 'use client' to dist/exports/client.js");
} else {
  console.log("ensure-use-client: 'use client' already present");
}
