/** Tiny className combiner (filters out falsy parts). */
export function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(' ');
}
