import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { extractApple } from '../app/lib/phones/ingestion/apple';
import { extractGoogle } from '../app/lib/phones/ingestion/google';
import { extractSamsung } from '../app/lib/phones/ingestion/samsung';
import { ModelScopeError } from '../app/lib/phones/ingestion/scoping';
import { IngestionBlockedError, preflightAndFetch, sourceHash, summarizeChanges } from './phone-ingestion-core.mjs';
const fixture = (name: string) =>
  readFileSync(new URL(`../test-fixtures/phones/${name}.html`, import.meta.url), 'utf8');
describe('model scoping', () => {
  it('prevents Samsung wrong-column bleed', () => {
    const html = fixture('samsung');
    expect(extractSamsung(html, { model: 'galaxy-s26' }).fields['battery.capacityMah']).toBe(4300);
    expect(extractSamsung(html, { model: 'galaxy-s26-ultra' }).fields['battery.capacityMah']).toBe(5000);
    expect(() => extractSamsung(html)).toThrow(ModelScopeError);
  });
  it('isolates Google variants', () => {
    const html = fixture('google');
    expect(extractGoogle(html, { model: 'pixel-10-pro' }).fields['battery.capacityMah']).toBe(4870);
    expect(extractGoogle(html, { model: 'pixel-10-pro-xl' }).fields['battery.capacityMah']).toBe(5200);
  });
  it('leaves unpublished Apple RAM and mAh absent', () => {
    const facts = extractApple(fixture('apple'), { model: 'iPhone 17' });
    expect(facts.fields['memory.ramGb']).toBeUndefined();
    expect(facts.fields['battery.capacityMah']).toBeUndefined();
  });
});
const response = (status: number, body = '', type = 'text/html') =>
  new Response(body, { status, headers: { 'content-type': type } });
describe('safe ingestion', () => {
  it.each([403, 429])('stops on %s', async (status) => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(200, 'User-agent: *\nAllow: /', 'text/plain'))
      .mockResolvedValueOnce(response(status));
    await expect(preflightAndFetch('https://example.com/product', { fetchImpl, retries: 0 })).rejects.toBeInstanceOf(
      IngestionBlockedError,
    );
  });
  it('rejects invalid content type', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(200, 'User-agent: *\nAllow: /', 'text/plain'))
      .mockResolvedValueOnce(response(200, '{}', 'application/json'));
    await expect(preflightAndFetch('https://example.com/product', { fetchImpl })).rejects.toThrow(
      'Unsupported content type',
    );
  });
  it('surfaces timeout', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(200, 'User-agent: *\nAllow: /', 'text/plain'))
      .mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'));
    await expect(preflightAndFetch('https://example.com/product', { fetchImpl, retries: 0 })).rejects.toThrow(
      'Timed out',
    );
  });
  it('keeps whitespace-only source hashes unchanged', () =>
    expect(sourceHash('<p>A</p>')).toBe(sourceHash(' <p>A</p> ')));
  it('reports normalized changes', () =>
    expect(summarizeChanges({ display: { hz: 120 } }, { display: { hz: 144 } })).toEqual([
      { field: 'display.hz', previousValue: 120, newValue: 144, reviewStatus: 'pending' },
    ]));
});
