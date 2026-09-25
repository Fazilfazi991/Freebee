const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/gu, '+').replace(/_/gu, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export function randomUrlSafe(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function encryptionKey(encodedKey: string): Promise<CryptoKey> {
  const raw = fromBase64Url(encodedKey);
  if (raw.byteLength !== 32) throw new Error('Invalid encryption key configuration');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(value: string, encodedKey: string, purpose: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) },
    await encryptionKey(encodedKey),
    encoder.encode(value),
  ));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);
  return `v1.${toBase64Url(combined)}`;
}

export async function decryptSecret(value: string, encodedKey: string, purpose: string): Promise<string> {
  if (!value.startsWith('v1.')) throw new Error('Unknown ciphertext version');
  const combined = fromBase64Url(value.slice(3));
  if (combined.length < 29) throw new Error('Invalid ciphertext');
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: combined.slice(0, 12), additionalData: encoder.encode(purpose) },
    await encryptionKey(encodedKey),
    combined.slice(12),
  );
  return decoder.decode(plaintext);
}
