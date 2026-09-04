import { Copy, Download, FileUp, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { downloadBlob } from '~/lib/tools/download';
import { csvToJson, jsonToCsv } from '~/lib/tools/csv/engine';

export function CsvTool({ mode }: { mode: 'csv-to-json' | 'json-to-csv' }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [header, setHeader] = useState(true);
  const [delimiter, setDelimiter] = useState(mode === 'csv-to-json' ? '' : ',');
  const process = async () => {
    setError('');
    setWarnings([]);

    try {
      if (mode === 'csv-to-json') {
        const result = await csvToJson(input, header, delimiter);
        setOutput(JSON.stringify(result.rows, null, 2));
        setWarnings(result.warnings);

        if (!delimiter) {
          setDelimiter(result.delimiter);
        }
      } else {
        setOutput(await jsonToCsv(input, delimiter));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Conversion failed.');
    }
  };

  return (
    <div className="tp-utility">
      <label>
        {mode === 'csv-to-json' ? 'CSV input' : 'JSON array input'}
        <textarea value={input} onChange={(event) => setInput(event.target.value)} />
      </label>
      <label className="tp-file-button">
        <FileUp size={17} /> Upload
        <input
          hidden
          type="file"
          accept={mode === 'csv-to-json' ? '.csv,text/csv' : '.json,application/json'}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void file.text().then(setInput);
            }
          }}
        />
      </label>
      <label>
        Delimiter
        <select value={delimiter} onChange={(event) => setDelimiter(event.target.value)}>
          <option value="">Auto detect</option>
          <option value=",">Comma</option>
          <option value=";">Semicolon</option>
          <option value={'\t'}>Tab</option>
          <option value="|">Pipe</option>
        </select>
      </label>
      {mode === 'csv-to-json' && (
        <label>
          <input type="checkbox" checked={header} onChange={(event) => setHeader(event.target.checked)} /> First row
          contains headers
        </label>
      )}
      <button className="tp-primary" onClick={() => void process()}>
        Convert
      </button>
      {error && (
        <p className="tp-error" role="alert">
          {error}
        </p>
      )}
      {warnings.length > 0 && (
        <ul>
          {warnings.slice(0, 5).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {output && (
        <>
          <textarea readOnly value={output} />
          <div className="tp-engine-actions">
            <button onClick={() => void navigator.clipboard.writeText(output)}>
              <Copy /> Copy
            </button>
            <button
              onClick={() =>
                downloadBlob(
                  new Blob([output], { type: mode === 'csv-to-json' ? 'application/json' : 'text/csv' }),
                  mode === 'csv-to-json' ? 'converted.json' : 'converted.csv',
                )
              }
            >
              <Download /> Download
            </button>
            <button
              onClick={() => {
                setInput('');
                setOutput('');
                setError('');
                setWarnings([]);
              }}
            >
              <RotateCcw /> Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
