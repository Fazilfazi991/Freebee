import type { PhoneBrand } from '~/lib/phones/schema';
export interface ExtractedFacts {
  brand: PhoneBrand;
  model?: string;
  fields: Record<string, unknown>;
  evidence: Record<string, { section: string; text: string }>;
  unsupported: string[];
}
export type BrandExtractor = (html: string) => ExtractedFacts;
