import { Copy, Download, FileUp, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { downloadBlob } from '~/lib/tools/download';
import { validateFiles } from '~/lib/tools/limits';

export function OcrTool() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('eng');
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const reset = () => {
    setFile(null);
    setText('');
    setError('');
    setProgress(0);
  };
  const choose = (selected?: File) => {
    if (!selected) {
      return;
    }

    const limitError = validateFiles([selected]);

    if (limitError || !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError(limitError || 'Choose a JPG, PNG, or WebP image.');
      return;
    }

    setFile(selected);
    setText('');
    setError('');
  };
  const recognize = async () => {
    if (!file) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(language, 1, { logger: (message) => setProgress(message.progress || 0) });

      try {
        const result = await worker.recognize(file);
        setText(result.data.text.trim());
      } finally {
        await worker.terminate();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Text extraction failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tp-engine tp-ocr">
      {!file ? (
        <label className="tp-upload">
          <FileUp size={26} />
          <strong>Choose an image</strong>
          <span>JPG, PNG, or WebP. OCR runs locally after its language model loads.</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => choose(event.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="tp-file-summary">
          <strong>{file.name}</strong>
          <button onClick={reset}>
            <RotateCcw size={17} /> Reset
          </button>
        </div>
      )}
      {file && (
        <>
          <div className="tp-settings">
            <label>
              Language
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="eng">English</option>
                <option value="spa">Spanish</option>
                <option value="fra">French</option>
              </select>
            </label>
          </div>
          <button className="tp-primary" onClick={() => void recognize()} disabled={processing}>
            {processing ? `Extracting… ${Math.round(progress * 100)}%` : 'Extract text'}
          </button>
        </>
      )}
      {text && (
        <div className="tp-ocr-result">
          <label>
            Extracted text
            <textarea value={text} readOnly />
          </label>
          <div className="tp-work-actions">
            <button onClick={() => navigator.clipboard.writeText(text)}>
              <Copy size={17} /> Copy text
            </button>
            <button onClick={() => downloadBlob(new Blob([text], { type: 'text/plain' }), 'extracted-text.txt')}>
              <Download size={17} /> Download TXT
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="tp-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
