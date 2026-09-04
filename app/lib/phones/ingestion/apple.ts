import { parseNumberUnit, parseRefreshRate, parseResolution, parseStorageOptions } from '~/lib/phones/normalization';
import type { BrandExtractor } from './types';
import { scopeByExplicitModel, toPlainText } from './scoping';

export const extractApple: BrandExtractor = (html, options) => {
  const scoped = scopeByExplicitModel(html, options?.model);
  const t = toPlainText(scoped.html);
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
      'battery.fastChargeClaim': t.match(/Up to \d+% (?:charge )?in (?:about )?\d+ minutes/i)?.[0],
      'sim.esim': /eSIM/i.test(t) || undefined,
      'sim.physicalSim': /not compatible with physical SIM/i.test(t) ? false : undefined,
      rearCameras: [...t.matchAll(/(\d+(?:\.\d+)?)MP\s+(?:Fusion\s+)?(Main|Ultra Wide|Telephoto)/gi)].map((m) => ({
        role: m[2],
        megapixels: Number(m[1]),
      })),
    },
    evidence: { display: { section: 'Display', text: t.match(/(?:Super Retina|Display)[\s\S]{0,240}/i)?.[0] ?? '' } },
    unsupported: [],
    parserVersion: 'apple-parser-v2',
    modelScopeEvidence: scoped.evidence,
    ambiguous: scoped.ambiguous,
  };
};
