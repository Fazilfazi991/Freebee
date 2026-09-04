import { describe, expect, it } from 'vitest';
import { convertCase, decodeBase64, decodeJwt, encodeBase64, hashValue, textStats } from './engine';

describe('utility engine', () => {
  it('round trips Unicode Base64', () => expect(decodeBase64(encodeBase64('مرحبا 👋'))).toBe('مرحبا 👋'));
  it('decodes JWT sections without verifying them', () =>
    expect(decodeJwt('eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.').payload.sub).toBe('1'));
  it('matches a SHA-256 vector', async () =>
    expect(await hashValue('abc', 'SHA-256')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
  it('counts and converts text', () => {
    expect(textStats('One two.')).toMatchObject({ words: 2, characters: 8 });
    expect(convertCase('Hello world', 'snake')).toBe('hello_world');
  });
});
