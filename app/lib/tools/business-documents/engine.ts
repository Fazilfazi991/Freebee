export type Currency = 'AED' | 'USD' | 'EUR' | 'GBP' | 'INR' | 'SAR' | 'QAR' | 'OMR' | 'KWD' | 'BHD';
export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  tax: number;
  discount: number;
};
export type BusinessDocument = {
  type: 'invoice' | 'quotation';
  number: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  template: 'classic' | 'minimal' | 'modern';
  business: { name: string; address: string; email: string; phone: string; taxId: string };
  customer: { name: string; company: string; address: string; email: string; phone: string };
  items: LineItem[];
  notes: string;
  terms: string;
  logo?: File;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function lineTotal(item: LineItem) {
  const base = item.quantity * item.rate;
  const discount = (base * item.discount) / 100;
  const tax = ((base - discount) * item.tax) / 100;

  return { base: money(base), discount: money(discount), tax: money(tax), total: money(base - discount + tax) };
}
export function calculateTotals(items: LineItem[]) {
  return items.reduce(
    (sum, item) => {
      const line = lineTotal(item);
      return {
        subtotal: money(sum.subtotal + line.base),
        discount: money(sum.discount + line.discount),
        tax: money(sum.tax + line.tax),
        total: money(sum.total + line.total),
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );
}
export const formatCurrency = (value: number, currency: Currency) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(value);
export const documentFilename = (document: BusinessDocument) =>
  `${document.type}-${document.number || 'draft'}.pdf`.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();

export async function renderBusinessPdf(document: BusinessDocument) {
  const { PDFDocument: pdfDocument, StandardFonts: standardFonts, rgb } = await import('pdf-lib');
  const pdf = await pdfDocument.create();
  const font = await pdf.embedFont(standardFonts.Helvetica);
  const bold = await pdf.embedFont(standardFonts.HelveticaBold);
  const accent =
    document.template === 'modern'
      ? rgb(0.12, 0.29, 0.55)
      : document.template === 'minimal'
        ? rgb(0.2, 0.2, 0.2)
        : rgb(0.1, 0.45, 0.4);
  const totals = calculateTotals(document.items);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  const text = (value: string, x: number, size = 10, strong = false) => {
    page.drawText(value.slice(0, 90), { x, y, size, font: strong ? bold : font, color: rgb(0.12, 0.14, 0.18) });
  };
  const newPage = () => {
    page = pdf.addPage([595, 842]);
    y = 790;
  };
  page.drawRectangle({ x: 0, y: 812, width: 595, height: 30, color: accent });

  if (document.logo) {
    const bytes = await document.logo.arrayBuffer();
    const logo = document.logo.type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const fitted = logo.scaleToFit(90, 50);
    page.drawImage(logo, { x: 455, y: 750, width: fitted.width, height: fitted.height });
  }

  text(document.type.toUpperCase(), 42, 22, true);
  y -= 34;
  text(document.business.name || 'Your business', 42, 14, true);
  y -= 18;
  text(document.business.address, 42);
  y -= 14;
  text([document.business.email, document.business.phone].filter(Boolean).join(' • '), 42);
  y -= 30;
  text(`${document.type === 'invoice' ? 'Invoice' : 'Quotation'} #: ${document.number}`, 360, 10, true);
  y -= 15;
  text(`Issue: ${document.issueDate}`, 360);
  y -= 15;
  text(`${document.type === 'invoice' ? 'Due' : 'Valid until'}: ${document.dueDate}`, 360);
  y -= 25;
  text('Bill to', 42, 11, true);
  y -= 16;
  text([document.customer.name, document.customer.company].filter(Boolean).join(' — '), 42);
  y -= 15;
  text(document.customer.address, 42);
  y -= 28;
  text('Description', 42, 10, true);
  text('Qty', 330, 10, true);
  text('Rate', 375, 10, true);
  text('Tax', 445, 10, true);
  text('Total', 500, 10, true);
  y -= 16;

  for (const item of document.items) {
    if (y < 110) {
      newPage();
    }

    const line = lineTotal(item);
    text(item.description || 'Item', 42);
    text(String(item.quantity), 330);
    text(formatCurrency(item.rate, document.currency), 375);
    text(`${item.tax}%`, 445);
    text(formatCurrency(line.total, document.currency), 500);
    y -= 18;
  }

  if (y < 150) {
    newPage();
  }

  y -= 14;

  for (const [label, value] of [
    ['Subtotal', totals.subtotal],
    ['Discount', -totals.discount],
    ['Tax', totals.tax],
    ['Grand total', totals.total],
  ] as const) {
    text(label, 375, label === 'Grand total' ? 12 : 10, label === 'Grand total');
    text(formatCurrency(value, document.currency), 470, label === 'Grand total' ? 12 : 10, label === 'Grand total');
    y -= 18;
  }
  y -= 14;
  text('Notes', 42, 10, true);
  y -= 15;
  text(document.notes, 42);
  y -= 24;
  text('Terms', 42, 10, true);
  y -= 15;
  text(document.terms, 42);
  pdf.setTitle(`${document.type} ${document.number}`);

  return new Blob([await pdf.save()], { type: 'application/pdf' });
}
