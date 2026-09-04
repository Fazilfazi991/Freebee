import type { Phone } from '~/lib/phones/schema';

export function normalizeSourceForHash(source: string) {
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function hashNormalizedSource(source: string) {
  const bytes = new TextEncoder().encode(normalizeSourceForHash(source));
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function changedFields(previous: Phone, next: Phone) {
  const ignored = new Set(['source', 'provenance']);

  return Object.keys(next).filter(
    (key) =>
      !ignored.has(key) && JSON.stringify(previous[key as keyof Phone]) !== JSON.stringify(next[key as keyof Phone]),
  );
}
