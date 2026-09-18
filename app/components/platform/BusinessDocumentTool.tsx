import { ArrowDown, ArrowUp, Download, ImagePlus, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { downloadBlob } from '~/lib/tools/download';
import { browserToolLimits } from '~/lib/tools/limits';
import {
  calculateTotals,
  documentFilename,
  formatCurrency,
  lineTotal,
  renderBusinessPdf,
  type BusinessDocument,
  type Currency,
  type LineItem,
} from '~/lib/tools/business-documents/engine';

const currencies: Currency[] = ['AED', 'USD', 'EUR', 'GBP', 'INR', 'SAR', 'QAR', 'OMR', 'KWD', 'BHD'];
const templates: Array<{ value: BusinessDocument['template']; label: string; description: string }> = [
  { value: 'classic', label: 'Classic', description: 'Structured and timeless' },
  { value: 'minimal', label: 'Minimal', description: 'Clean and understated' },
  { value: 'modern', label: 'Modern', description: 'Bold with an accent' },
];
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
const initial = (type: BusinessDocument['type']): BusinessDocument => ({
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

type Party = BusinessDocument['business'] | BusinessDocument['customer'];

function PartyBlock({
  title,
  party,
  business,
  onChange,
}: {
  title: string;
  party: Party;
  business?: boolean;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <section className="tp-party-block" aria-label={title}>
      <p className="tp-document-kicker">{title}</p>
      <input
        className="tp-document-field tp-party-name"
        aria-label={`${title} name`}
        placeholder={business ? 'Your business name' : 'Client name'}
        value={party.name}
        onChange={(e) => onChange('name', e.target.value)}
      />
      {'company' in party && (
        <input
          className="tp-document-field"
          aria-label="Client company"
          placeholder="Company (optional)"
          value={party.company}
          onChange={(e) => onChange('company', e.target.value)}
        />
      )}
      <textarea
        className="tp-document-field tp-document-textarea"
        aria-label={`${title} address`}
        placeholder="Street address, city, country"
        value={party.address}
        onChange={(e) => onChange('address', e.target.value)}
      />
      <div className="tp-party-contact">
        <input
          className="tp-document-field"
          type="email"
          aria-label={`${title} email`}
          placeholder="email@company.com"
          value={party.email}
          onChange={(e) => onChange('email', e.target.value)}
        />
        <input
          className="tp-document-field"
          type="tel"
          aria-label={`${title} phone`}
          placeholder="Phone number"
          value={party.phone}
          onChange={(e) => onChange('phone', e.target.value)}
        />
      </div>
      {business && 'taxId' in party && (
        <input
          className="tp-document-field"
          aria-label="Tax or VAT number"
          placeholder="Tax / VAT number (optional)"
          value={party.taxId}
          onChange={(e) => onChange('taxId', e.target.value)}
        />
      )}
    </section>
  );
}

function TotalsSummary({ document }: { document: BusinessDocument }) {
  const totals = useMemo(() => calculateTotals(document.items), [document.items]);
  return (
    <section className="tp-document-totals" aria-label="Document totals">
      <div>
        <span>Subtotal</span>
        <output>{formatCurrency(totals.subtotal, document.currency)}</output>
      </div>
      <div>
        <span>Discount</span>
        <output>−{formatCurrency(totals.discount, document.currency)}</output>
      </div>
      <div>
        <span>Tax</span>
        <output>{formatCurrency(totals.tax, document.currency)}</output>
      </div>
      <div className="tp-grand-total">
        <span>Total</span>
        <output>{formatCurrency(totals.total, document.currency)}</output>
      </div>
    </section>
  );
}

function DocumentSettings({
  document,
  busy,
  onChange,
  onDownload,
  onReset,
}: {
  document: BusinessDocument;
  busy: boolean;
  onChange: (patch: Partial<BusinessDocument>) => void;
  onDownload: () => void;
  onReset: () => void;
}) {
  return (
    <aside className="tp-document-settings" aria-label="Document settings">
      <button className="tp-primary tp-download-document" disabled={busy} onClick={onDownload}>
        <Download aria-hidden="true" />
        {busy ? 'Preparing PDF…' : 'Download PDF'}
      </button>
      <section>
        <h3>Template</h3>
        <div className="tp-template-picker">
          {templates.map((template) => (
            <button
              key={template.value}
              type="button"
              aria-pressed={document.template === template.value}
              className={document.template === template.value ? 'is-selected' : ''}
              onClick={() => onChange({ template: template.value })}
            >
              <span className={`tp-template-swatch tp-template-${template.value}`} aria-hidden="true" />
              <strong>{template.label}</strong>
              <small>{template.description}</small>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>Document settings</h3>
        <label>
          Currency
          <select
            className="tp-document-field tp-document-select"
            value={document.currency}
            onChange={(e) => onChange({ currency: e.target.value as Currency })}
          >
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </label>
      </section>
      <p className="tp-document-privacy">Your document and logo stay in this browser. Nothing is uploaded.</p>
      <button className="tp-reset-document" onClick={onReset}>
        <RotateCcw aria-hidden="true" /> Reset document
      </button>
    </aside>
  );
}

export function BusinessDocumentTool({ type }: { type: BusinessDocument['type'] }) {
  const [document, setDocument] = useState(() => initial(type));
  const [busy, setBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const logoInput = useRef<HTMLInputElement>(null);
  const label = type === 'invoice' ? 'Invoice' : 'Quotation';
  const patch = (value: Partial<BusinessDocument>) => setDocument((current) => ({ ...current, ...value }));
  const patchParty = (party: 'business' | 'customer', key: string, value: string) =>
    setDocument((current) => ({ ...current, [party]: { ...current[party], [key]: value } }));
  const updateItem = (id: string, key: keyof LineItem, value: string) =>
    setDocument((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, [key]: key === 'description' ? value : Number(value) } : item,
      ),
    }));
  const moveItem = (index: number, offset: number) =>
    setDocument((current) => {
      const items = [...current.items];
      [items[index], items[index + offset]] = [items[index + offset], items[index]];

      return { ...current, items };
    });
  const removeLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoPreview('');
    setLogoError('');
    patch({ logo: undefined });

    if (logoInput.current) {
      logoInput.current.value = '';
    }
  };
  const reset = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoPreview('');
    setLogoError('');
    setDocument(initial(type));

    if (logoInput.current) {
      logoInput.current.value = '';
    }
  };
  const generate = async () => {
    setBusy(true);

    try {
      downloadBlob(await renderBusinessPdf(document), documentFilename(document));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tp-document-tool">
      <div className="tp-document-workspace">
        <main className={`tp-document-paper tp-document-paper-${document.template}`}>
          <header className="tp-document-header">
            <div className="tp-logo-card">
              <input
                ref={logoInput}
                id={`${type}-logo`}
                className="tp-visually-hidden"
                type="file"
                accept="image/png,image/jpeg"
                onChange={async (e) => {
                  const logo = e.target.files?.[0];

                  if (!logo) {
                    return;
                  }

                  if (logo.size > browserToolLimits.maxLogoBytes) {
                    setLogoError('Choose a logo smaller than 2 MB.');
                    return;
                  }

                  const bitmap = await createImageBitmap(logo);
                  const tooLarge =
                    bitmap.width > browserToolLimits.maxLogoDimension ||
                    bitmap.height > browserToolLimits.maxLogoDimension;
                  bitmap.close();

                  if (tooLarge) {
                    setLogoError('Choose a logo no larger than 4096 × 4096 pixels.');
                    return;
                  }

                  if (logoPreview) {
                    URL.revokeObjectURL(logoPreview);
                  }

                  setLogoError('');
                  patch({ logo });
                  setLogoPreview(URL.createObjectURL(logo));
                }}
              />
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Business logo preview" />
                  <div>
                    <label htmlFor={`${type}-logo`}>Replace</label>
                    <button aria-label="Remove logo" onClick={removeLogo}>
                      <X />
                    </button>
                  </div>
                </>
              ) : (
                <label htmlFor={`${type}-logo`}>
                  <ImagePlus aria-hidden="true" />
                  <span>
                    <strong>Add your logo</strong>
                    <small>PNG or JPG · max 2 MB</small>
                  </span>
                </label>
              )}
              {logoError && (
                <p className="tp-error" role="alert">
                  {logoError}
                </p>
              )}
            </div>
            <div className="tp-document-identity">
              <h2>{label.toUpperCase()}</h2>
              <label>
                <span>#</span>
                <input
                  className="tp-document-field"
                  aria-label={`${label} number`}
                  value={document.number}
                  onChange={(e) => patch({ number: e.target.value })}
                />
              </label>
            </div>
          </header>
          <div className="tp-parties">
            <PartyBlock
              title="From"
              party={document.business}
              business
              onChange={(key, value) => patchParty('business', key, value)}
            />
            <PartyBlock
              title={type === 'invoice' ? 'Bill to' : 'Prepared for'}
              party={document.customer}
              onChange={(key, value) => patchParty('customer', key, value)}
            />
          </div>
          <section className="tp-document-meta" aria-label="Document dates">
            <label>
              Issue date
              <input
                className="tp-document-field tp-document-date"
                type="date"
                value={document.issueDate}
                onChange={(e) => patch({ issueDate: e.target.value })}
              />
            </label>
            <label>
              {type === 'invoice' ? 'Due date' : 'Valid until'}
              <input
                className="tp-document-field tp-document-date"
                type="date"
                value={document.dueDate}
                onChange={(e) => patch({ dueDate: e.target.value })}
              />
            </label>
          </section>
          <section className="tp-line-editor" aria-labelledby={`${type}-items-heading`}>
            <div className="tp-line-heading">
              <h3 id={`${type}-items-heading`}>Line items</h3>
              <span>
                {document.items.length} {document.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="tp-line-table-head" aria-hidden="true">
              <span>Item / description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Tax</span>
              <span>Discount</span>
              <span>Amount</span>
              <span />
            </div>
            <div className="tp-line-items">
              {document.items.map((item, index) => (
                <article key={item.id}>
                  <label>
                    <span>Item / description</span>
                    <input
                      className="tp-document-field"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    />
                  </label>
                  {(['quantity', 'rate', 'tax', 'discount'] as const).map((key) => (
                    <label key={key}>
                      <span>{key === 'quantity' ? 'Qty' : key}</span>
                      <input
                        className="tp-document-field"
                        aria-label={`${item.description || 'Item'} ${key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item[key]}
                        onChange={(e) => updateItem(item.id, key, e.target.value)}
                      />
                    </label>
                  ))}
                  <output aria-label={`${item.description || 'Item'} amount`}>
                    {formatCurrency(lineTotal(item).total, document.currency)}
                  </output>
                  <div className="tp-line-actions">
                    <button
                      aria-label={`Move ${item.description || 'item'} up`}
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                    >
                      <ArrowUp />
                    </button>
                    <button
                      aria-label={`Move ${item.description || 'item'} down`}
                      disabled={index === document.items.length - 1}
                      onClick={() => moveItem(index, 1)}
                    >
                      <ArrowDown />
                    </button>
                    <button
                      aria-label={`Remove ${item.description || 'item'}`}
                      disabled={document.items.length === 1}
                      onClick={() =>
                        setDocument((current) => ({
                          ...current,
                          items: current.items.filter((row) => row.id !== item.id),
                        }))
                      }
                    >
                      <Trash2 />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <button
              className="tp-add-line"
              onClick={() => setDocument((current) => ({ ...current, items: [...current.items, makeItem()] }))}
            >
              <Plus /> Add line item
            </button>
          </section>
          <div className="tp-document-closing">
            <section className="tp-document-copy">
              <label>
                Notes
                <textarea
                  className="tp-document-field tp-document-textarea"
                  placeholder="A short thank-you or message for your client"
                  value={document.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                />
              </label>
              <label>
                Terms
                <textarea
                  className="tp-document-field tp-document-textarea"
                  placeholder="Payment terms, delivery details, or validity conditions"
                  value={document.terms}
                  onChange={(e) => patch({ terms: e.target.value })}
                />
              </label>
            </section>
            <TotalsSummary document={document} />
          </div>
        </main>
        <DocumentSettings
          document={document}
          busy={busy}
          onChange={patch}
          onDownload={() => void generate()}
          onReset={reset}
        />
      </div>
    </div>
  );
}
