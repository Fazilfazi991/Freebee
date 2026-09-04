import { Download, FileUp, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { downloadBlob } from '~/lib/tools/download';
import {
  addPdfPageNumbers,
  extractPdfPages,
  getPdfPageCount,
  removePdfPages,
  rotatePdfPages,
} from '~/lib/tools/pdf/engine';
import { parsePageRanges } from '~/lib/tools/pdf/ranges';
import { renderPdfPages, zipRenderedPages, type RenderedPdfPage } from '~/lib/tools/pdf/render';
import type { ToolDefinition } from '~/lib/tools/types';

export function AdvancedPdfTool({ tool }: { tool: ToolDefinition }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState('1');
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);
  const [scale, setScale] = useState(1.5);
  const [quality, setQuality] = useState(0.86);
  const [numberPosition, setNumberPosition] = useState<'left' | 'center' | 'right'>('center');
  const [numberStart, setNumberStart] = useState(1);
  const [numberPrefix, setNumberPrefix] = useState('');
  const [result, setResult] = useState<Blob | null>(null);
  const [rendered, setRendered] = useState<RenderedPdfPage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isImageExport = tool.slug === 'pdf-to-jpg' || tool.slug === 'pdf-to-png';

  useEffect(() => () => rendered.forEach((page) => URL.revokeObjectURL(page.url)), [rendered]);

  const reset = () => {
    rendered.forEach((page) => URL.revokeObjectURL(page.url));
    setFile(null);
    setPageCount(0);
    setRange('1');
    setResult(null);
    setRendered([]);
    setError('');

    if (input.current) {
      input.current.value = '';
    }
  };
  const choose = async (selected?: File) => {
    reset();

    if (!selected) {
      return;
    }

    try {
      const count = await getPdfPageCount(selected);
      setFile(selected);
      setPageCount(count);
      setRange(`1-${count}`);
    } catch {
      setError('This PDF could not be read. It may be encrypted or damaged.');
    }
  };
  const process = async () => {
    if (!file) {
      return;
    }

    setBusy(true);
    setError('');
    setResult(null);
    rendered.forEach((page) => URL.revokeObjectURL(page.url));
    setRendered([]);

    try {
      const pages = parsePageRanges(range, pageCount);

      if (isImageExport) {
        const format = tool.slug === 'pdf-to-jpg' ? 'image/jpeg' : 'image/png';
        setRendered(await renderPdfPages(file, pages, { format, scale, quality }));
      } else if (tool.slug === 'rotate-pdf') {
        setResult(await rotatePdfPages(file, pages, rotation));
      } else if (tool.slug === 'remove-pdf-pages') {
        setResult(await removePdfPages(file, pages));
      } else if (tool.slug === 'add-page-numbers-to-pdf') {
        setResult(
          await addPdfPageNumbers(file, { position: numberPosition, start: numberStart, prefix: numberPrefix }),
        );
      } else {
        setResult(await extractPdfPages(file, pages));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Processing failed.');
    } finally {
      setBusy(false);
    }
  };
  const pdfFilename =
    tool.slug === 'rotate-pdf'
      ? 'rotated.pdf'
      : tool.slug === 'remove-pdf-pages'
        ? 'pages-removed.pdf'
        : tool.slug === 'add-page-numbers-to-pdf'
          ? 'numbered.pdf'
          : 'extracted-pages.pdf';

  return (
    <div className="tp-engine">
      <input
        ref={input}
        className="tp-hidden-input"
        type="file"
        accept=".pdf,application/pdf"
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      {!file ? (
        <div className="tp-upload">
          <FileUp size={26} />
          <h2>Choose a PDF</h2>
          <p>Select a readable PDF up to 25 MB.</p>
          <button className="tp-primary" onClick={() => input.current?.click()}>
            Choose PDF
          </button>
        </div>
      ) : (
        <>
          <div className="tp-file-summary">
            <strong>{file.name}</strong>
            <span>{pageCount} pages</span>
            <button onClick={reset}>
              <RotateCcw size={17} />
              Reset
            </button>
          </div>
          <div className="tp-settings">
            <label>
              Pages
              <input value={range} onChange={(event) => setRange(event.target.value)} placeholder="1-3,7" />
            </label>
            {tool.slug === 'rotate-pdf' && (
              <label>
                Rotation
                <select
                  value={rotation}
                  onChange={(event) => setRotation(Number(event.target.value) as 90 | 180 | 270)}
                >
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="270">270°</option>
                </select>
              </label>
            )}
            {isImageExport && (
              <>
                <label>
                  Scale
                  <select value={scale} onChange={(event) => setScale(Number(event.target.value))}>
                    <option value="1">Standard</option>
                    <option value="1.5">High</option>
                    <option value="2">Extra high</option>
                  </select>
                </label>
                {tool.slug === 'pdf-to-jpg' && (
                  <label>
                    Quality <span>{Math.round(quality * 100)}%</span>
                    <input
                      type="range"
                      min=".4"
                      max="1"
                      step=".02"
                      value={quality}
                      onChange={(event) => setQuality(Number(event.target.value))}
                    />
                  </label>
                )}
              </>
            )}
            {tool.slug === 'add-page-numbers-to-pdf' && (
              <>
                <label>
                  Position
                  <select
                    value={numberPosition}
                    onChange={(event) => setNumberPosition(event.target.value as typeof numberPosition)}
                  >
                    <option value="left">Bottom left</option>
                    <option value="center">Bottom center</option>
                    <option value="right">Bottom right</option>
                  </select>
                </label>
                <label>
                  Start at
                  <input
                    type="number"
                    min="0"
                    value={numberStart}
                    onChange={(event) => setNumberStart(Number(event.target.value))}
                  />
                </label>
                <label>
                  Prefix
                  <input
                    value={numberPrefix}
                    onChange={(event) => setNumberPrefix(event.target.value)}
                    placeholder="Page "
                  />
                </label>
              </>
            )}
          </div>
          <div className="tp-engine-actions">
            <button className="tp-primary" onClick={process} disabled={busy}>
              {busy ? 'Processing…' : isImageExport ? 'Render pages' : 'Create PDF'}
            </button>
            {result && (
              <button className="tp-download" onClick={() => downloadBlob(result, pdfFilename)}>
                <Download size={18} />
                Download PDF
              </button>
            )}
          </div>
          {rendered.length > 0 && (
            <>
              <div className="tp-pdf-image-grid">
                {rendered.map((page) => (
                  <article key={page.pageNumber}>
                    <img src={page.url} alt={`Page ${page.pageNumber}`} />
                    <strong>Page {page.pageNumber}</strong>
                    <button
                      onClick={() =>
                        downloadBlob(
                          page.blob,
                          `page-${String(page.pageNumber).padStart(3, '0')}.${tool.slug === 'pdf-to-jpg' ? 'jpg' : 'png'}`,
                        )
                      }
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </article>
                ))}
              </div>
              <button
                className="tp-download"
                onClick={async () =>
                  downloadBlob(
                    await zipRenderedPages(rendered, tool.slug === 'pdf-to-jpg' ? 'jpg' : 'png'),
                    `${tool.slug}-pages.zip`,
                  )
                }
              >
                <Download size={18} />
                Download all as ZIP
              </button>
            </>
          )}
        </>
      )}
      {error && (
        <p className="tp-error" role="alert">
          <strong>Couldn’t process this PDF.</strong> {error}
        </p>
      )}
      <p className="tp-local-note">Your PDF stays in this browser session.</p>
    </div>
  );
}
