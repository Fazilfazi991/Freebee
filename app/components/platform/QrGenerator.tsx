import { useRef, useState } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { Download, RotateCcw } from 'lucide-react';
import { track } from '~/lib/analytics';

export function QrGenerator() {
  const [value, setValue] = useState('https://example.com');
  const ref = useRef<HTMLDivElement>(null);
  const download = () => {
    const canvas = ref.current?.querySelector('canvas');

    if (!canvas) {
      return;
    }

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'qr-code.png';
    a.click();
    track('tool_download', { toolSlug: 'qr-generator' });
  };

  return (
    <div className="tp-qr">
      <div>
        <label htmlFor="qr-value">Link or text</label>
        <input
          id="qr-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a link or type text"
        />
        <button className="tp-primary" onClick={download} disabled={!value}>
          <Download size={18} />
          Download PNG
        </button>
        <button onClick={() => setValue('https://example.com')}>
          <RotateCcw size={18} />
          Reset
        </button>
      </div>
      <div className="tp-qr-preview" ref={ref}>
        {value ? (
          <QRCode value={value} size={220} quietZone={14} bgColor="#ffffff" fgColor="#17211b" />
        ) : (
          <p>Your QR code will appear here.</p>
        )}
      </div>
    </div>
  );
}
