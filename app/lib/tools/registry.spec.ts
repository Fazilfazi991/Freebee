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
    ];
    expected.forEach((slug) => expect(tools.find((tool) => tool.slug === slug)?.engine).toBe('browser'));
  });
});
