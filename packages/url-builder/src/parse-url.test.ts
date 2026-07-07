import { describe, expect, it } from 'vitest';
import { buildUrl, parseUrl } from './index.js';
import type { Transformations } from './index.js';

describe('parseUrl', () => {
  it('parses alias, path and transformations', () => {
    const result = parseUrl('https://demo.sirv.com/products/shoe-01.jpg?w=800&q=85&format=optimal');
    expect(result.alias).toBe('demo.sirv.com');
    expect(result.path).toBe('/products/shoe-01.jpg');
    expect(result.transformations).toMatchObject({ width: 800, quality: 85, format: 'optimal' });
  });

  it('parses crop, geometry and effect params', () => {
    const result = parseUrl(
      'https://demo.sirv.com/a.jpg?cw=400&ch=300&cx=10&crop.type=face&rotate=90&flip=true&grayscale=true&blur=5',
    );
    expect(result.transformations.crop).toEqual({ width: 400, height: 300, x: 10, type: 'face' });
    expect(result.transformations.rotate).toBe(90);
    expect(result.transformations.flip).toBe(true);
    expect(result.transformations.grayscale).toBe(true);
    expect(result.transformations.blur).toBe(5);
  });

  it('collects unknown params into extras', () => {
    const result = parseUrl('https://demo.sirv.com/a.jpg?w=100&unknownParam=xyz');
    expect(result.transformations.width).toBe(100);
    expect(result.transformations.extras).toEqual({ unknownParam: 'xyz' });
  });

  it('round-trips with buildUrl for the modelled params', () => {
    const input = { alias: 'demo.sirv.com', path: '/products/shoe-01.jpg' };
    const transforms: Transformations = {
      width: 800,
      height: 600,
      quality: 80,
      format: 'webp',
      rotate: 180,
      crop: { width: 200, height: 200, type: 'poi' },
    };
    const parsed = parseUrl(buildUrl(input, transforms));
    expect(parsed.alias).toBe(input.alias);
    expect(parsed.path).toBe(input.path);
    expect(parsed.transformations).toEqual(transforms);
  });
});
