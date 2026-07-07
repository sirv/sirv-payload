import type { DamAsset } from '@sirv/core';
import { describe, expect, it } from 'vitest';
import { SirvMediaValueSchema, damAssetToMediaValue } from './value.js';

const alias = 'demo.sirv.com';

function asset(partial: Partial<DamAsset> & Pick<DamAsset, 'type' | 'path'>): DamAsset {
  return { name: partial.path.split('/').pop() ?? '', bytes: 1234, ...partial };
}

describe('damAssetToMediaValue', () => {
  it('maps an image to the frozen sirvMedia shape', () => {
    const value = damAssetToMediaValue(
      asset({ type: 'image', path: '/products/shoe.jpg', width: 800, height: 600 }),
      alias,
    );
    expect(value).toMatchObject({
      _type: 'sirvMedia',
      mediaType: 'image',
      sirvPath: '/products/shoe.jpg',
      sirvAlias: alias,
      originalUrl: 'https://demo.sirv.com/products/shoe.jpg',
      width: 800,
      height: 600,
      format: 'jpg',
      alt: '',
    });
    expect(SirvMediaValueSchema.parse(value)).toEqual(value);
  });

  it('maps a video with controls defaulted on', () => {
    const value = damAssetToMediaValue(
      asset({ type: 'video', path: '/clips/a.mp4', width: 1920, height: 1080, durationSec: 12 }),
      alias,
    );
    expect(value.mediaType).toBe('video');
    expect(value.durationSec).toBe(12);
    expect(value.controls).toBe(true);
  });

  it('maps spin/view/model', () => {
    expect(damAssetToMediaValue(asset({ type: 'spin', path: '/s.spin' }), alias).mediaType).toBe(
      'spin',
    );
    expect(damAssetToMediaValue(asset({ type: 'view', path: '/v.view' }), alias).mediaType).toBe(
      'view',
    );
    const model = damAssetToMediaValue(asset({ type: 'model', path: '/m.glb' }), alias);
    expect(model.mediaType).toBe('model');
    expect(SirvMediaValueSchema.parse(model)).toEqual(model);
  });

  it('encodes paths with spaces/unicode in originalUrl', () => {
    const value = damAssetToMediaValue(
      asset({ type: 'image', path: '/my folder/Кира.jpg' }),
      alias,
    );
    expect(value.originalUrl).toBe(
      'https://demo.sirv.com/my%20folder/%D0%9A%D0%B8%D1%80%D0%B0.jpg',
    );
  });

  it('refuses to store a generic file as media', () => {
    expect(() => damAssetToMediaValue(asset({ type: 'file', path: '/doc.pdf' }), alias)).toThrow();
  });
});
