import { describe, expect, it } from 'vitest';
import { sirvAssetUrlField, sirvMediaField, sirvMediaListField } from './index.js';

describe('field factories', () => {
  it('sirvMediaField -> json field with Field + Cell path strings', () => {
    const field = sirvMediaField({ name: 'hero', allowedTypes: ['image'] }) as any;
    expect(field.type).toBe('json');
    expect(field.name).toBe('hero');
    expect(field.admin.components.Field).toBe('@sirv/payload-plugin/client#SirvMediaField');
    expect(field.admin.components.Cell).toBe('@sirv/payload-plugin/client#SirvMediaCell');
    expect(field.admin.custom.sirvAllowedTypes).toEqual(['image']);
  });

  it('sirvMediaListField -> json field with list components', () => {
    const field = sirvMediaListField({ name: 'gallery' }) as any;
    expect(field.type).toBe('json');
    expect(field.admin.components.Field).toBe('@sirv/payload-plugin/client#SirvMediaListField');
    expect(field.admin.components.Cell).toBe('@sirv/payload-plugin/client#SirvMediaListCell');
  });

  it('sirvAssetUrlField -> text field with url component', () => {
    const field = sirvAssetUrlField({ name: 'assetUrl', required: true }) as any;
    expect(field.type).toBe('text');
    expect(field.required).toBe(true);
    expect(field.admin.components.Field).toBe('@sirv/payload-plugin/client#SirvAssetUrlField');
    expect(field.admin.components.Cell).toBeUndefined();
  });
});
