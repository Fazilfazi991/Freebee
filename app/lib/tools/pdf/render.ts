export type PdfImageFormat = 'image/jpeg' | 'image/png';

export type RenderedPdfPage = {
  pageNumber: number;
  blob: Blob;
  url: string;
};

async function loadPdfJs() {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);

  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  return pdfjs;
}

export async function renderPdfPage(file: File, pageNumber: number, scale: number) {
  const pdfjs = await loadPdfJs();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdfDocument = await loadingTask.promise;

  try {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas rendering is unavailable in this browser.');
    }

    await page.render({ canvas, canvasContext: context, viewport }).promise;
    page.cleanup();

    return canvas;
  } finally {
    await pdfDocument.destroy();
  }
}

export async function renderPdfPages(
  file: File,
  pageIndices: number[],
  options: { format: PdfImageFormat; scale: number; quality: number },
): Promise<RenderedPdfPage[]> {
  const pdfjs = await loadPdfJs();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdfDocument = await loadingTask.promise;
  const results: RenderedPdfPage[] = [];

  try {
    for (const pageIndex of pageIndices) {
      const page = await pdfDocument.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: options.scale });
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas rendering is unavailable in this browser.');
      }

      await page.render({ canvas, canvasContext: context, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, options.format, options.format === 'image/jpeg' ? options.quality : undefined),
      );
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;

      if (!blob) {
        throw new Error('The browser could not encode a rendered PDF page.');
      }

      results.push({ pageNumber: pageIndex + 1, blob, url: URL.createObjectURL(blob) });
    }
  } finally {
    await pdfDocument.destroy();
  }

  return results;
}

export async function zipRenderedPages(pages: RenderedPdfPage[], extension: 'jpg' | 'png') {
  const { default: jsZip } = await import('jszip');
  const archive = new jsZip();
  pages.forEach((page) => archive.file(`page-${String(page.pageNumber).padStart(3, '0')}.${extension}`, page.blob));

  return archive.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
