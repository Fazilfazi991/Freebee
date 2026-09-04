import { Copy, Download, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { downloadBlob } from '~/lib/tools/download';
import {
  convertCase,
  decodeBase64,
  decodeJwt,
  encodeBase64,
  generatePassword,
  hashValue,
  jwtTimestamps,
  textStats,
} from '~/lib/tools/utilities/engine';

const copy = (value: string) => navigator.clipboard.writeText(value);

export function UtilityTool({ slug }: { slug: string }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(5);
  const [algorithm, setAlgorithm] = useState<'SHA-256' | 'SHA-384' | 'SHA-512'>('SHA-256');
  const [hashFile, setHashFile] = useState<File>();
  const [passwordCount, setPasswordCount] = useState(1);
  const [passwordGroups, setPasswordGroups] = useState(['lower', 'upper', 'number', 'symbol']);
  const [excluded, setExcluded] = useState('');
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [jwtClaims, setJwtClaims] = useState<ReturnType<typeof jwtTimestamps>>([]);
  const stats = useMemo(() => textStats(input), [input]);
  const run = async (action = slug) => {
    setError('');

    try {
      if (action === 'uuid-generator') {
        setOutput(Array.from({ length: quantity }, () => crypto.randomUUID()).join('\n'));
      } else if (action === 'base64-encoder') {
        setOutput(encodeBase64(input));
      } else if (action === 'base64-decoder') {
        setOutput(decodeBase64(input));
      } else if (action === 'url-encoder') {
        setOutput(encodeURIComponent(input));
      } else if (action === 'url-decoder') {
        setOutput(decodeURIComponent(input));
      } else if (action === 'jwt-decoder') {
        const value = decodeJwt(input);
        setOutput(JSON.stringify(value, null, 2));
        setJwtClaims(jwtTimestamps(value.payload));
      } else if (action === 'hash-generator') {
        setOutput(await hashValue(hashFile ? await hashFile.arrayBuffer() : input, algorithm));
      } else if (action === 'json-validator') {
        setOutput(JSON.stringify(JSON.parse(input), null, 2));
      } else if (action === 'password-generator') {
        setOutput(
          Array.from({ length: passwordCount }, () =>
            generatePassword(quantity, passwordGroups, excluded + (excludeAmbiguous ? '1IlO0' : '')),
          ).join('\n'),
        );
      } else if (action === 'text-case-converter') {
        setOutput(convertCase(input, 'title'));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The input could not be processed.');
    }
  };

  if (slug === 'word-counter' || slug === 'character-counter') {
    return (
      <div className="tp-utility">
        <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type or paste text" />
        <div className="tp-result-stats">
          <span>
            <strong>Words</strong>
            {stats.words}
          </span>
          <span>
            <strong>Characters</strong>
            {stats.characters}
          </span>
          <span>
            <strong>Without spaces</strong>
            {stats.charactersWithoutSpaces}
          </span>
          <span>
            <strong>Sentences</strong>
            {stats.sentences}
          </span>
          <span>
            <strong>Paragraphs</strong>
            {stats.paragraphs}
          </span>
          <span>
            <strong>Reading time</strong>
            {stats.readingMinutes} min
          </span>
        </div>
      </div>
    );
  }

  if (slug === 'timestamp-converter') {
    return <TimestampTool />;
  }

  const quantityTool = slug === 'uuid-generator' || slug === 'password-generator';

  return (
    <div className="tp-utility">
      {slug === 'jwt-decoder' && (
        <p className="tp-preview-note">
          <strong>Important:</strong> Decoding a JWT does not verify its signature or authenticity.
        </p>
      )}
      {!quantityTool && (
        <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Enter input" />
      )}
      {quantityTool && (
        <label>
          {slug === 'uuid-generator' ? 'Quantity' : 'Length'}
          <input
            type="number"
            min="1"
            max={slug === 'uuid-generator' ? 100 : 128}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
      )}
      {slug === 'hash-generator' && (
        <>
          <label>
            Or hash a file
            <input type="file" onChange={(event) => setHashFile(event.target.files?.[0])} />
          </label>
          {hashFile && (
            <p className="tp-preview-note">
              {hashFile.name} · {hashFile.size.toLocaleString()} bytes
            </p>
          )}
          <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as typeof algorithm)}>
            <option>SHA-256</option>
            <option>SHA-384</option>
            <option>SHA-512</option>
          </select>
        </>
      )}
      {slug === 'password-generator' && (
        <div className="tp-document-grid">
          <fieldset>
            <legend>Character groups</legend>
            {[
              ['lower', 'Lowercase'],
              ['upper', 'Uppercase'],
              ['number', 'Numbers'],
              ['symbol', 'Symbols'],
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={passwordGroups.includes(key)}
                  onChange={(event) =>
                    setPasswordGroups(
                      event.target.checked ? [...passwordGroups, key] : passwordGroups.filter((item) => item !== key),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label>
            Passwords to generate
            <input
              type="number"
              min="1"
              max="100"
              value={passwordCount}
              onChange={(event) => setPasswordCount(Number(event.target.value))}
            />
          </label>
          <label>
            Exclude characters
            <input
              value={excluded}
              onChange={(event) => setExcluded(event.target.value)}
              placeholder="For example: 1IlO0"
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={excludeAmbiguous}
              onChange={(event) => setExcludeAmbiguous(event.target.checked)}
            />
            Exclude ambiguous characters (1, I, l, O, 0)
          </label>
        </div>
      )}
      {slug === 'text-case-converter' ? (
        <div className="tp-engine-actions">
          {['lower', 'upper', 'title', 'sentence', 'camel', 'pascal', 'snake', 'kebab'].map((style) => (
            <button key={style} onClick={() => setOutput(convertCase(input, style))}>
              {style}
            </button>
          ))}
        </div>
      ) : (
        <button className="tp-primary" onClick={() => void run()}>
          {slug.includes('decoder') ? 'Decode' : slug === 'json-validator' ? 'Validate JSON' : 'Generate / Convert'}
        </button>
      )}
      {error && (
        <p className="tp-error" role="alert">
          {error}
        </p>
      )}
      {output && (
        <>
          <textarea readOnly value={output} />
          {slug === 'jwt-decoder' && jwtClaims.length > 0 && (
            <div className="tp-result-stats">
              {jwtClaims.map((claim) => (
                <span key={claim.claim}>
                  <strong>
                    {claim.claim.toUpperCase()} · {claim.status}
                  </strong>
                  {claim.utc}
                  <br />
                  Local: {claim.local}
                  <br />
                  Unix: {claim.unix}
                </span>
              ))}
            </div>
          )}
          <div className="tp-engine-actions">
            <button onClick={() => void copy(output)}>
              <Copy /> Copy
            </button>
            <button onClick={() => downloadBlob(new Blob([output], { type: 'text/plain' }), `${slug}.txt`)}>
              <Download /> Download
            </button>
            <button
              onClick={() => {
                setInput('');
                setOutput('');
                setError('');
                setHashFile(undefined);
                setJwtClaims([]);
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

function TimestampTool() {
  const [value, setValue] = useState(String(Math.floor(Date.now() / 1000)));
  const [unit, setUnit] = useState<'seconds' | 'milliseconds'>('seconds');
  const date = new Date(Number(value) * (unit === 'seconds' ? 1000 : 1));

  return (
    <div className="tp-utility">
      <label>
        Unix timestamp
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <select value={unit} onChange={(event) => setUnit(event.target.value as typeof unit)}>
        <option value="seconds">Seconds</option>
        <option value="milliseconds">Milliseconds</option>
      </select>
      {!Number.isNaN(date.valueOf()) && (
        <div className="tp-result-stats">
          <span>
            <strong>ISO / UTC</strong>
            {date.toISOString()}
          </span>
          <span>
            <strong>Local</strong>
            {date.toLocaleString()}
          </span>
          <span>
            <strong>Unix seconds</strong>
            {Math.floor(date.valueOf() / 1000)}
          </span>
          <span>
            <strong>Milliseconds</strong>
            {date.valueOf()}
          </span>
        </div>
      )}
    </div>
  );
}
