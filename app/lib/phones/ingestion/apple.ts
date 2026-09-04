import { parseNumberUnit, parseRefreshRate, parseResolution, parseStorageOptions } from '~/lib/phones/normalization';
import type { BrandExtractor } from './types';
import { scopeByExplicitModel, toPlainText } from './scoping';

export const extractApple: BrandExtractor = (html, options) => {
  const scoped = scopeByExplicitModel(html, options?.model);
  const t = toPlainText(scoped.html);
  const section = (name: string) => {
    const start = scoped.html.search(new RegExp(`class=["'][^"']*techspecs-section[^"']*section-${name}`, 'i'));

    if (start < 0) {
      return '';
    }

    const rest = scoped.html.slice(start + 1);
    const next = rest.search(/class=["'][^"']*techspecs-section\b/i);

    return scoped.html.slice(start, next < 0 ? undefined : start + 1 + next);
  };
  const displayText = toPlainText(section('display')) || t;
  const capacityText = toPlainText(section('capacity')) || t;
  const batteryText = toPlainText(section('power-battery')) || t;
  const dimensionLabel =
    /aria-label=["']([^"']*Height:[^"']*Width:[^"']*Depth:[^"']*)["']/i.exec(scoped.html)?.[1] ?? '';
  const weightText =
    /<p\b[^>]*class=["'][^"']*weight-copy[^"']*["'][^>]*>([\s\S]*?)<\/p>/i.exec(scoped.html)?.[1] ?? '';
  const resolution = parseResolution(displayText);
  const refresh = parseRefreshRate(displayText);

  return {
    brand: 'apple',
    model: t.match(/iPhone\s+\d+(?:\s+(?:Pro Max|Pro|Plus|e))?/i)?.[0],
    fields: {
      'dimensions.heightMm': parseNumberUnit(dimensionLabel.match(/Height:[^,]+/i)?.[0] ?? '', 'mm'),
      'dimensions.widthMm': parseNumberUnit(dimensionLabel.match(/Width:[^,]+/i)?.[0] ?? '', 'mm'),
      'dimensions.depthMm': parseNumberUnit(dimensionLabel.match(/Depth:[^,]+/i)?.[0] ?? '', 'mm'),
      'dimensions.weightG': parseNumberUnit(toPlainText(weightText) || t, '(?:grams?|g)'),
      'display.sizeInches': parseNumberUnit(displayText, '(?:-inch|inches)'),
      'display.resolutionWidth': resolution?.width,
      'display.resolutionHeight': resolution?.height,
      'display.refreshRateMaxHz': refresh?.max,
      'memory.storageOptionsGb': parseStorageOptions(capacityText),
      'battery.fastChargeClaim': batteryText.match(/Up to \d+% (?:charge )?in (?:about )?\d+ minutes/i)?.[0],
      'sim.esim': /eSIM/i.test(t) || undefined,
      'sim.physicalSim': /not compatible with physical SIM/i.test(t) ? false : undefined,
      rearCameras: [...t.matchAll(/(\d+(?:\.\d+)?)MP\s+(?:Fusion\s+)?(Main|Ultra Wide|Telephoto)/gi)].map((m) => ({
        role: m[2],
        megapixels: Number(m[1]),
      })),
    },
    evidence: {
      display: { section: 'Display', text: displayText.slice(0, 300) },
      dimensions: { section: 'Size and Weight', text: toPlainText(`${dimensionLabel} ${weightText}`).slice(0, 300) },
      memory: { section: 'Capacity', text: capacityText.slice(0, 300) },
      battery: { section: 'Power and Battery', text: batteryText.slice(0, 300) },
    },
    unsupported: ['memory.ramGb', 'battery.capacityMah'],
    parserVersion: 'apple-parser-v2',
    modelScopeEvidence: scoped.evidence,
    ambiguous: scoped.ambiguous,
  };
};
