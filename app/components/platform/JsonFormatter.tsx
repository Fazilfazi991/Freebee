import { useState } from 'react';
import { Copy, Download, Minimize2, RotateCcw, Wand2 } from 'lucide-react';
import { track } from '~/lib/analytics';

const sample = '{\n  "project": "Tool Platform",\n  "ready": true\n}';

export function JsonFormatter() {
  const [value, setValue] = useState(sample);
  const [error, setError] = useState('');
  const transform = (minify = false) => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed, null, minify ? 0 : 2));
      setError('');
      track('tool_process_completed', { toolSlug: 'json-formatter', processingLocation: 'browser' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Invalid JSON';
      setError(message);
      track('tool_error', { toolSlug: 'json-formatter', errorCode: 'invalid_json' });
    }
  };
  const download = () => {
    const blob = new Blob([value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.json';
    a.click();
    URL.revokeObjectURL(url);
    track('tool_download', { toolSlug: 'json-formatter' });
  };

  return (
    <div className="tp-json">
      <label htmlFor="json-input">JSON input</label>
      <textarea
        id="json-input"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-describedby={error ? 'json-error' : undefined}
      />
      <div className="tp-work-actions">
        <button className="tp-primary" onClick={() => transform(false)}>
          <Wand2 size={18} />
          Format JSON
        </button>
        <button onClick={() => transform(true)}>
          <Minimize2 size={18} />
          Minify
        </button>
        <button onClick={() => navigator.clipboard.writeText(value)}>
          <Copy size={18} />
          Copy
        </button>
        <button onClick={download}>
          <Download size={18} />
          Download
        </button>
        <button
          onClick={() => {
            setValue(sample);
            setError('');
          }}
        >
          <RotateCcw size={18} />
          Reset
        </button>
      </div>
      {error && (
        <p id="json-error" className="tp-error" role="alert">
          <strong>That JSON isn’t valid.</strong> {error}
        </p>
      )}
    </div>
  );
}
