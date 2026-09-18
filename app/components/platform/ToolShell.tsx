import { Link } from '@remix-run/react';
import { AlertCircle, FileUp, LockKeyhole, RotateCcw } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ToolDefinition } from '~/lib/tools/types';
import { getToolSeo, getPriorityPageContent, relatedToolsFor } from '~/lib/seo';
import { track } from '~/lib/analytics';
import { ToolCard } from './ToolCard';
import { JsonFormatter } from './JsonFormatter';
import { QrGenerator } from './QrGenerator';
import { BrowserFileTool } from './BrowserFileTool';
import { AdvancedPdfTool } from './AdvancedPdfTool';
import { OcrTool } from './OcrTool';
import { MediaInfoTool } from './MediaInfoTool';
import { UtilityTool } from './UtilityTool';
import { CsvTool } from './CsvTool';
import { BusinessDocumentTool } from './BusinessDocumentTool';
import { SignatureTool } from './SignatureTool';
import { CalculatorTool } from './CalculatorTool';
import { batch2Slugs, CalculatorBatch2Tool } from './CalculatorBatch2Tool';

export function ToolShell({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const setSelected = (list: FileList | null) => {
    const next = Array.from(list ?? []);
    setFiles(next);

    if (next.length) {
      track('tool_upload', { toolSlug: tool.slug, processingLocation: 'browser' });
    }
  };
  const related = relatedToolsFor(tool, 5);
  const seo = getToolSeo(tool);
  const priorityContent = getPriorityPageContent(tool.slug);
  const isJson = tool.slug === 'json-formatter';
  const isQr = tool.slug === 'qr-generator';
  const isOcr = tool.slug === 'image-to-text';
  const isMediaInfo = tool.slug === 'media-info';
  const isUtility = [
    'uuid-generator',
    'base64-encoder',
    'base64-decoder',
    'url-encoder',
    'url-decoder',
    'jwt-decoder',
    'hash-generator',
    'timestamp-converter',
    'word-counter',
    'character-counter',
    'text-case-converter',
    'json-validator',
    'password-generator',
  ].includes(tool.slug);
  const isCsv = tool.slug === 'csv-to-json' || tool.slug === 'json-to-csv';
  const isBusinessDocument = tool.slug === 'invoice-generator' || tool.slug === 'quotation-generator';
  const isCalculator = tool.category === 'calculator';
  const isAdvancedPdf = [
    'pdf-to-jpg',
    'pdf-to-png',
    'rotate-pdf',
    'remove-pdf-pages',
    'extract-pdf-pages',
    'add-page-numbers-to-pdf',
  ].includes(tool.slug);
  const hasBrowserFileEngine = tool.engine === 'browser' && !isJson && !isQr && !isCalculator;

  return (
    <div className="tp-page tp-tool-page">
      <nav className="tp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/tools">Tools</Link>
        <span>/</span>
        <Link to={`/${tool.category}`}>{tool.category}</Link>
        <span>/</span>
        <span>{tool.name}</span>
      </nav>
      <header className="tp-tool-heading">
        <div>
          <h1>{tool.name}</h1>
          <p>{tool.description}</p>
        </div>
        <span className={`tp-status ${tool.engine === 'browser' ? 'ready' : ''}`}>
          {tool.engine === 'browser' ? 'Works in your browser' : 'Engine preview'}
        </span>
      </header>
      <section className="tp-workspace" aria-label={`${tool.name} workspace`}>
        {isCalculator && batch2Slugs.has(tool.id) ? (
          <CalculatorBatch2Tool slug={tool.id} />
        ) : isCalculator ? (
          <CalculatorTool slug={tool.id} />
        ) : isJson ? (
          <JsonFormatter />
        ) : isQr ? (
          <QrGenerator />
        ) : isOcr ? (
          <OcrTool />
        ) : isMediaInfo ? (
          <MediaInfoTool />
        ) : isUtility ? (
          <UtilityTool slug={tool.slug} />
        ) : isCsv ? (
          <CsvTool mode={tool.slug as 'csv-to-json' | 'json-to-csv'} />
        ) : isBusinessDocument ? (
          <BusinessDocumentTool type={tool.slug === 'invoice-generator' ? 'invoice' : 'quotation'} />
        ) : tool.slug === 'signature-generator' ? (
          <SignatureTool />
        ) : isAdvancedPdf ? (
          <AdvancedPdfTool tool={tool} />
        ) : hasBrowserFileEngine ? (
          <BrowserFileTool tool={tool} />
        ) : (
          <div
            className="tp-upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setSelected(e.dataTransfer.files);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={tool.accept}
              multiple={tool.slug === 'merge-pdf' || tool.slug === 'jpg-to-pdf'}
              onChange={(e) => setSelected(e.target.files)}
            />
            <span className="tp-upload-icon">
              <FileUp size={26} />
            </span>
            {files.length ? (
              <>
                <h2>{files.length === 1 ? files[0].name : `${files.length} files selected`}</h2>
                <p>Selection is ready. Processing is intentionally unavailable in this foundation build.</p>
                <button onClick={() => setFiles([])}>
                  <RotateCcw size={18} />
                  Start over
                </button>
              </>
            ) : (
              <>
                <h2>
                  Choose{' '}
                  {tool.accept?.includes('image') ? 'an image' : tool.accept?.includes('video') ? 'a video' : 'a file'}
                </h2>
                <p>Drop it here, or use the file picker on any device.</p>
                <button className="tp-primary" onClick={() => inputRef.current?.click()}>
                  Choose file
                </button>
              </>
            )}
            <div className="tp-preview-note">
              <AlertCircle size={17} />
              <span>
                <strong>Preview only.</strong> This page does not process, upload, or create a result yet.
              </span>
            </div>
          </div>
        )}
      </section>
      <p className="tp-privacy">
        <LockKeyhole size={17} />
        <span>
          <strong>Privacy by design.</strong>{' '}
          {tool.engine === 'browser'
            ? 'This tool processes your work locally in this browser session.'
            : 'Each tool will state its processing model before you begin.'}
        </span>
      </p>
      <section className="tp-info">
        <div>
          <h2>Made for a focused workflow</h2>
          <p>
            {tool.engine === 'browser'
              ? `${tool.name} works locally in this browser session, with no account required.`
              : `The complete ${tool.name} interface is here so the processing engine can be integrated and tested independently without coupling it to the platform shell.`}
          </p>
        </div>
        <div>
          <h2>What to expect</h2>
          <ul>
            <li>Clear progress and recoverable errors</li>
            <li>Explicit file handling and privacy information</li>
            <li>No fabricated results while an engine is unavailable</li>
          </ul>
        </div>
      </section>
      {priorityContent && (
        <section className="tp-info tp-priority-guide">
          <div>
            <h2>How to use {tool.name}</h2>
            <ol>{priorityContent.howToUse.map((step) => <li key={step}>{step}</li>)}</ol>
          </div>
          <div>
            <h2>Method</h2>
            <p>{priorityContent.method}</p>
            <h2>Example</h2>
            <p>{priorityContent.example}</p>
          </div>
          <div>
            <h2>Limitations</h2>
            <ul>{priorityContent.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section>
          <h2 className="tp-section-title">Related tools</h2>
          <div className="tp-tool-grid">
            {related.map((item) => (
              <ToolCard key={item.id} tool={item} />
            ))}
          </div>
        </section>
      )}
      <section className="tp-faq">
        <h2>Frequently asked questions</h2>
        {seo.faq.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
