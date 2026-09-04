import { phones } from '~/lib/phones/data';
import type { Phone, PhoneBrand, PublicationState, Provenance } from '~/lib/phones/schema';
import { validatePhone, type ValidationIssue } from '~/lib/phones/validation';
import { extractApple } from './apple';
import { extractGoogle } from './google';
import { extractSamsung } from './samsung';
import type { BrandExtractor, ExtractedFacts } from './types';

export type SourceHealthCode =
  | 'source-fetch-failed'
  | 'source-structure-changed'
  | 'parser-zero-fields'
  | 'model-scoping-failed'
  | 'validation-anomaly'
  | 'large-field-count-drop'
  | 'hash-only-change';

export interface SourceHealthSignal {
  code: SourceHealthCode;
  severity: 'warning' | 'critical';
  message: string;
}

export interface DryRunPipelineInput {
  brand: PhoneBrand;
  slug: string;
  modelName: string;
  region: string;
  url: string;
  html: string;
  sourceHash: string;
  httpStatus: number;
  retrievedAt?: string;
  previous?: Phone;
  extractor?: BrandExtractor;
}

export interface DryRunPipelineResult {
  brand: PhoneBrand;
  model: string;
  region: string;
  sourceUrl: string;
  httpStatus: number;
  sourceHash: string;
  parserVersion: string;
  modelScoping: { status: 'passed'; evidence: string };
  fieldsExtracted: Record<string, unknown>;
  unavailableFields: Record<string, null>;
  provenance: Record<string, Provenance>;
  warnings: ValidationIssue[];
  criticalValidationFailures: ValidationIssue[];
  publicationStatusCandidate: PublicationState;
  publicationEligible: boolean;
  changedFields: Array<{ field: string; previousValue?: unknown; newValue?: unknown; reviewStatus: 'pending' }>;
  sourceHealth: SourceHealthSignal[];
  persisted: false;
  normalizedPhone: Phone;
}

const extractors: Record<PhoneBrand, BrandExtractor> = {
  apple: extractApple,
  samsung: extractSamsung,
  google: extractGoogle,
};

const setPath = (target: Record<string, unknown>, path: string, value: unknown) => {
  const parts = path.split('.');
  let cursor = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value;
    } else {
      cursor = (cursor[part] ??= {}) as Record<string, unknown>;
    }
  });
};

const comparable = (phone: Phone) => ({
  design: phone.design,
  dimensions: phone.dimensions,
  display: phone.display,
  performance: phone.performance,
  memory: phone.memory,
  rearCameras: phone.rearCameras,
  frontCameras: phone.frontCameras,
  battery: phone.battery,
  connectivity: phone.connectivity,
  sim: phone.sim,
  software: phone.software,
});

const countPopulatedLeaves = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  if (Array.isArray(value)) {
    return value.length ? 1 : 0;
  }

  if (typeof value !== 'object') {
    return 1;
  }

  return Object.values(value as Record<string, unknown>).reduce<number>(
    (count, child) => count + countPopulatedLeaves(child),
    0,
  );
};

const summarize = (previous: unknown, next: unknown, prefix = ''): DryRunPipelineResult['changedFields'] => {
  const before = (previous ?? {}) as Record<string, unknown>;
  const after = (next ?? {}) as Record<string, unknown>;

  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) => {
    const field = prefix ? `${prefix}.${key}` : key;
    const a = before[key];
    const b = after[key];

    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      return summarize(a, b, field);
    }

    return JSON.stringify(a) === JSON.stringify(b)
      ? []
      : [{ field, previousValue: a, newValue: b, reviewStatus: 'pending' as const }];
  });
};

const emptyPhone = (input: DryRunPipelineInput, facts: ExtractedFacts, now: string): Phone => ({
  id: `${input.brand}-${input.slug}`,
  slug: input.slug,
  brand: input.brand,
  model: facts.model ?? input.modelName,
  series: input.modelName.replace(/\s+(?:Pro(?:\s+XL|\s+Max)?|Ultra|Plus|\+)$/i, ''),
  quality: 'partial',
  publicationState: 'draft',
  parserVersion: facts.parserVersion,
  source: {
    manufacturer: input.brand === 'apple' ? 'Apple' : input.brand === 'samsung' ? 'Samsung' : 'Google',
    officialUrl: input.url,
    region: input.region,
    retrievedAt: now,
    lastCheckedAt: now,
    lastChangedAt: now,
    sourceHash: input.sourceHash,
  },
  provenance: {},
  design: { colors: [] },
  dimensions: {},
  display: {},
  performance: {},
  memory: { storageOptionsGb: [] },
  rearCameras: [],
  frontCameras: [],
  battery: {},
  connectivity: {},
  sim: {},
  software: {},
});

