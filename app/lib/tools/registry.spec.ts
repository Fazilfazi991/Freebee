import { describe, expect, it } from 'vitest';
import { tools } from './registry';
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
});
