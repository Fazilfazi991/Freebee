import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  calculateTotals,
  documentFilename,
  formatCurrency,
  lineTotal,
  renderBusinessPdf,
  type BusinessDocument,
} from './engine';

const item = { id: '1', description: 'Work', quantity: 2, rate: 100, tax: 5, discount: 10 };
describe('business documents', () => {
  it('calculates quantity, discount and tax precisely', () =>
    expect(lineTotal(item)).toEqual({ base: 200, discount: 20, tax: 9, total: 189 }));
  it('totals multiple and zero lines', () =>
    expect(calculateTotals([item, { ...item, id: '2', quantity: 0 }])).toEqual({
      subtotal: 200,
      discount: 20,
      tax: 9,
      total: 189,
    }));
  it('formats supported currencies and filenames', () => {
    expect(formatCurrency(12.5, 'AED')).toContain('12.50');
    expect(documentFilename({ type: 'invoice', number: 'INV 1001' } as BusinessDocument)).toBe('invoice-inv-1001.pdf');
  });
  it('creates a loadable, multipage PDF for a long document', async () => {
    const document: BusinessDocument = {
      type: 'invoice',
      number: 'INV-1001',
      issueDate: '2026-09-04',
      dueDate: '2026-09-18',
      currency: 'AED',
      template: 'modern',
      business: { name: 'Acme Studio', address: 'Dubai', email: 'hello@example.com', phone: '123', taxId: 'TRN1' },
      customer: { name: 'Sample Client', company: 'Client Co', address: 'Abu Dhabi', email: '', phone: '' },
      items: Array.from({ length: 45 }, (_, index) => ({
        ...item,
        id: String(index),
        description: `Service ${index + 1}`,
      })),
      notes: 'Thank you',
      terms: 'Pay within 14 days',
    };
    const blob = await renderBusinessPdf(document);
    const bytes = await blob.arrayBuffer();
    const parsed = await PDFDocument.load(bytes);

    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(parsed.getPageCount()).toBeGreaterThan(1);
  });
});
