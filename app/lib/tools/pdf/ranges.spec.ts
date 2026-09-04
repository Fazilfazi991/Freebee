import { describe, expect, it } from 'vitest';
import { parsePageRanges } from './ranges';
describe('parsePageRanges', () => {
  it('parses pages and ranges in requested order without duplicates', () =>
    expect(parsePageRanges('1-3,3,7,10-12', 12)).toEqual([0, 1, 2, 6, 9, 10, 11]));
  it('rejects malformed and out-of-bounds ranges', () => {
    expect(() => parsePageRanges('3-1', 5)).toThrow();
    expect(() => parsePageRanges('6', 5)).toThrow();
    expect(() => parsePageRanges('one', 5)).toThrow();
  });
});