const buildProvenance = (
  facts: ExtractedFacts,
  extractedFields: Record<string, unknown>,
  input: DryRunPipelineInput,
  now: string,
) => {
  const fallback = Object.values(facts.evidence)[0] ?? { section: 'Model scope', text: facts.modelScopeEvidence };
  return Object.fromEntries(
    Object.entries(extractedFields).map(([field]) => {
      const section = Object.entries(facts.evidence).find(([key]) => field.startsWith(key))?.[1] ?? fallback;
      return [
        field,
        {
          sourceUrl: input.url,
          sourceSection: section.section,
          sourceText: section.text,
          verifiedAt: now,
        },
      ];
    }),
  );
};

export function runDryRunPipeline(input: DryRunPipelineInput): DryRunPipelineResult {
  const now = input.retrievedAt ?? new Date().toISOString();
  const previous = input.previous ?? phones.find((phone) => phone.brand === input.brand && phone.slug === input.slug);
  const facts = (input.extractor ?? extractors[input.brand])(input.html, { model: input.modelName });
  const extractedFields = Object.fromEntries(
    Object.entries(facts.fields).filter(
      ([, value]) => value !== undefined && (!Array.isArray(value) || value.length > 0),
    ),
  );
  const phone = emptyPhone(input, facts, now);
  Object.entries(extractedFields).forEach(([path, value]) =>
    setPath(phone as unknown as Record<string, unknown>, path, value),
  );
  phone.provenance = buildProvenance(facts, extractedFields, input, now);

  const issues = validatePhone(phone);
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const criticalValidationFailures = issues.filter((issue) => issue.severity === 'critical');
  const changedFields = summarize(previous ? comparable(previous) : {}, comparable(phone));
  const sameHash = previous?.source.sourceHash === input.sourceHash;
  const meaningfulChange = changedFields.length > 0;
  const publicationStatusCandidate: PublicationState = criticalValidationFailures.length
    ? 'needs-review'
    : !previous
      ? 'draft'
      : meaningfulChange
        ? 'needs-review'
        : previous.publicationState;
  phone.publicationState = publicationStatusCandidate;
  phone.quality = criticalValidationFailures.length
    ? 'needs-review'
    : Object.keys(extractedFields).length
      ? 'partial'
      : 'needs-review';

  const previousFieldCount = previous ? countPopulatedLeaves(comparable(previous)) : 0;
  const sourceHealth: SourceHealthSignal[] = [];

  if (!Object.keys(extractedFields).length) {
    sourceHealth.push({ code: 'parser-zero-fields', severity: 'critical', message: 'Parser returned zero fields.' });
  }

  if (facts.ambiguous) {
    sourceHealth.push({ code: 'model-scoping-failed', severity: 'critical', message: 'Model scope is ambiguous.' });
  }

  if (criticalValidationFailures.length) {
    sourceHealth.push({
      code: 'validation-anomaly',
      severity: 'critical',
      message: 'Critical validation issues found.',
    });
  }

  if (previousFieldCount >= 4 && Object.keys(extractedFields).length < previousFieldCount / 2) {
    sourceHealth.push({
      code: 'large-field-count-drop',
      severity: 'warning',
      message: 'Extracted field count fell by more than 50%.',
    });
  }

  if (!sameHash && previous && !meaningfulChange) {
    sourceHealth.push({
      code: 'hash-only-change',
      severity: 'warning',
      message: 'Source hash changed without a normalized field change.',
    });
  }

  return {
    brand: input.brand,
    model: input.modelName,
    region: input.region,
    sourceUrl: input.url,
    httpStatus: input.httpStatus,
    sourceHash: input.sourceHash,
    parserVersion: facts.parserVersion,
    modelScoping: { status: 'passed', evidence: facts.modelScopeEvidence },
    fieldsExtracted: extractedFields,
    unavailableFields: Object.fromEntries(facts.unsupported.map((field) => [field, null])),
    provenance: phone.provenance,
    warnings,
    criticalValidationFailures,
    publicationStatusCandidate,
    publicationEligible: publicationStatusCandidate === 'published' && !criticalValidationFailures.length,
    changedFields,
    sourceHealth,
    persisted: false,
    normalizedPhone: phone,
  };
}
