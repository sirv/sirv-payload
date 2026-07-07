import { describe, expect, it } from 'vitest';
import {
  AssetTypeSchema,
  BrowseTypeSchema,
  SirvFieldValueSchema,
  assetFromEntry,
  assetFromSearch,
  buildSearchQuery,
  createMemoryTokenStorage,
  filterAssetsByType,
  folderFromEntry,
} from './index.js';
import type { DamAsset } from './index.js';

describe('@sirv/core token storage', () => {
  it('exposes the five asset types', () => {
    expect(AssetTypeSchema.options).toEqual(['image', 'video', 'spin', 'view', 'model']);
  });

  it('exposes the browse types (media + generic file)', () => {
    expect(BrowseTypeSchema.options).toEqual(['image', 'video', 'spin', 'view', 'model', 'file']);
  });

  it('memory credential storage round-trips and clears', async () => {
    const store = createMemoryTokenStorage();
    expect(await store.read()).toBeNull();
    await store.write({ clientId: 'id', clientSecret: 'secret', accountAlias: 'demo.sirv.com' });
    expect((await store.read())?.accountAlias).toBe('demo.sirv.com');
    await store.clear();
    expect(await store.read()).toBeNull();
  });
});

describe('asset mappers', () => {
  it('maps a directory entry to a folder', () => {
    expect(folderFromEntry({ filename: 'aw26', isDirectory: true, size: 0 }, '/products')).toEqual({
      name: 'aw26',
      path: '/products/aw26',
    });
  });

  it('maps an image file entry to an asset', () => {
    const asset = assetFromEntry(
      {
        filename: 'shoe.jpg',
        isDirectory: false,
        size: 1234,
        contentType: 'image/jpeg',
        meta: { width: 800, height: 600, duration: 0 },
      },
      '/products',
    );
    expect(asset).toMatchObject({
      type: 'image',
      path: '/products/shoe.jpg',
      name: 'shoe.jpg',
      bytes: 1234,
      width: 800,
      height: 600,
    });
  });

  it('skips unsupported file types', () => {
    expect(
      assetFromEntry(
        { filename: 'page.html', isDirectory: false, size: 1, contentType: 'text/html' },
        '/',
      ),
    ).toBeNull();
  });

  it("surfaces generic files as 'file' assets when includeOther is set", () => {
    const entry = {
      filename: 'spec.pdf',
      isDirectory: false,
      size: 9,
      contentType: 'application/pdf',
    };
    expect(assetFromEntry(entry, '/docs')).toBeNull();
    expect(assetFromEntry(entry, '/docs', true)).toMatchObject({
      type: 'file',
      path: '/docs/spec.pdf',
      name: 'spec.pdf',
    });
  });

  it('maps a search hit (spin) by extension', () => {
    const asset = assetFromSearch({
      filename: '/spins/car.spin',
      extension: '.spin',
      contentType: 'application/json',
      size: 50,
    });
    expect(asset).toMatchObject({ type: 'spin', path: '/spins/car.spin', name: 'car.spin' });
  });
});

describe('buildSearchQuery', () => {
  it('adds a type constraint to a term', () => {
    expect(buildSearchQuery('shoe', ['image'])).toBe('shoe AND (contentType:image*)');
  });

  it('uses only the type constraint when there is no term', () => {
    expect(buildSearchQuery('', ['spin'])).toBe('(extension:.spin)');
  });

  it('omits the constraint when all types are active', () => {
    expect(buildSearchQuery('shoe', ['image', 'video', 'spin', 'view', 'model'])).toBe('shoe');
  });

  it("drops the type constraint when 'file' (any file) is active", () => {
    expect(buildSearchQuery('report', ['image', 'video', 'spin', 'view', 'file'])).toBe('report');
    expect(buildSearchQuery('', ['image', 'video', 'spin', 'view', 'file'])).toBe('*');
  });
});

describe('filterAssetsByType', () => {
  const assets = [
    { type: 'image', path: '/a.jpg', name: 'a.jpg', bytes: 1 },
    { type: 'video', path: '/b.mp4', name: 'b.mp4', bytes: 2 },
  ] as DamAsset[];

  it('keeps only active types', () => {
    expect(filterAssetsByType(assets, ['image']).map((a) => a.path)).toEqual(['/a.jpg']);
  });

  it('returns all when no type is active', () => {
    expect(filterAssetsByType(assets, [])).toHaveLength(2);
  });
});

describe('SirvFieldValueSchema', () => {
  it('parses a discriminated image value', () => {
    const value = SirvFieldValueSchema.parse({
      _type: 'sirv.image',
      asset: {
        sirvPath: '/a.jpg',
        sirvAlias: 'demo.sirv.com',
        originalUrl: 'https://demo.sirv.com/a.jpg',
        bytes: 100,
        width: 800,
        height: 600,
        format: 'JPEG',
      },
      alt: 'A shoe',
    });
    expect(value._type).toBe('sirv.image');
  });
});
