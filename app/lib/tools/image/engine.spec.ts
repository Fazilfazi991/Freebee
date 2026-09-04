import { describe, expect, it } from 'vitest';
import { extensionForFormat, fitDimensions } from './engine';
describe('image engine calculations', () => {
  it('maps MIME formats to extensions', () => {
    expect(extensionForFormat('image/jpeg')).toBe('jpg');
    expect(extensionForFormat('image/png')).toBe('png');
    expect(extensionForFormat('image/webp')).toBe('webp');
  });
  it('preserves aspect ratio from width or height', () => {
    expect(fitDimensions(1600, 900, 800, undefined, true)).toEqual({ width: 800, height: 450 });
    expect(fitDimensions(1600, 900, undefined, 450, true)).toEqual({ width: 800, height: 450 });
  });
  it('allows unlocked dimensions', () =>
    expect(fitDimensions(100, 50, 80, 80, false)).toEqual({ width: 80, height: 80 }));
});
