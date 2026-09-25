import { describe, expect, it } from 'vitest';
import { zonedSlotToUtc } from './distribution.server';

describe('posting slot timezone conversion', () => {
  it('anchors Dubai local posting times to UTC', () => {
    expect(zonedSlotToUtc('2026-09-26', '09:00:00', 'Asia/Dubai')?.toISOString())
      .toBe('2026-09-26T05:00:00.000Z');
  });

  it('uses the correct offset on either side of daylight saving', () => {
    expect(zonedSlotToUtc('2026-03-07', '09:00:00', 'America/New_York')?.toISOString())
      .toBe('2026-03-07T14:00:00.000Z');
    expect(zonedSlotToUtc('2026-03-09', '09:00:00', 'America/New_York')?.toISOString())
      .toBe('2026-03-09T13:00:00.000Z');
  });

  it('skips a local posting time that disappears at a daylight saving transition', () => {
    expect(zonedSlotToUtc('2026-03-08', '02:30:00', 'America/New_York')).toBeNull();
  });

  it('rejects invalid dates, times and timezones', () => {
    expect(zonedSlotToUtc('2026-09-26', '25:00:00', 'Asia/Dubai')).toBeNull();
    expect(zonedSlotToUtc('2026-09-26', '09:00:00junk', 'Asia/Dubai')).toBeNull();
    expect(zonedSlotToUtc('2026-02-30', '09:00:00', 'Asia/Dubai')).toBeNull();
    expect(zonedSlotToUtc('2026-09-26', '09:00:00', 'Atlantis/Lost')).toBeNull();
  });
});
