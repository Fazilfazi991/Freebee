export const encodeBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));

  return btoa(binary);
};

export const decodeBase64 = (value: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(value.trim()), (char) => char.charCodeAt(0)));

export function decodeJwt(token: string) {
  const parts = token.trim().split('.');

  if (parts.length !== 3) {
    throw new Error('A JWT must contain three dot-separated sections.');
  }

  const parse = (part: string) =>
    JSON.parse(
      decodeBase64(
        part
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(Math.ceil(part.length / 4) * 4, '='),
      ),
    );

  return { header: parse(parts[0]), payload: parse(parts[1]) };
}

export function jwtTimestamps(payload: Record<string, unknown>, now = Date.now()) {
  return (['iat', 'nbf', 'exp'] as const).flatMap((claim) => {
    const seconds = payload[claim];

    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
      return [];
    }

    const date = new Date(seconds * 1000);
    let status = 'Recorded time';

    if (claim === 'exp') {
      status = date.valueOf() <= now ? 'Expired' : 'Not expired';
    }

    if (claim === 'nbf') {
      status = date.valueOf() > now ? 'Not active yet' : 'Active';
    }

    return [{ claim, unix: seconds, utc: date.toISOString(), local: date.toLocaleString(), status }];
  });
}

export async function hashValue(value: string | ArrayBuffer, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512') {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest(algorithm, data);

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function textStats(value: string) {
  const trimmed = value.trim();
  const words = trimmed ? trimmed.split(/\s+/u).length : 0;

  return {
    words,
    characters: value.length,
    charactersWithoutSpaces: value.replace(/\s/gu, '').length,
    sentences: (trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/gu) ?? []).length,
    paragraphs: trimmed ? trimmed.split(/\n\s*\n/u).length : 0,
    readingMinutes: Math.max(words ? 1 : 0, Math.ceil(words / 200)),
  };
}

const words = (value: string) =>
  value
    .trim()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

export function convertCase(value: string, style: string) {
  const items = words(value).map((item) => item.toLowerCase());

  if (style === 'lower') {
    return value.toLowerCase();
  }

  if (style === 'upper') {
    return value.toUpperCase();
  }

  if (style === 'title') {
    return items.map((item) => item[0]?.toUpperCase() + item.slice(1)).join(' ');
  }

  if (style === 'sentence') {
    return items.join(' ').replace(/^./u, (char) => char.toUpperCase());
  }

  if (style === 'camel') {
    return items.map((item, index) => (index ? item[0]?.toUpperCase() + item.slice(1) : item)).join('');
  }

  if (style === 'pascal') {
    return items.map((item) => item[0]?.toUpperCase() + item.slice(1)).join('');
  }

  return items.join(style === 'snake' ? '_' : '-');
}

const groups = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  number: '23456789',
  symbol: '!@#$%^&*_-+=',
};

export function generatePassword(length: number, enabled = Object.keys(groups), excluded = '') {
  const excludedCharacters = new Set(excluded);
  const selected = enabled
    .map((key) => groups[key as keyof typeof groups])
    .filter(Boolean)
    .map((group) => [...group].filter((character) => !excludedCharacters.has(character)).join(''))
    .filter(Boolean);

  if (!selected.length) {
    throw new Error('Select at least one character group.');
  }

  if (length < selected.length) {
    throw new Error(`Use at least ${selected.length} characters to include every selected group.`);
  }

  const pool = selected.join('');
  const random = new Uint32Array(length);
  crypto.getRandomValues(random);

  const required = selected.map((group, index) => group[random[index] % group.length]);

  return [...required, ...[...random.slice(required.length)].map((value) => pool[value % pool.length])]
    .join('')
    .slice(0, length);
}
