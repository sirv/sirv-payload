import { describe, expect, it } from 'vitest';
import { classifyAssetType, classifyBrowseType } from './index.js';

describe('classifyAssetType', () => {
  it('detects spins and views by extension, never by contentType', () => {
    // Both .spin and .view report application/json from the API.
    expect(classifyAssetType({ extension: '.spin', contentType: 'application/json' })).toBe('spin');
    expect(classifyAssetType({ extension: '.view', contentType: 'application/json' })).toBe('view');
    expect(classifyAssetType({ filename: 'car.spin', contentType: 'application/json' })).toBe(
      'spin',
    );
  });

  it('detects 3D models (.glb) by extension', () => {
    expect(classifyAssetType({ extension: '.glb' })).toBe('model');
    expect(classifyAssetType({ filename: 'chair.glb' })).toBe('model');
  });

  it('detects images and videos by contentType', () => {
    expect(classifyAssetType({ contentType: 'image/jpeg' })).toBe('image');
    expect(classifyAssetType({ contentType: 'video/mp4' })).toBe('video');
  });

  it('returns null for unsupported types', () => {
    expect(classifyAssetType({ contentType: 'text/html', filename: 'a.html' })).toBeNull();
    expect(
      classifyAssetType({ contentType: 'application/json', filename: 'data.json' }),
    ).toBeNull();
  });
});

describe('classifyBrowseType', () => {
  it('classifies media the same as classifyAssetType', () => {
    expect(classifyBrowseType({ contentType: 'image/png', filename: 'a.png' })).toBe('image');
    expect(classifyBrowseType({ extension: '.spin', contentType: 'application/json' })).toBe(
      'spin',
    );
  });

  it("classifies non-media files as 'file' instead of null", () => {
    expect(classifyBrowseType({ contentType: 'application/pdf', filename: 'doc.pdf' })).toBe(
      'file',
    );
    expect(classifyBrowseType({ contentType: 'application/zip', filename: 'a.zip' })).toBe('file');
  });
});
