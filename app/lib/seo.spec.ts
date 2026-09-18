import { describe, expect, it } from 'vitest';
import { getToolSeo, publicIndexableTools, relatedToolsFor } from './seo';
import { tools } from './tools/registry';

describe('SEO source of truth', () => {
  it('keeps working tools indexable and planned tools out of the public set', () => {
    expect(publicIndexableTools.every((tool) => tool.engine === 'browser')).toBe(true);
    expect(tools.filter((tool) => tool.engine === 'planned').some((tool) => publicIndexableTools.includes(tool))).toBe(false);
  });

  it('generates unique titles and canonical paths', () => {
    const records = publicIndexableTools.map(getToolSeo);
    expect(new Set(records.map((record) => record.title)).size).toBe(records.length);
    expect(new Set(records.map((record) => record.canonicalPath)).size).toBe(records.length);
    expect(records.every((record) => record.description.length >= 50)).toBe(true);
  });

  it('returns a bounded, indexable related-tool set', () => {
    for (const tool of publicIndexableTools) {
      expect(relatedToolsFor(tool).length).toBeLessThanOrEqual(5);
      expect(relatedToolsFor(tool).every((related) => related.engine === 'browser' && related.id !== tool.id)).toBe(true);
    }
  });
});
