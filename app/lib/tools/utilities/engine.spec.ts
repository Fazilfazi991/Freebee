import { describe, expect, it } from 'vitest';
import {
  convertCase,
  decodeBase64,
  decodeJwt,
  encodeBase64,
  generatePassword,
  hashValue,
  jwtTimestamps,
  textStats,
} from './engine';

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
  it('presents JWT timestamps and expiry state', () => {
    expect(jwtTimestamps({ exp: 2, iat: 1 }, 1500)).toMatchObject([
      { claim: 'iat', unix: 1, status: 'Recorded time' },
      { claim: 'exp', unix: 2, status: 'Not expired' },
    ]);
  });
  it('generates passwords with selected groups and exclusions', () => {
    const password = generatePassword(32, ['lower', 'number'], 'abc234');
    expect(password).toHaveLength(32);
    expect(password).not.toMatch(/[abc234]/u);
    expect(password).toMatch(/[a-z]/u);
    expect(password).toMatch(/[0-9]/u);
  });
});
