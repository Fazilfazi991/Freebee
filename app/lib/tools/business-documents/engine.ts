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
  const palette = {
    classic: { accent: rgb(0.06, 0.4, 0.36), dark: rgb(0.09, 0.14, 0.2), soft: rgb(0.94, 0.97, 0.96) },
    minimal: { accent: rgb(0.2, 0.25, 0.31), dark: rgb(0.12, 0.14, 0.17), soft: rgb(0.97, 0.97, 0.97) },
    modern: { accent: rgb(0.18, 0.32, 0.62), dark: rgb(0.08, 0.13, 0.24), soft: rgb(0.93, 0.95, 0.99) },
  }[document.template];
  const totals = calculateTotals(document.items);
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 42;
  const right = 553;
  const safe = (value = '') => value.replace(/[^ -~ -ÿ]/g, '-');
  const wrap = (value: string, maxWidth: number, size: number, strong = false) => {
    const target = strong ? bold : font;
    const lines: string[] = [];

    for (const paragraph of safe(value).split(/\r?\n/)) {
      const words = paragraph.split(/\s+/).filter(Boolean);

      if (!words.length) {
        lines.push('');
        continue;
      }

      let line = '';

      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;

        if (target.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
          line = candidate;
        } else {
          lines.push(line);
          line = word;
        }
      }
      lines.push(line);
    }

    return lines;
  };
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = 790;
  const drawText = (value: string, x: number, atY = y, size = 9, strong = false, color = palette.dark) =>
    page.drawText(safe(value), { x, y: atY, size, font: strong ? bold : font, color });
  const drawRight = (value: string, x: number, atY = y, size = 9, strong = false, color = palette.dark) => {
    const chosen = strong ? bold : font;
    drawText(value, x - chosen.widthOfTextAtSize(safe(value), size), atY, size, strong, color);
  };
  const drawLines = (value: string, x: number, maxWidth: number, size = 9, strong = false, leading = 12) => {
    const lines = wrap(value, maxWidth, size, strong);
    lines.forEach((line, index) => drawText(line, x, y - index * leading, size, strong));
    y -= Math.max(1, lines.length) * leading;
  };
  const drawPageMarker = () => {
    if (document.template === 'modern') {
      page.drawRectangle({ x: 0, y: 0, width: 14, height: pageHeight, color: palette.accent });
    } else if (document.template === 'classic') {
      page.drawRectangle({ x: 0, y: 824, width: pageWidth, height: 18, color: palette.accent });
    }
  };
  const drawTableHeader = () => {
    if (document.template !== 'minimal') {
      page.drawRectangle({ x: left, y: y - 7, width: right - left, height: 24, color: palette.accent });
    } else {
      page.drawLine({
        start: { x: left, y: y + 14 },
        end: { x: right, y: y + 14 },
        thickness: 1,
        color: palette.accent,
      });
      page.drawLine({ start: { x: left, y: y - 7 }, end: { x: right, y: y - 7 }, thickness: 1, color: palette.accent });
    }

    const color = document.template === 'minimal' ? palette.dark : rgb(1, 1, 1);
    drawText('ITEM / DESCRIPTION', left + 7, y, 7, true, color);
    drawRight('QTY', 332, y, 7, true, color);
    drawRight('RATE', 394, y, 7, true, color);
    drawRight('TAX', 435, y, 7, true, color);
    drawRight('DISC.', 481, y, 7, true, color);
    drawRight('AMOUNT', right - 7, y, 7, true, color);
    y -= 22;
  };
  const newPage = (withTable = false) => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = 790;
    drawPageMarker();

    if (withTable) {
      drawTableHeader();
    }
  };
  drawPageMarker();

  if (document.logo) {
    const bytes = await document.logo.arrayBuffer();
    const logo = document.logo.type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const fitted = logo.scaleToFit(105, 54);
    page.drawImage(logo, { x: left, y: 742, width: fitted.width, height: fitted.height });
  }

  drawRight(document.type.toUpperCase(), right, 775, 25, true, palette.accent);
  drawRight(`# ${document.number || 'DRAFT'}`, right, 754, 9, true);
  y = 700;
  drawText('FROM', left, y, 7, true, palette.accent);
  drawText(document.type === 'invoice' ? 'BILL TO' : 'PREPARED FOR', 310, y, 7, true, palette.accent);
  y -= 18;

  const partyLines = (party: BusinessDocument['business'] | BusinessDocument['customer'], isBusiness = false) =>
    [
      party.name || (isBusiness ? 'Your business' : 'Client'),
      'company' in party ? party.company : '',
      party.address,
      [party.email, party.phone].filter(Boolean).join(' | '),
      isBusiness && 'taxId' in party && party.taxId ? `Tax / VAT: ${party.taxId}` : '',
    ].filter(Boolean) as string[];
  const from = partyLines(document.business, true);
  const to = partyLines(document.customer);
  const partyStart = y;
  from.forEach((line, index) => drawText(line, left, partyStart - index * 14, index === 0 ? 11 : 8, index === 0));
  to.forEach((line, index) => drawText(line, 310, partyStart - index * 14, index === 0 ? 11 : 8, index === 0));
  y = partyStart - Math.max(from.length, to.length) * 14 - 20;
  page.drawRectangle({ x: left, y: y - 7, width: right - left, height: 38, color: palette.soft });
  drawText('ISSUE DATE', left + 12, y + 14, 6, true, palette.accent);
  drawText(document.issueDate || '-', left + 12, y, 9, true);

  const dateLabel = document.type === 'invoice' ? 'DUE DATE' : 'VALID UNTIL';
  drawText(dateLabel, 310, y + 14, 6, true, palette.accent);
  drawText(document.dueDate || '-', 310, y, 9, true);
  y -= 45;
  drawTableHeader();

  for (const item of document.items) {
    const line = lineTotal(item);
    const description = wrap(item.description || 'Item', 245, 8.5);
    const rowHeight = Math.max(25, description.length * 11 + 10);

    if (y - rowHeight < 78) {
      newPage(true);
    }

    description.forEach((part, index) => drawText(part, left + 7, y - index * 11, 8.5));
    drawRight(String(item.quantity), 332, y, 8);
    drawRight(formatCurrency(item.rate, document.currency), 394, y, 8);
    drawRight(`${item.tax}%`, 435, y, 8);
    drawRight(`${item.discount}%`, 481, y, 8);
    drawRight(formatCurrency(line.total, document.currency), right - 7, y, 8, true);
    page.drawLine({
      start: { x: left, y: y - rowHeight + 8 },
      end: { x: right, y: y - rowHeight + 8 },
      thickness: 0.5,
      color: rgb(0.86, 0.88, 0.9),
    });
    y -= rowHeight;
  }

  const notesLines = wrap(document.notes, 265, 8);
  const termsLines = wrap(document.terms, 265, 8);
  const closingHeight = 118 + Math.max(0, notesLines.length - 1) * 11 + Math.max(0, termsLines.length - 1) * 11;

  if (y - closingHeight < 55) {
    newPage();
  }

  y -= 12;

  const totalsX = 365;

  for (const [name, value] of [
    ['Subtotal', totals.subtotal],
    ['Discount', -totals.discount],
    ['Tax', totals.tax],
    ['Total', totals.total],
  ] as const) {
    if (name === 'Total') {
      page.drawRectangle({ x: totalsX - 10, y: y - 8, width: right - totalsX + 10, height: 27, color: palette.accent });
    }

    const color = name === 'Total' ? rgb(1, 1, 1) : palette.dark;
    drawText(name, totalsX, y, name === 'Total' ? 10 : 8.5, name === 'Total', color);
    drawRight(formatCurrency(value, document.currency), right - 8, y, name === 'Total' ? 10 : 8.5, true, color);
    y -= name === 'Total' ? 31 : 19;
  }
  y -= 8;

  if (document.notes) {
    drawText('NOTES', left, y, 7, true, palette.accent);
    y -= 14;
    drawLines(document.notes, left, 265, 8, false, 11);
    y -= 10;
  }

  if (document.terms) {
    drawText('TERMS', left, y, 7, true, palette.accent);
    y -= 14;
    drawLines(document.terms, left, 265, 8, false, 11);
  }

  pdf.setTitle(`${document.type === 'invoice' ? 'Invoice' : 'Quotation'} ${document.number}`);
  pdf.setSubject(`${document.template} ${document.type}`);

  return new Blob([await pdf.save()], { type: 'application/pdf' });
}
