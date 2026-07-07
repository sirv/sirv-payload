#!/usr/bin/env node
// Copies non-TS assets into dist after `tsc` emits. Currently just the admin stylesheet, which
// the package exposes via the `./styles.css` export.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const from = join(root, 'src', 'styles.css');
const to = join(root, 'dist', 'styles.css');

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log('copied styles.css -> dist/styles.css');
