import { describe, expect, it } from 'vitest';
import {
  buildSpinUrl,
  buildSrcSet,
  buildUrl,
  buildVideoPosterUrl,
  buildVideoUrl,
  buildViewUrl,
} from './index.js';

const input = { alias: 'demo.sirv.com', path: '/products/shoe-01.jpg' };

describe('buildUrl', () => {
  it('builds a plain delivery URL', () => {
    expect(buildUrl(input)).toBe('https://demo.sirv.com/products/shoe-01.jpg');
  });

  it('appends transformation params', () => {
    expect(buildUrl(input, { width: 800, quality: 85, format: 'optimal' })).toBe(
      'https://demo.sirv.com/products/shoe-01.jpg?w=800&q=85&format=optimal',
    );
  });

  it('accepts an alias with protocol and a path without a leading slash', () => {
    expect(buildUrl({ alias: 'https://cdn.example.com', path: 'a/b.jpg' }, { width: 100 })).toBe(
      'https://cdn.example.com/a/b.jpg?w=100',
    );
  });

  it('percent-encodes path segments with spaces and Unicode (preserving slashes)', () => {
    expect(buildUrl({ alias: 'demo.sirv.com', path: '/my folder/Кира.jpg' })).toBe(
      'https://demo.sirv.com/my%20folder/%D0%9A%D0%B8%D1%80%D0%B0.jpg',
    );
  });
});

describe('buildSrcSet', () => {
  it('builds a width-descriptor srcset preserving other transforms', () => {
    expect(buildSrcSet(input, [400, 800], { quality: 70 })).toBe(
      'https://demo.sirv.com/products/shoe-01.jpg?w=400&q=70 400w, ' +
        'https://demo.sirv.com/products/shoe-01.jpg?w=800&q=70 800w',
    );
  });
});

describe('media-type builders', () => {
  const video = { alias: 'demo.sirv.com', path: '/clips/intro.mp4' };
  const spin = { alias: 'demo.sirv.com', path: '/spins/car.spin' };
  const view = { alias: 'demo.sirv.com', path: '/views/scene.view' };

  it('builds a video URL with optional sizing', () => {
    expect(buildVideoUrl(video, { width: 1280 })).toBe(
      'https://demo.sirv.com/clips/intro.mp4?w=1280',
    );
  });

  it('builds a JPG poster frame for a video', () => {
    expect(buildVideoPosterUrl(video, { width: 640 })).toBe(
      'https://demo.sirv.com/clips/intro.mp4?w=640&format=jpg',
    );
  });

  it('builds bare spin and view URLs (sirv.js consumes these via data-src)', () => {
    expect(buildSpinUrl(spin)).toBe('https://demo.sirv.com/spins/car.spin');
    expect(buildViewUrl(view)).toBe('https://demo.sirv.com/views/scene.view');
  });
});
