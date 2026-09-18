import { describe, expect, it } from 'vitest';
import { isValidMeasurementId, sanitizeProperties } from './analytics';

describe('analytics safety', () => {
  it('rejects missing and malformed GA4 measurement IDs', () => {
    expect(isValidMeasurementId(undefined)).toBe(false);
    expect(isValidMeasurementId('UA-123')).toBe(false);
    expect(isValidMeasurementId('G-ABC123')).toBe(true);
  });

  it('keeps only approved metadata and drops sensitive or unknown fields', () => {
    expect(
      sanitizeProperties({
        toolSlug: 'merge-pdf',
        category: 'pdf',
        processingLocation: 'browser',
        searchResultCount: 3,
        query: 'private text',
        filename: 'secret.pdf',
        calculatorInput: '42',
      }),
    ).toEqual({
      toolSlug: 'merge-pdf',
      category: 'pdf',
      processingLocation: 'browser',
      searchResultCount: 3,
    });
  });
});
