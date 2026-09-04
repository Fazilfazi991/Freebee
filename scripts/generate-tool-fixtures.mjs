import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument, rgb } from 'pdf-lib';

const outputDirectory = new URL('../test-fixtures/tools/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });

const fixtures = {
  'invalid.txt': 'bm90IGEgc3VwcG9ydGVkIGZpbGU=',
};

for (const [name, base64] of Object.entries(fixtures)) {
  await writeFile(new URL(name, outputDirectory), Buffer.from(base64, 'base64'));
}

async function createPdf(name, pageSizes) {
  const document = await PDFDocument.create();

  pageSizes.forEach(([width, height], index) => {
    const page = document.addPage([width, height]);
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb((index + 1) / 4, 0.25, 0.5) });
    page.drawText(`${name} page ${index + 1}`, { x: 20, y: height - 40, size: 18 });
  });

  await writeFile(new URL(name, outputDirectory), await document.save());
}

await createPdf('first.pdf', [
  [200, 300],
  [210, 310],
  [220, 320],
]);
await createPdf('second.pdf', [
  [230, 330],
  [240, 340],
]);
