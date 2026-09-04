import { parseNumberUnit, parseRefreshRate, parseStorageOptions } from '~/lib/phones/normalization';
import type { BrandExtractor } from './types';
import { ModelScopeError, scopeByExplicitModel, toPlainText } from './scoping';

export const extractSamsung: BrandExtractor = (html, options) => {
  if (!options?.model) {
    throw new ModelScopeError('Samsung multi-model extraction requires an explicit model.');
  }

  const scoped = scopeByExplicitModel(html, options.model);
  const t = toPlainText(scoped.html);

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
    unsupported: [],
    parserVersion: 'samsung-parser-v2',
    modelScopeEvidence: scoped.evidence,
    ambiguous: scoped.ambiguous,
  };
};
