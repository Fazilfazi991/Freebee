import { ArrowDown, ArrowUp, Download, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { downloadBlob } from '~/lib/tools/download';
import { browserToolLimits } from '~/lib/tools/limits';
import {
  calculateTotals,
  documentFilename,
  formatCurrency,
  renderBusinessPdf,
  type BusinessDocument,
  type Currency,
  type LineItem,
} from '~/lib/tools/business-documents/engine';

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const makeItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: 'Service',
  quantity: 1,
  rate: 0,
  tax: 0,
  discount: 0,
});
const initial = (type: 'invoice' | 'quotation'): BusinessDocument => ({
  type,
  number: type === 'invoice' ? 'INV-1001' : 'QT-1001',
  issueDate: today(),
  dueDate: addDays(type === 'invoice' ? 14 : 30),
  currency: 'AED',
  template: 'classic',
  business: { name: '', address: '', email: '', phone: '', taxId: '' },
  customer: { name: '', company: '', address: '', email: '', phone: '' },
  items: [makeItem()],
  notes: '',
  terms: '',
});

export function BusinessDocumentTool({ type }: { type: 'invoice' | 'quotation' }) {
  const [doc, setDoc] = useState(() => initial(type));
  const [busy, setBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const totals = useMemo(() => calculateTotals(doc.items), [doc.items]);
  const patchParty = (party: 'business' | 'customer', key: string, value: string) =>
    setDoc({ ...doc, [party]: { ...doc[party], [key]: value } });
  const updateItem = (id: string, key: keyof LineItem, value: string) =>
    setDoc({
      ...doc,
      items: doc.items.map((item) =>
        item.id === id ? { ...item, [key]: key === 'description' ? value : Number(value) } : item,
      ),
    });
  const move = (index: number, offset: number) => {
    const items = [...doc.items];
    [items[index], items[index + offset]] = [items[index + offset], items[index]];
    setDoc({ ...doc, items });
  };
  const generate = async () => {
    setBusy(true);

    try {
      const blob = await renderBusinessPdf(doc);
      downloadBlob(blob, documentFilename(doc));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tp-document-tool">
      <p className="tp-preview-note">Your document data stays in your browser during this session.</p>
      <div className="tp-document-grid">
        <fieldset>
          <legend>Business</legend>
          {['name', 'address', 'email', 'phone', 'taxId'].map((key) => (
            <label key={key}>
              {key}
              <input
                value={doc.business[key as keyof typeof doc.business]}
                onChange={(e) => patchParty('business', key, e.target.value)}
              />
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Customer</legend>
          {['name', 'company', 'address', 'email', 'phone'].map((key) => (
            <label key={key}>
              {key}
              <input
                value={doc.customer[key as keyof typeof doc.customer]}
                onChange={(e) => patchParty('customer', key, e.target.value)}
              />
            </label>
          ))}
        </fieldset>
      </div>
      <div className="tp-document-grid">
        <label>
          Logo (PNG/JPG, max 2 MB)
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={async (event) => {
              const logo = event.target.files?.[0];

              if (!logo) {
                return;
              }

              if (logo.size > browserToolLimits.maxLogoBytes) {
                setLogoError('Choose a logo smaller than 2 MB.');
                return;
              }

              const bitmap = await createImageBitmap(logo);
              const tooLarge =
                bitmap.width > browserToolLimits.maxLogoDimension || bitmap.height > browserToolLimits.maxLogoDimension;
              bitmap.close();
              setLogoError(tooLarge ? 'Choose a logo no larger than 4096 × 4096 pixels.' : '');

              if (!tooLarge) {
                if (logoPreview) {
                  URL.revokeObjectURL(logoPreview);
                }

                setDoc({ ...doc, logo });
                setLogoPreview(URL.createObjectURL(logo));
              }
            }}
          />
        </label>
        {logoPreview && <img className="tp-logo-preview" src={logoPreview} alt="Logo preview" />}
        {logoError && (
          <p className="tp-error" role="alert">
            {logoError}
          </p>
        )}
        {doc.logo && (
          <button
            onClick={() => {
              URL.revokeObjectURL(logoPreview);
              setLogoPreview('');
              setDoc({ ...doc, logo: undefined });
            }}
          >
            Remove logo
          </button>
        )}
        <label>
          Number
          <input value={doc.number} onChange={(e) => setDoc({ ...doc, number: e.target.value })} />
        </label>
        <label>
          Issue date
          <input type="date" value={doc.issueDate} onChange={(e) => setDoc({ ...doc, issueDate: e.target.value })} />
        </label>
        <label>
          {type === 'invoice' ? 'Due date' : 'Valid until'}
          <input type="date" value={doc.dueDate} onChange={(e) => setDoc({ ...doc, dueDate: e.target.value })} />
        </label>
        <label>
          Currency
          <select value={doc.currency} onChange={(e) => setDoc({ ...doc, currency: e.target.value as Currency })}>
            {['AED', 'USD', 'EUR', 'GBP', 'INR', 'SAR', 'QAR', 'OMR', 'KWD', 'BHD'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Template
          <select
            value={doc.template}
            onChange={(e) => setDoc({ ...doc, template: e.target.value as BusinessDocument['template'] })}
          >
            <option>classic</option>
            <option>minimal</option>
            <option>modern</option>
          </select>
        </label>
      </div>
      <h3>Line items</h3>
      <div className="tp-line-items">
        {doc.items.map((item, index) => (
          <article key={item.id}>
            <label>
              Description
              <input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
            </label>
            {(['quantity', 'rate', 'tax', 'discount'] as const).map((key) => (
              <label key={key}>
                {key}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item[key]}
                  onChange={(e) => updateItem(item.id, key, e.target.value)}
                />
              </label>
            ))}
            <div className="tp-engine-actions">
              <button
                aria-label={`Move ${item.description || 'item'} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp />
              </button>
              <button
                aria-label={`Move ${item.description || 'item'} down`}
                disabled={index === doc.items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </button>
              <button
                aria-label={`Remove ${item.description || 'item'}`}
                disabled={doc.items.length === 1}
                onClick={() => setDoc({ ...doc, items: doc.items.filter((row) => row.id !== item.id) })}
              >
                <Trash2 />
              </button>
            </div>
          </article>
        ))}
      </div>
      <button onClick={() => setDoc({ ...doc, items: [...doc.items, makeItem()] })}>
        <Plus /> Add item
      </button>
      <div className="tp-result-stats">
        <span>
          <strong>Subtotal</strong>
          {formatCurrency(totals.subtotal, doc.currency)}
        </span>
        <span>
          <strong>Discount</strong>
          {formatCurrency(totals.discount, doc.currency)}
        </span>
        <span>
          <strong>Tax</strong>
          {formatCurrency(totals.tax, doc.currency)}
        </span>
        <span>
          <strong>Grand total</strong>
          {formatCurrency(totals.total, doc.currency)}
        </span>
      </div>
      <label>
        Notes
        <textarea value={doc.notes} onChange={(e) => setDoc({ ...doc, notes: e.target.value })} />
      </label>
      <label>
        Terms
        <textarea value={doc.terms} onChange={(e) => setDoc({ ...doc, terms: e.target.value })} />
      </label>
      <div className="tp-engine-actions">
        <button className="tp-primary" disabled={busy} onClick={() => void generate()}>
          <Download />
          {busy ? 'Generating…' : 'Download PDF'}
        </button>
        <button
          onClick={() => {
            if (logoPreview) {
              URL.revokeObjectURL(logoPreview);
            }

            setLogoPreview('');
            setLogoError('');
            setDoc(initial(type));
          }}
        >
          <RotateCcw /> Reset
        </button>
      </div>
    </div>
  );
}
