import type { AssetType, BrowseType } from '@sirv/sirv-client';

/** Lucene fragment that matches a single asset type in /v2/files/search. */
export function typeClause(type: AssetType): string {
  switch (type) {
    case 'image':
      return 'contentType:image*';
    case 'video':
      return 'contentType:video*';
    case 'spin':
      return 'extension:.spin';
    case 'view':
      return 'extension:.view';
    case 'model':
      return 'extension:.glb';
  }
}

const ALL_TYPES: AssetType[] = ['image', 'video', 'spin', 'view', 'model'];

/**
 * Builds a Sirv search query from a free-text term and the active type filters.
 * When all (or no) media types are active, no type constraint is added. A `'file'` filter
 * means "any file", so it drops the type constraint entirely (generic files have no clean
 * Lucene clause; they are classified from the results instead).
 */
export function buildSearchQuery(term: string, types: BrowseType[]): string {
  const trimmed = term.trim();
  const includeOther = types.includes('file');
  const mediaTypes = types.filter((t): t is AssetType => t !== 'file');
  const constrain = !includeOther && mediaTypes.length > 0 && mediaTypes.length < ALL_TYPES.length;
  const typeExpr = constrain ? `(${mediaTypes.map(typeClause).join(' OR ')})` : '';

  if (trimmed && typeExpr) return `${trimmed} AND ${typeExpr}`;
  if (trimmed) return trimmed;
  if (typeExpr) return typeExpr;
  // No term, no constraint: match everything (any file in file-mode, else the four media types).
  return includeOther ? '*' : `(${ALL_TYPES.map(typeClause).join(' OR ')})`;
}
