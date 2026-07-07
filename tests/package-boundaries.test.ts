import { describe, expect, it } from 'vitest';
// @ts-expect-error - plain .mjs script without types
import { findPayloadImports } from '../scripts/check-package-boundaries.mjs';

describe('package boundaries', () => {
  it('packages/* contains no payload / @payloadcms/* imports (host-agnostic guarantee)', () => {
    const violations = findPayloadImports();
    expect(violations).toEqual([]);
  });
});
