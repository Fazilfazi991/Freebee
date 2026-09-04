export type PdfImageOptions = {
  pageSize: 'fit' | 'a4' | 'letter';
  margin: 0 | 24 | 48;
  orientation: 'auto' | 'portrait' | 'landscape';
};

const loadPdfLib = () => import('pdf-lib');

export async function imagesToPdf(files: File[], options: PdfImageOptions) {
  const { PDFDocument: pdfDocument } = await loadPdfLib();
  const document = await pdfDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const image = file.type === 'image/png' ? await document.embedPng(bytes) : await document.embedJpg(bytes);
    let width = image.width + options.margin * 2;
    let height = image.height + options.margin * 2;

    if (options.pageSize === 'a4') {
      [width, height] = [595.28, 841.89];
    }

    if (options.pageSize === 'letter') {
      [width, height] = [612, 792];
    }

    if (options.orientation === 'landscape' || (options.orientation === 'auto' && image.width > image.height)) {
      [width, height] = [Math.max(width, height), Math.min(width, height)];
    }

    const page = document.addPage([width, height]);
    const scale = Math.min((width - options.margin * 2) / image.width, (height - options.margin * 2) / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    page.drawImage(image, {
      x: (width - drawWidth) / 2,
      y: (height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return new Blob([await document.save()], { type: 'application/pdf' });
}

export async function mergePdfs(files: File[]) {
  const { PDFDocument: pdfDocument } = await loadPdfLib();
  const output = await pdfDocument.create();

  for (const file of files) {
    const source = await pdfDocument.load(await file.arrayBuffer());
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }

  return new Blob([await output.save()], { type: 'application/pdf' });
}

export async function getPdfPageCount(file: File) {
  const { PDFDocument: pdfDocument } = await loadPdfLib();
  return (await pdfDocument.load(await file.arrayBuffer())).getPageCount();
}

export async function extractPdfPages(file: File, pageIndices: number[]) {
  const { PDFDocument: pdfDocument } = await loadPdfLib();
  const source = await pdfDocument.load(await file.arrayBuffer());
  const output = await pdfDocument.create();
  (await output.copyPages(source, pageIndices)).forEach((page) => output.addPage(page));

  return new Blob([await output.save()], { type: 'application/pdf' });
}

export async function splitEveryPage(file: File) {
  const count = await getPdfPageCount(file);
  return Promise.all(Array.from({ length: count }, (_, index) => extractPdfPages(file, [index])));
}

export async function zipPdfPages(files: Blob[]) {
  const { default: jsZip } = await import('jszip');
  const archive = new jsZip();
  files.forEach((file, index) => archive.file(`page-${index + 1}.pdf`, file));

  return archive.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export type PageOperation = { sourceIndex: number; rotation: number };
export async function organizePdf(file: File, operations: PageOperation[]) {
  const { PDFDocument: pdfDocument, degrees } = await loadPdfLib();
  const source = await pdfDocument.load(await file.arrayBuffer());
  const output = await pdfDocument.create();
  const pages = await output.copyPages(
    source,
    operations.map((item) => item.sourceIndex),
  );
  pages.forEach((page, index) => {
    page.setRotation(degrees(operations[index].rotation));
    output.addPage(page);
  });

  return new Blob([await output.save()], { type: 'application/pdf' });
}

export async function rotatePdfPages(file: File, pageIndices: number[], rotation: 90 | 180 | 270) {
  const { PDFDocument: pdfDocument, degrees } = await loadPdfLib();
  const document = await pdfDocument.load(await file.arrayBuffer());
  const selected = new Set(pageIndices);
  document.getPages().forEach((page, index) => {
    if (selected.has(index)) {
      page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
    }
  });

  return new Blob([await document.save()], { type: 'application/pdf' });
}

export async function removePdfPages(file: File, pageIndices: number[]) {
  const { PDFDocument: pdfDocument } = await loadPdfLib();
  const document = await pdfDocument.load(await file.arrayBuffer());
  [...pageIndices].sort((a, b) => b - a).forEach((index) => document.removePage(index));

  if (!document.getPageCount()) {
    throw new Error('Keep at least one page in the PDF.');
  }

  return new Blob([await document.save()], { type: 'application/pdf' });
}

export async function addPdfPageNumbers(
  file: File,
  options: { position: 'left' | 'center' | 'right'; start: number; prefix: string },
) {
  const { PDFDocument: pdfDocument, StandardFonts: standardFonts, rgb } = await loadPdfLib();
  const document = await pdfDocument.load(await file.arrayBuffer());
  const font = await document.embedFont(standardFonts.Helvetica);
  document.getPages().forEach((page, index) => {
    const text = `${options.prefix}${options.start + index}`;
    const size = 11;
    const width = font.widthOfTextAtSize(text, size);
    const x =
      options.position === 'left'
        ? 24
        : options.position === 'right'
          ? page.getWidth() - width - 24
          : (page.getWidth() - width) / 2;
    page.drawText(text, { x, y: 18, size, font, color: rgb(0.2, 0.2, 0.2) });
  });

  return new Blob([await document.save()], { type: 'application/pdf' });
}
