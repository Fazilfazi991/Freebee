import { describe, expect, it } from 'vitest';
import { searchTools, tools, toolsForCategory } from './registry';
describe('tool registry', () => {
  it('has unique slugs', () => expect(new Set(tools.map((tool) => tool.slug)).size).toBe(tools.length));
  it('marks implemented browser tools ready', () => {
    const expected = [
      'qr-generator',
      'json-formatter',
      'jpg-to-pdf',
      'merge-pdf',
      'split-pdf',
      'organize-pdf',
      'compress-image',
      'resize-image',
      'jpg-to-png',
      'png-to-jpg',
      'jpg-to-webp',
      'webp-to-jpg',
      'pdf-to-jpg',
      'pdf-to-png',
      'rotate-pdf',
      'remove-pdf-pages',
      'extract-pdf-pages',
      'add-page-numbers-to-pdf',
      'image-to-text',
      'media-info',
      'uuid-generator',
      'base64-encoder',
      'base64-decoder',
      'url-encoder',
      'url-decoder',
      'jwt-decoder',
      'hash-generator',
      'timestamp-converter',
      'word-counter',
      'character-counter',
      'text-case-converter',
      'json-validator',
      'password-generator',
      'csv-to-json',
      'json-to-csv',
      'invoice-generator',
      'quotation-generator',
      'signature-generator',
    ];
    expected.forEach((slug) => expect(tools.find((tool) => tool.slug === slug)?.engine).toBe('browser'));
  });
  it('finds useful working tools for realistic launch queries', () => {
    const queries: Record<string, string> = {
      pdf: 'merge-pdf',
      merge: 'merge-pdf',
      'jpg pdf': 'jpg-to-pdf',
      'compress image': 'compress-image',
      'resize photo': 'resize-image',
      ocr: 'image-to-text',
      'image text': 'image-to-text',
      qr: 'qr-generator',
      invoice: 'invoice-generator',
      quote: 'quotation-generator',
      signature: 'signature-generator',
      json: 'json-formatter',
      csv: 'csv-to-json',
      jwt: 'jwt-decoder',
      uuid: 'uuid-generator',
      password: 'password-generator',
      hash: 'hash-generator',
      timestamp: 'timestamp-converter',
      'video info': 'media-info',
    };

    Object.entries(queries).forEach(([query, slug]) => expect(searchTools(query)[0]?.slug).toBe(slug));
    expect(searchTools('mp4 mp3')).toEqual([]);
  });
  it('registers the complete working calculator category', () => {
    const calculators = toolsForCategory('calculator');
    expect(calculators).toHaveLength(35);
    expect(calculators.every((tool) => tool.engine === 'browser' && tool.slug.startsWith('calculator/'))).toBe(true);
    expect(searchTools('how old am I')[0]?.id).toBe('age-calculator');
    expect(searchTools('monthly installment')[0]?.id).toBe('emi-calculator');
    expect(searchTools('petrol cost')[0]?.id).toBe('fuel-cost-calculator');
    expect(searchTools('room area calculator')[0]?.id).toBe('square-footage-calculator');
  });
});
