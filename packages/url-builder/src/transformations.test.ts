import { describe, expect, it } from 'vitest';
import { type Transformations, toQueryParams } from './transformations.js';

describe('toQueryParams', () => {
  it('maps sizing params', () => {
    expect(toQueryParams({ width: 800, height: 600, maxSize: 1200, scale: 'fit' })).toEqual({
      w: '800',
      h: '600',
      s: '1200',
      'scale.option': 'fit',
    });
  });

  it('maps quality and format, with optimal/auto/avif all collapsing to optimal', () => {
    expect(toQueryParams({ quality: 85, format: 'optimal' })).toEqual({
      q: '85',
      format: 'optimal',
    });
    expect(toQueryParams({ format: 'auto' }).format).toBe('optimal');
    expect(toQueryParams({ format: 'avif' }).format).toBe('optimal');
    expect(toQueryParams({ format: 'jpeg' }).format).toBe('jpg');
    expect(toQueryParams({ format: 'webp' }).format).toBe('webp');
  });

  it('maps crop params', () => {
    expect(
      toQueryParams({ crop: { width: 400, height: 300, x: 10, y: 20, type: 'face' } }),
    ).toEqual({ cw: '400', ch: '300', cx: '10', cy: '20', 'crop.type': 'face' });
  });

  it('maps geometry and boolean flags only when true', () => {
    expect(toQueryParams({ rotate: 90, flip: true, flop: false })).toEqual({
      rotate: '90',
      flip: 'true',
    });
  });

  it('maps colour/effect params', () => {
    const t: Transformations = {
      blur: 5,
      sharpen: 3,
      grayscale: true,
      brightness: 10,
      contrast: -5,
      saturation: 20,
      hue: 45,
      colortone: 'sepia',
    };
    expect(toQueryParams(t)).toEqual({
      blur: '5',
      sharpen: '3',
      grayscale: 'true',
      brightness: '10',
      contrast: '-5',
      saturation: '20',
      hue: '45',
      colortone: 'sepia',
    });
  });

  it('maps misc params and passes extras through verbatim', () => {
    expect(
      toQueryParams({
        profile: 'MyPreset',
        page: 2,
        download: true,
        extras: { 'watermark.text': 'Hi' },
      }),
    ).toEqual({ profile: 'MyPreset', page: '2', dl: 'true', 'watermark.text': 'Hi' });
  });

  it('emits nothing for an empty transformation set', () => {
    expect(toQueryParams({})).toEqual({});
  });
});
