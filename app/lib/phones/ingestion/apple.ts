import { parseNumberUnit, parseRefreshRate, parseResolution, parseStorageOptions } from '~/lib/phones/normalization';
import type { BrandExtractor } from './types';

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#xA0;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const extractApple: BrandExtractor = (html) => {
  const t = text(html);
  const resolution = parseResolution(t);
  const refresh = parseRefreshRate(t);

  return {
    brand: 'apple',
    model: t.match(/iPhone\s+\d+(?:\s+(?:Pro Max|Pro|Plus|e))?/i)?.[0],
    fields: {
      'dimensions.weightG': parseNumberUnit(t, '(?:grams?|g)'),
      'display.sizeInches': parseNumberUnit(t, '(?:-inch|inches)'),
      'display.resolutionWidth': resolution?.width,
      'display.resolutionHeight': resolution?.height,
      'display.refreshRateMaxHz': refresh?.max,
      'memory.storageOptionsGb': parseStorageOptions(t),
    },
    evidence: { display: { section: 'Display', text: t.match(/(?:Super Retina|Display)[\s\S]{0,240}/i)?.[0] ?? '' } },
    unsupported: [],
  };
};
