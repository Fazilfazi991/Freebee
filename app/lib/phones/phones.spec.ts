import { describe, expect, it } from 'vitest';
import { extractApple } from './ingestion/apple';
import { extractGoogle } from './ingestion/google';
import { extractSamsung } from './ingestion/samsung';
import { parseRefreshRate, parseResolution, parseStorageOptions } from './normalization';
import { phoneRepository } from './repository';
import { validatePhone } from './validation';
import type { Phone } from './schema';
import { changedFields, hashNormalizedSource } from './change-detection';
describe('phone normalization', () => {
  it('parses resolution and refresh ranges', () => {
    expect(parseResolution('1080 x 2424 OLED')).toEqual({ width: 1080, height: 2424 });
    expect(parseRefreshRate('adaptive 1-120Hz')).toEqual({ min: 1, max: 120, adaptive: true });
  });
  it('normalizes GB and TB storage', () =>
    expect(parseStorageOptions('256GB / 512 GB / 1TB')).toEqual([256, 512, 1024]));
});
describe('brand extractors', () => {
  it('extracts Apple facts', () =>
    expect(
      extractApple('<h1>iPhone 17</h1><section>6.3-inch 2622-by-1206 120Hz 177 grams 256GB</section>').fields[
        'dimensions.weightG'
      ],
    ).toBe(177));
  it('extracts Samsung facts', () =>
    expect(
      extractSamsung('<h1>Galaxy S26</h1><p>6.3 inch 120Hz 4300 mAh 167 g 256GB</p>').fields['battery.capacityMah'],
    ).toBe(4300));
  it('extracts Google facts', () =>
    expect(
      extractGoogle('<h1>Pixel 10</h1><p>6.3-inch 1080 x 2424 60-120Hz 4970mAh 204g</p>').fields[
        'display.resolutionWidth'
      ],
    ).toBe(1080));
});
describe('provenance and validation', () => {
  it('preserves official URL and region', () => {
    const p = phoneRepository.getPhone('apple', 'iphone-17')!;
    expect(p.source.officialUrl).toContain('apple.com/ae');
    expect(p.source.region).toBe('AE');
    expect(p.provenance.display.sourceUrl).toBe(p.source.officialUrl);
  });
  it('flags impossible values', () => {
    const bad = { ...phoneRepository.getPhones()[0], dimensions: { weightG: 3 } } as Phone;
    expect(validatePhone(bad)[0].field).toBe('dimensions.weightG');
  });
});
describe('repository comparison and finder', () => {
  it('keeps missing fields explicit', () =>
    expect(phoneRepository.comparePhones(['iphone-17', 'galaxy-s26'])).toHaveLength(2));
  it('combines filters', () => {
    const results = phoneRepository.findPhones({ brand: 'samsung', storageGb: 1024, minRefreshRate: 120 });
    expect(results.map((x) => x.slug)).toEqual(['galaxy-s26-ultra']);
  });
  it('supports natural search tokens', () =>
    expect(phoneRepository.findPhones({ query: 'samsung 256gb' }).length).toBeGreaterThan(0));
});

describe('source change detection', () => {
  it('hashes normalized relevant content consistently', async () => {
    expect(await hashNormalizedSource('<p>Pixel 10</p>')).toBe(await hashNormalizedSource(' <p>Pixel 10</p> '));
  });
  it('reports changed normalized sections', () => {
    const before = phoneRepository.getPhones()[0];
    const after = { ...before, dimensions: { ...before.dimensions, weightG: 180 } };
    expect(changedFields(before, after)).toContain('dimensions');
  });
});
