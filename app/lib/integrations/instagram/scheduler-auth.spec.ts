import { describe, expect, it } from 'vitest';
import { verifySchedulerSignature } from '~/routes/api.instagram.scheduler';

const secret = 'test-secret-that-is-long-enough-for-hmac-verification';
const timestamp = '1790362800';

async function signature(time: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key,
    new TextEncoder().encode(`${time}.GET./api/instagram/scheduler`)));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

describe('scheduler request authentication', () => {
  it('accepts only a current matching HMAC', async () => {
    const valid = await signature(timestamp);
    expect(await verifySchedulerSignature(secret, timestamp, valid, Number(timestamp) + 30)).toBe(true);
    expect(await verifySchedulerSignature(secret, timestamp, valid, Number(timestamp) + 301)).toBe(false);
    expect(await verifySchedulerSignature('wrong-secret-that-is-long-enough-for-checking', timestamp, valid,
      Number(timestamp))).toBe(false);
    expect(await verifySchedulerSignature(secret, timestamp, '0'.repeat(64), Number(timestamp))).toBe(false);
  });
});
