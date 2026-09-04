import { parseNumberUnit, parseRefreshRate, parseStorageOptions } from '~/lib/phones/normalization';
import type { BrandExtractor } from './types';

export const extractSamsung: BrandExtractor = (html) => {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return {
    brand: 'samsung',
    model: t.match(/Galaxy\s+[A-Z]\d+(?:\+|\s+Ultra)?/i)?.[0],
    fields: {
      'dimensions.weightG': parseNumberUnit(t, 'g'),
      'display.sizeInches': parseNumberUnit(t, '(?:"|inch)'),
      'display.refreshRateMaxHz': parseRefreshRate(t)?.max,
      'battery.capacityMah': parseNumberUnit(t, 'mAh'),
      'memory.storageOptionsGb': parseStorageOptions(t),
    },
    evidence: { specifications: { section: 'Specifications', text: t.slice(0, 300) } },
    unsupported: ['Variant-tab association requires model-scoped source snippet.'],
  };
};
