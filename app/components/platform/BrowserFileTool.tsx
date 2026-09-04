import { ArrowDown, ArrowUp, Download, FileUp, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { track } from '~/lib/analytics';
import { downloadBlob } from '~/lib/tools/download';
import { extensionForFormat, transformImage, zipImages, type ImageFormat } from '~/lib/tools/image/engine';
import { validateFiles } from '~/lib/tools/limits';
import {
  extractPdfPages,
  getPdfPageCount,
  imagesToPdf,
  mergePdfs,
  organizePdf,
  splitEveryPage,
  zipPdfPages,
  type PageOperation,
  type PdfImageOptions,
} from '~/lib/tools/pdf/engine';
import { parsePageRanges } from '~/lib/tools/pdf/ranges';
import { renderPdfPages, type RenderedPdfPage } from '~/lib/tools/pdf/render';
import type { ToolPhase } from '~/lib/tools/state';
import type { ToolDefinition } from '~/lib/tools/types';

const formats: Record<string, ImageFormat> = {
  'jpg-to-png': 'image/png',
  'png-to-jpg': 'image/jpeg',
  'jpg-to-webp': 'image/webp',
  'webp-to-jpg': 'image/jpeg',
};
const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function BrowserFileTool({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<ToolPhase>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Blob | null>(null);
  const [batchResults, setBatchResults] = useState<{ name: string; blob: Blob }[]>([]);
  const [imageResult, setImageResult] = useState<{
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
  } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [quality, setQuality] = useState(0.82);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [scalePercent, setScalePercent] = useState<number | undefined>();
  const [lock, setLock] = useState(true);
  const [background, setBackground] = useState('#ffffff');
  const [pageSize, setPageSize] = useState<PdfImageOptions['pageSize']>('fit');
  const [margin, setMargin] = useState<PdfImageOptions['margin']>(24);
  const [orientation, setOrientation] = useState<PdfImageOptions['orientation']>('auto');
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState('1');
  const [splitMode, setSplitMode] = useState<'extract' | 'every'>('extract');
  const [pages, setPages] = useState<PageOperation[]>([]);
  const [thumbnails, setThumbnails] = useState<RenderedPdfPage[]>([]);
  const previews = useMemo(
    () => files.map((file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : '')),
    [files],
  );
  useEffect(() => () => previews.forEach((url) => url && URL.revokeObjectURL(url)), [previews]);
  useEffect(() => () => thumbnails.forEach((page) => URL.revokeObjectURL(page.url)), [thumbnails]);

  const choose = async (selected: File[]) => {
    setError('');
    setResult(null);
    setImageResult(null);
    setBatchResults([]);
    thumbnails.forEach((page) => URL.revokeObjectURL(page.url));
    setThumbnails([]);

    const limitError = validateFiles(selected);

    if (limitError) {
      setError(limitError);
      setPhase('error');

      return;
    }

    const accepted = selected.filter((file) =>
      tool.accept
        ?.split(',')
        .some((accept) =>
          accept.startsWith('.')
            ? file.name.toLowerCase().endsWith(accept)
            : accept.endsWith('/*')
              ? file.type.startsWith(accept.slice(0, -1))
              : file.type === accept,
        ),
    );

    if (accepted.length !== selected.length) {
      setError(`Choose only supported ${tool.accept} files.`);
      setPhase('error');

      return;
    }

    setFiles(accepted);
    setPhase(accepted.length ? 'ready' : 'idle');
    track('tool_upload', {
      tool: tool.slug,
      count: accepted.length,
      totalBytes: accepted.reduce((sum, file) => sum + file.size, 0),
    });

    if ((tool.slug === 'split-pdf' || tool.slug === 'organize-pdf') && accepted[0]) {
      try {
        const count = await getPdfPageCount(accepted[0]);
        setPageCount(count);
        setPages(Array.from({ length: count }, (_, sourceIndex) => ({ sourceIndex, rotation: 0 })));

        if (tool.slug === 'organize-pdf') {
          setThumbnails(
            await renderPdfPages(
              accepted[0],
              Array.from({ length: count }, (_, index) => index),
              { format: 'image/jpeg', scale: 0.25, quality: 0.72 },
            ),
          );
        }
      } catch {
        setError('This PDF could not be read. It may be encrypted or damaged.');
        setPhase('error');
      }
    }
  };
  const move = <T,>(items: T[], index: number, offset: number) => {
    const next = [...items];
    const target = index + offset;

    if (target < 0 || target >= next.length) {
      return next;
    }

    [next[index], next[target]] = [next[target], next[index]];

    return next;
  };
  const reset = () => {
    setFiles([]);
    setResult(null);
    setImageResult(null);
    setBatchResults([]);
    setError('');
    setPageCount(0);
    setPages([]);
    thumbnails.forEach((page) => URL.revokeObjectURL(page.url));
    setThumbnails([]);
    setPhase('idle');
  };
  const process = async () => {
    if (!files.length) {
      return;
    }

    setPhase('processing');
    setError('');
    track('tool_process_started', { tool: tool.slug, count: files.length });

    try {
      if (tool.slug === 'jpg-to-pdf') {
        setResult(await imagesToPdf(files, { pageSize, margin, orientation }));
      } else if (tool.slug === 'merge-pdf') {
        setResult(await mergePdfs(files));
      } else if (tool.slug === 'split-pdf') {
        if (splitMode === 'every') {
          const outputs = await splitEveryPage(files[0]);
          setResult(await zipPdfPages(outputs));
        } else {
          setResult(await extractPdfPages(files[0], parsePageRanges(range, pageCount)));
        }
      } else if (tool.slug === 'organize-pdf') {
        setResult(await organizePdf(files[0], pages));
      } else if (formats[tool.slug]) {
        const target = formats[tool.slug];
        const extension = extensionForFormat(target);
        const outputs = await Promise.all(
          files.map(async (file) => {
            const transformed = await transformImage(file, {
              format: target,
              quality,
              width: Number(width) || undefined,
              height: Number(height) || undefined,
              scalePercent,
              lockAspect: lock,
              background,
            });

            return { name: `${file.name.replace(/\.[^.]+$/, '')}.${extension}`, blob: transformed.blob };
          }),
        );
        setBatchResults(outputs);
        setResult(outputs[0].blob);
      } else {
        const target =
          formats[tool.slug] ||
          (files[0].type === 'image/png' ? 'image/png' : files[0].type === 'image/webp' ? 'image/webp' : 'image/jpeg');
        const transformed = await transformImage(files[0], {
          format: target,
          quality,
          width: Number(width) || undefined,
          height: Number(height) || undefined,
          scalePercent,
          lockAspect: lock,
          background,
        });
        setResult(transformed.blob);
        setImageResult(transformed);
      }

      setPhase('success');
      track('tool_process_completed', { tool: tool.slug });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Processing failed. Try another file.');
      setPhase('error');
      track('tool_error', { tool: tool.slug });
    }
  };
  const filename = () =>
    tool.slug === 'merge-pdf'
      ? 'merged.pdf'
      : tool.slug === 'jpg-to-pdf'
        ? 'converted-images.pdf'
        : tool.slug === 'split-pdf'
          ? splitMode === 'every'
            ? 'split-pages.zip'
            : 'split-pages.pdf'
          : tool.slug === 'organize-pdf'
            ? 'organized.pdf'
            : `${tool.slug.startsWith('resize') ? 'resized' : tool.slug.startsWith('compress') ? 'compressed' : 'converted'}-image.${extensionForFormat(formats[tool.slug] || (files[0]?.type as ImageFormat) || 'image/jpeg')}`;
  const isPdfList = tool.slug === 'merge-pdf';
  const isImagePdf = tool.slug === 'jpg-to-pdf';
  const isImage = tool.category === 'image';
  const isBatchImage = Boolean(formats[tool.slug]);

  return (
    <div className="tp-engine">
      <input
        className="tp-hidden-input"
        ref={input}
        type="file"
        accept={tool.accept}
        multiple={isPdfList || isImagePdf || isBatchImage}
        onChange={(event) => choose(Array.from(event.target.files || []))}
      />
      {!files.length ? (
        <div
          className="tp-upload"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void choose(Array.from(e.dataTransfer.files));
          }}
        >
          <span className="tp-upload-icon">
            <FileUp size={26} />
          </span>
          <h2>Choose {isPdfList || isImagePdf ? 'files' : 'a file'}</h2>
          <p>Drop {isPdfList || isImagePdf ? 'them' : 'it'} here or use the picker. Up to 20 files, 25 MB each.</p>
          <button className="tp-primary" onClick={() => input.current?.click()}>
            Choose {isPdfList || isImagePdf ? 'files' : 'file'}
          </button>
        </div>
      ) : (
        <>
          <div className="tp-file-summary">
            <strong>
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </strong>
            <span>{formatSize(files.reduce((sum, file) => sum + file.size, 0))}</span>
            <button onClick={reset}>
              <RotateCcw size={17} />
              Reset
            </button>
          </div>
          <div className={isImagePdf || isBatchImage ? 'tp-preview-grid' : 'tp-file-list'}>
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="tp-file-row">
                {previews[index] && <img src={previews[index]} alt="" />}
                <span>
                  <strong>{file.name}</strong>
                  <small>{formatSize(file.size)}</small>
                </span>
                <div>
                  <button aria-label="Move up" onClick={() => setFiles(move(files, index, -1))} disabled={index === 0}>
                    <ArrowUp size={16} />
                  </button>
                  <button
                    aria-label="Move down"
                    onClick={() => setFiles(move(files, index, 1))}
                    disabled={index === files.length - 1}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button aria-label="Remove" onClick={() => setFiles(files.filter((_, i) => i !== index))}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {isImagePdf && (
            <div className="tp-settings">
              <label>
                Page size
                <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PdfImageOptions['pageSize'])}>
                  <option value="fit">Fit to image</option>
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </label>
              <label>
                Orientation
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as PdfImageOptions['orientation'])}
                >
                  <option value="auto">Auto</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
              <label>
                Margin
                <select value={margin} onChange={(e) => setMargin(Number(e.target.value) as PdfImageOptions['margin'])}>
                  <option value="0">None</option>
                  <option value="24">Small</option>
                  <option value="48">Standard</option>
                </select>
              </label>
            </div>
          )}
          {isImage && (
            <div className="tp-settings">
              <label>
                Quality <span>{Math.round(quality * 100)}%</span>
                <input
                  type="range"
                  min=".2"
                  max="1"
                  step=".01"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                />
              </label>
              {tool.slug === 'resize-image' && (
                <label>
                  Common preset
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value.startsWith('percent:')) {
                        setScalePercent(Number(event.target.value.slice(8)));
                        setWidth('');
                        setHeight('');

                        return;
                      }

                      const [nextWidth, nextHeight] = event.target.value.split('x');
                      setScalePercent(undefined);
                      setWidth(nextWidth || '');
                      setHeight(nextHeight || '');
                    }}
                  >
                    <option value="">Custom dimensions</option>
                    <option value="percent:25">25% of original</option>
                    <option value="percent:50">50% of original</option>
                    <option value="percent:75">75% of original</option>
                    <option value="percent:200">200% of original</option>
                    <option value="1080x1080">Square · 1080 × 1080</option>
                    <option value="1080x1350">Portrait · 1080 × 1350</option>
                    <option value="1080x1920">Story · 1080 × 1920</option>
                    <option value="1920x1080">Full HD · 1920 × 1080</option>
                    <option value="1280x720">HD · 1280 × 720</option>
                  </select>
                </label>
              )}
              <label>
                Width
                <input
                  inputMode="numeric"
                  value={width}
                  onChange={(e) => {
                    setScalePercent(undefined);
                    setWidth(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="Original"
                />
              </label>
              <label>
                Height
                <input
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => {
                    setScalePercent(undefined);
                    setHeight(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="Original"
                />
              </label>
              <label className="tp-check">
                <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} /> Lock aspect ratio
              </label>
              {formats[tool.slug] === 'image/jpeg' && (
                <label>
                  Background
                  <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} />
                </label>
              )}
            </div>
          )}
          {tool.slug === 'split-pdf' && (
            <div className="tp-settings">
              <label>
                Mode
                <select value={splitMode} onChange={(e) => setSplitMode(e.target.value as 'extract' | 'every')}>
                  <option value="extract">Extract selected pages</option>
                  <option value="every">Split every page</option>
                </select>
              </label>
              {splitMode === 'extract' && (
                <label>
                  Pages
                  <input value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-3,7,10-12" />
                </label>
              )}
              <p>{pageCount} pages detected</p>
            </div>
          )}
          {tool.slug === 'organize-pdf' && (
            <div className="tp-page-list">
              {pages.map((page, index) => (
                <div key={page.sourceIndex}>
                  {thumbnails[page.sourceIndex] && (
                    <img src={thumbnails[page.sourceIndex].url} alt={`Page ${page.sourceIndex + 1}`} />
                  )}
                  <strong>Page {page.sourceIndex + 1}</strong>
                  <span>{page.rotation}°</span>
                  <button onClick={() => setPages(move(pages, index, -1))} disabled={index === 0}>
                    <ArrowUp />
                  </button>
                  <button onClick={() => setPages(move(pages, index, 1))} disabled={index === pages.length - 1}>
                    <ArrowDown />
                  </button>
                  <button
                    onClick={() =>
                      setPages(
                        pages.map((item, i) =>
                          i === index ? { ...item, rotation: (item.rotation + 90) % 360 } : item,
                        ),
                      )
                    }
                  >
                    <RotateCw />
                  </button>
                  <button onClick={() => setPages(pages.filter((_, i) => i !== index))}>
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="tp-engine-actions">
            <button className="tp-primary" onClick={process} disabled={phase === 'processing' || !files.length}>
              {phase === 'processing'
                ? 'Processing…'
                : tool.slug === 'merge-pdf'
                  ? 'Merge PDFs'
                  : tool.slug === 'jpg-to-pdf'
                    ? 'Create PDF'
                    : tool.slug === 'split-pdf'
                      ? 'Split PDF'
                      : tool.slug === 'organize-pdf'
                        ? 'Export PDF'
                        : isImage
                          ? 'Process image'
                          : 'Process'}
            </button>
            {result && (
              <button
                className="tp-download"
                onClick={() => {
                  downloadBlob(result, filename());
                  track('tool_download', { tool: tool.slug, bytes: result.size });
                }}
              >
                <Download size={18} />
                Download {formatSize(result.size)}
              </button>
            )}
            {batchResults.length > 1 && (
              <button
                className="tp-download"
                onClick={async () => downloadBlob(await zipImages(batchResults), `${tool.slug}-images.zip`)}
              >
                <Download size={18} />
                Download all as ZIP
              </button>
            )}
          </div>
          {batchResults.length > 1 && (
            <div className="tp-file-list">
              {batchResults.map((item) => (
                <div className="tp-file-row" key={item.name}>
                  <strong>{item.name}</strong>
                  <button onClick={() => downloadBlob(item.blob, item.name)}>
                    <Download size={16} /> Download
                  </button>
                </div>
              ))}
            </div>
          )}
          {result && imageResult && isImage && (
            <div className="tp-result-stats" aria-live="polite">
              <span>
                <strong>Before</strong>
                {imageResult.originalWidth} × {imageResult.originalHeight} · {formatSize(files[0].size)}
              </span>
              <span>
                <strong>After</strong>
                {imageResult.width} × {imageResult.height} · {formatSize(result.size)}
              </span>
              <span>
                <strong>Change</strong>
                {result.size < files[0].size
                  ? `${Math.round((1 - result.size / files[0].size) * 100)}% smaller`
                  : `${Math.round((result.size / files[0].size - 1) * 100)}% larger`}
              </span>
            </div>
          )}
        </>
      )}
      {error && (
        <p className="tp-error" role="alert">
          <strong>Couldn’t process this selection.</strong> {error}
        </p>
      )}
      <p className="tp-local-note">Your files are processed in your browser and are not uploaded to our servers.</p>
    </div>
  );
}
