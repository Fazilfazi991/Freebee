import { Download, RotateCcw, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { downloadBlob } from '~/lib/tools/download';

export function SignatureTool() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [name, setName] = useState('Your Name');
  const [color, setColor] = useState('#111827');
  const [size, setSize] = useState(54);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [style, setStyle] = useState('cursive');
  const [history, setHistory] = useState<ImageData[]>([]);
  const drawing = useRef(false);
  const renderTyped = () => {
    const context = canvas.current?.getContext('2d');

    if (!context || !canvas.current) {
      return;
    }

    context.clearRect(0, 0, canvas.current.width, canvas.current.height);
    context.fillStyle = color;
    context.font = `italic ${size}px ${style}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvas.current.width / 2, canvas.current.height / 2);
  };
  useEffect(() => {
    if (mode === 'type') {
      renderTyped();
    }
  }, [mode, name, color, size, style]);

  const point = (event: React.PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.current!.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.current!.height) / rect.height,
    };
  };
  const start = (event: React.PointerEvent) => {
    if (mode !== 'draw') {
      return;
    }

    const context = canvas.current!.getContext('2d')!;
    setHistory([...history, context.getImageData(0, 0, canvas.current!.width, canvas.current!.height)]);

    const p = point(event);
    context.beginPath();
    context.moveTo(p.x, p.y);
    context.strokeStyle = color;
    context.lineWidth = strokeWidth;
    context.lineCap = 'round';
    drawing.current = true;
    canvas.current!.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent) => {
    if (!drawing.current) {
      return;
    }

    const p = point(event);
    const context = canvas.current!.getContext('2d')!;
    context.lineTo(p.x, p.y);
    context.stroke();
  };
  const clear = () => canvas.current?.getContext('2d')?.clearRect(0, 0, canvas.current.width, canvas.current.height);
  const download = () => canvas.current?.toBlob((blob) => blob && downloadBlob(blob, 'signature.png'), 'image/png');

  return (
    <div className="tp-signature">
      <p className="tp-preview-note">Typed signatures may not satisfy every legal electronic-signature requirement.</p>
      <div className="tp-engine-actions">
        <button onClick={() => setMode('type')}>Type</button>
        <button
          onClick={() => {
            setMode('draw');
            clear();
          }}
        >
          Draw
        </button>
      </div>
      {mode === 'type' && (
        <div className="tp-document-grid">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Style
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="cursive">Cursive</option>
              <option value="serif">Serif</option>
              <option value="sans-serif">Modern</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
          <label>
            Size
            <input type="range" min="24" max="96" value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
          <label>
            Color
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
      )}
      {mode === 'draw' && (
        <label>
          Stroke width: {strokeWidth}px
          <input
            type="range"
            min="1"
            max="12"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
        </label>
      )}
      <canvas
        ref={canvas}
        width="900"
        height="260"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => (drawing.current = false)}
      />
      <div className="tp-engine-actions">
        {mode === 'draw' && (
          <button
            onClick={() => {
              const previous = history.at(-1);

              if (previous) {
                canvas.current?.getContext('2d')?.putImageData(previous, 0, 0);
              }

              setHistory(history.slice(0, -1));
            }}
          >
            <Undo2 /> Undo
          </button>
        )}
        <button onClick={clear}>
          <RotateCcw /> Clear
        </button>
        <button className="tp-primary" onClick={download}>
          <Download /> Download PNG
        </button>
      </div>
    </div>
  );
}
