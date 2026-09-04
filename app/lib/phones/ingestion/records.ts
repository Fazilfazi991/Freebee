import type { Phone, PhoneBrand } from '~/lib/phones/schema';

export interface PhoneSource {
  id: string;
  phoneId: string;
  manufacturer: string;
  officialUrl: string;
  region: string;
  sourceHash: string;
  retrievedAt: string;
  lastChangedAt: string;
  contentType: string;
}
export interface PhoneFieldProvenance {
  phoneId: string;
  fieldPath: string;
  sourceId: string;
  sourceSection: string;
  sourceText: string;
  verifiedAt: string;
  parserVersion: string;
}
export type IngestionStatus = 'running' | 'blocked' | 'failed' | 'awaiting-review' | 'completed';
export interface IngestionRun {
  id: string;
  brand: PhoneBrand;
  model?: string;
  startedAt: string;
  completedAt?: string;
  status: IngestionStatus;
  httpStatus?: number;
  parserVersion: string;
  validationIssues: Array<{ field: string; message: string; severity: 'warning' | 'critical' }>;
}
export interface IngestionChange {
  runId: string;
  phoneId: string;
  fieldPath: string;
  previousValue: unknown;
  newValue: unknown;
  sourceId: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
}
export interface PhonePrice {
  phoneId: string;
  region: string;
  storageVariantGb: number;
  currency: string;
  amount: number;
  sourceType: 'manufacturer-msrp' | 'approved-affiliate-feed' | 'retailer-api';
  sourceUrl: string;
  verifiedAt: string;
}
export interface IngestionCandidate {
  phone: Phone;
  source: PhoneSource;
  provenance: PhoneFieldProvenance[];
  run: IngestionRun;
  changes: IngestionChange[];
}
