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
const sampleDocument = (overrides: Partial<BusinessDocument> = {}): BusinessDocument => ({
  type: 'invoice',
  number: 'INV-1001',
  issueDate: '2026-09-04',
  dueDate: '2026-09-18',
  currency: 'AED',
  template: 'modern',
  business: { name: 'Acme Studio', address: 'Dubai', email: 'hello@example.com', phone: '123', taxId: 'TRN1' },
  customer: { name: 'Sample Client', company: 'Client Co', address: 'Abu Dhabi', email: '', phone: '' },
  items: [item],
  notes: 'Thank you',
  terms: 'Pay within 14 days',
  ...overrides,
});

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
    expect(documentFilename({ type: 'quotation', number: 'QT/2026 8' } as BusinessDocument)).toBe(
      'quotation-qt-2026-8.pdf',
    );
  });
  it('matches launch sample totals for invoices and quotations', () => {
    expect(calculateTotals([{ ...item, quantity: 1, rate: 1250, discount: 0, tax: 5 }]).total).toBe(1312.5);
    expect(calculateTotals([{ ...item, quantity: 1, rate: 500, discount: 0, tax: 0 }]).total).toBe(500);
  });
  it.each(['classic', 'minimal', 'modern'] as const)(
    'renders the %s template with document metadata',
    async (template) => {
      const parsed = await PDFDocument.load(
        await (await renderBusinessPdf(sampleDocument({ template }))).arrayBuffer(),
      );
      expect(parsed.getTitle()).toBe('Invoice INV-1001');
      expect(parsed.getSubject()).toBe(`${template} invoice`);
    },
  );
  it('embeds a PNG logo and uses quotation terminology', async () => {
    const logo = new File(
      [
        Uint8Array.from(
          atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nNwAAAAASUVORK5CYII='),
          (value) => value.charCodeAt(0),
        ),
      ],
      'logo.png',
      { type: 'image/png' },
    );
    const parsed = await PDFDocument.load(
      await (await renderBusinessPdf(sampleDocument({ type: 'quotation', number: 'QT-1001', logo }))).arrayBuffer(),
    );
    expect(parsed.getTitle()).toBe('Quotation QT-1001');
    expect(parsed.getSubject()).toBe('modern quotation');
  });
  it('creates a loadable, multipage PDF for a long document', async () => {
    const document = sampleDocument({
      items: Array.from({ length: 45 }, (_, index) => ({
        ...item,
        id: String(index),
        description: `Service ${index + 1} with a deliberately detailed description that verifies safe row wrapping`,
      })),
      notes: 'Thank you for your business. '.repeat(15),
      terms: 'Payment is due according to the date above. '.repeat(15),
    });
    const blob = await renderBusinessPdf(document);
    const bytes = await blob.arrayBuffer();
    const parsed = await PDFDocument.load(bytes);

    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(parsed.getPageCount()).toBeGreaterThan(1);
  });
});
