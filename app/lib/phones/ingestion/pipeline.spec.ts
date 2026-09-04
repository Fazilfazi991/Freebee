import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { runDryRunPipeline } from './pipeline';
import { phoneRepository } from '~/lib/phones/repository';

const fixture = (name: string) => readFileSync(`test-fixtures/phones/${name}.html`, 'utf8');

describe('production ingestion pipeline', () => {
  it('invokes parser, scoping, validation, provenance, review gating, and change detection', () => {
    const extractor = vi.fn((_html, options) => ({
      brand: 'apple' as const,
      model: options?.model,
      fields: { 'dimensions.weightG': 3, 'memory.storageOptionsGb': [256] },
      evidence: { dimensions: { section: 'Size and Weight', text: '3 g' } },
      unsupported: ['memory.ramGb', 'battery.capacityMah'],
      parserVersion: 'apple-parser-test',
      modelScopeEvidence: '<h1>iPhone 17</h1>',
      ambiguous: false,
    }));
    const report = runDryRunPipeline({
      brand: 'apple',
      slug: 'iphone-17',
      modelName: 'iPhone 17',
      region: 'AE',
      url: 'https://www.apple.com/ae/iphone-17/specs/',
      html: fixture('apple'),
      sourceHash: 'fixture-change',
      httpStatus: 200,
      previous: phoneRepository.getPhone('apple', 'iphone-17'),
      extractor,
    });
    expect(extractor).toHaveBeenCalledWith(expect.any(String), { model: 'iPhone 17' });
    expect(report.modelScoping.status).toBe('passed');
    expect(report.provenance['dimensions.weightG'].sourceSection).toBe('Size and Weight');
    expect(report.criticalValidationFailures).toContainEqual(expect.objectContaining({ field: 'dimensions.weightG' }));
    expect(report.publicationStatusCandidate).toBe('needs-review');
    expect(report.changedFields).toContainEqual(expect.objectContaining({ field: 'dimensions.weightG' }));
    expect(report.persisted).toBe(false);
  });

  it('uses the real Samsung parser and isolates the requested fixture model', () => {
    const report = runDryRunPipeline({
      brand: 'samsung',
      slug: 'galaxy-s26',
      modelName: 'galaxy-s26',
      region: 'AE',
      url: 'https://www.samsung.com/ae/smartphones/galaxy-s26/specs/',
      html: fixture('samsung'),
      sourceHash: 'fixture',
      httpStatus: 200,
    });
    expect(report.fieldsExtracted['battery.capacityMah']).toBe(4300);
    expect(report.modelScoping.evidence).toContain('data-model="galaxy-s26"');
    expect(report.persisted).toBe(false);
  });
});
