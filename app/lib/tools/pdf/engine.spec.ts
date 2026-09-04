import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { addPdfPageNumbers, extractPdfPages, removePdfPages, rotatePdfPages } from './engine';

async function samplePdf() {
  const document = await PDFDocument.create();
  document.addPage([200, 300]);
  document.addPage([210, 310]);
  document.addPage([220, 320]);

  return new File([await document.save()], 'sample.pdf', { type: 'application/pdf' });
}

async function load(blob: Blob) {
  return PDFDocument.load(await blob.arrayBuffer());
}

describe('advanced PDF operations', () => {
  it('extracts selected pages in requested order', async () => {
    const result = await load(await extractPdfPages(await samplePdf(), [2, 0]));
    expect(result.getPages().map((page) => page.getWidth())).toEqual([220, 200]);
  });

  it('rotates selected pages while preserving the others', async () => {
    const result = await load(await rotatePdfPages(await samplePdf(), [1], 90));
    expect(result.getPages().map((page) => page.getRotation().angle)).toEqual([0, 90, 0]);
  });

  it('removes selected pages and rejects removing every page', async () => {
    expect((await load(await removePdfPages(await samplePdf(), [1]))).getPageCount()).toBe(2);
    await expect(removePdfPages(await samplePdf(), [0, 1, 2])).rejects.toThrow('Keep at least one page');
  });

  it('adds page-number content without changing page count', async () => {
    const result = await load(
      await addPdfPageNumbers(await samplePdf(), { position: 'center', start: 4, prefix: 'Page ' }),
    );
    expect(result.getPageCount()).toBe(3);
    expect((await result.save()).byteLength).toBeGreaterThan((await (await samplePdf()).arrayBuffer()).byteLength);
  });
});
