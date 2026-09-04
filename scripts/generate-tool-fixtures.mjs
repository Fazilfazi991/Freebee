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

function createWaveFixture() {
  const sampleRate = 8000;
  const sampleCount = 800;
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    buffer.writeInt16LE(Math.round(Math.sin((index / sampleRate) * Math.PI * 2 * 440) * 6000), 44 + index * 2);
  }
  return buffer;
}

await writeFile(new URL('tone.wav', outputDirectory), createWaveFixture());
