import { describe, expect, it } from 'vitest';
import { formatDuration, mediaOutputName, validateTrimRange } from './formats';

describe('media helpers', () => {
  it('formats durations', () => expect(formatDuration(65.25)).toBe('1:05.25'));
  it('validates trim ranges', () => {
    expect(validateTrimRange(1, 3, 5)).toBeNull();
    expect(validateTrimRange(3, 1, 5)).toContain('after');
    expect(validateTrimRange(0, 8, 5)).toContain('within');
  });
  it('creates predictable output names', () =>
    expect(mediaOutputName('clip.mov', 'muted', 'mp4')).toBe('clip-muted.mp4'));
});
