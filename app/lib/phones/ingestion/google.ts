import { parseNumberUnit, parseRefreshRate, parseResolution, parseStorageOptions } from '~/lib/phones/normalization';
import type { BrandExtractor } from './types';
import { ModelScopeError, scopeByExplicitModel, toPlainText } from './scoping';

export const extractGoogle: BrandExtractor = (html, options) => {
  if (!options?.model && /Pixel\s+\d+\s+Pro\s+XL/i.test(toPlainText(html))) {
    throw new ModelScopeError('Google multi-model extraction requires an explicit model.');
  }

  const scoped = scopeByExplicitModel(html, options?.model);
  const t = toPlainText(scoped.html);
  const resolution = parseResolution(t);

  return {
    brand: 'google',
    model: t.match(/Pixel\s+\d+(?:\s+Pro(?:\s+XL)?)?/i)?.[0],
    fields: {
      'dimensions.weightG': parseNumberUnit(t, 'g'),
      'display.sizeInches': parseNumberUnit(t, '(?:-inch|inch)'),
      'display.resolutionWidth': resolution?.width,
      'display.resolutionHeight': resolution?.height,
      'display.refreshRateMaxHz': parseRefreshRate(t)?.max,
      'battery.capacityMah': parseNumberUnit(t, 'mAh'),
      'memory.storageOptionsGb': parseStorageOptions(t),
    },
    evidence: { display: { section: 'Display', text: t.match(/Display[\s\S]{0,240}/i)?.[0] ?? '' } },
    unsupported: [],
    parserVersion: 'google-parser-v2',
    modelScopeEvidence: scoped.evidence,
    ambiguous: scoped.ambiguous,
  };
};
