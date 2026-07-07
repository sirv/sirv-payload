#!/usr/bin/env node
// Portability guardrail (the single most important architectural rule in this repo):
// nothing under packages/* may import Payload. This keeps packages/core, sirv-client and
// url-builder reusable across every host (Sanity, Storyblok, Contentful, Strapi, Payload).
//
// Biome's noRestrictedImports enumerates known @payloadcms/* packages; this script catches
// the wildcard (any @payloadcms/* specifier, or a bare `payload` import) so a new Payload
// subpackage cannot slip through. Run via `pnpm boundaries`; also asserted in
// tests/package-boundaries.test.ts so it runs as part of `pnpm test`.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const packagesDir = join(repoRoot, 'packages');

// Matches:  from 'payload'  |  from '@payloadcms/x'  |  import('payload/...')  |  require('@payloadcms/x')
// The specifier must be exactly `payload`, a `payload/...` subpath, or any `@payloadcms/...`.
const FORBIDDEN =
  /(?:from|import|require)\s*\(?\s*['"](payload(?:\/[^'"]*)?|@payloadcms\/[^'"]+)['"]/g;

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'build') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (SOURCE_EXT.has(full.slice(full.lastIndexOf('.')))) {
      out.push(full);
    }
  }
  return out;
}

/** @returns {{file: string, line: number, specifier: string}[]} */
export function findPayloadImports() {
  /** @type {{file: string, line: number, specifier: string}[]} */
  const violations = [];
  let files = [];
  try {
    files = walk(packagesDir);
  } catch {
    return violations; // packages/ not present yet
  }
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(FORBIDDEN)) {
      const line = text.slice(0, match.index).split('\n').length;
      violations.push({
        file: relative(repoRoot, file),
        line,
        specifier: match[1],
      });
    }
  }
  return violations;
}

// Run as a CLI when invoked directly.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const violations = findPayloadImports();
  if (violations.length > 0) {
    console.error('\nportability violation: packages/* must not import Payload.\n');
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  imports "${v.specifier}"`);
    }
    console.error('\nMove Payload-specific code into apps/payload-plugin.\n');
    process.exit(1);
  }
  console.log('boundaries ok: no Payload imports in packages/*');
}
