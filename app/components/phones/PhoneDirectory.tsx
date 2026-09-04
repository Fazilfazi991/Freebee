import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Phone, PhoneBrand } from '~/lib/phones/schema';
import { PhoneCard } from './PhoneCard';

export function PhoneDirectory({ phones, lockedBrand }: { phones: Phone[]; lockedBrand?: PhoneBrand }) {
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState<PhoneBrand | ''>(lockedBrand ?? '');
  const [storage, setStorage] = useState('');
  const [refresh, setRefresh] = useState('');
  const [size, setSize] = useState('');
  const shown = useMemo(
    () =>
      phones.filter(
        (p) =>
          (!q ||
            `${p.model} ${p.brand} ${p.memory.storageOptionsGb.map((x) => `${x}gb`)} ${p.display.refreshRateMaxHz}hz`
              .toLowerCase()
              .includes(q.toLowerCase())) &&
          (!brand || p.brand === brand) &&
          (!storage || p.memory.storageOptionsGb.includes(Number(storage))) &&
          (!refresh || (p.display.refreshRateMaxHz ?? 0) >= Number(refresh)) &&
          (!size || (p.display.sizeInches ?? 0) >= Number(size)),
      ),
    [phones, q, brand, storage, refresh, size],
  );

  return (
    <>
      <section className="ph-filter" aria-label="Filter phones">
        <label className="ph-search">
          <Search />
          <span className="ph-sr">Search phones</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="iPhone 17, S26 Ultra, 120Hz…" />
        </label>
        <div className="ph-filter-row">
          <SlidersHorizontal aria-hidden="true" />
          {!lockedBrand && (
            <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value as PhoneBrand | '')}>
              <option value="">All brands</option>
              <option value="apple">Apple</option>
              <option value="samsung">Samsung</option>
              <option value="google">Google</option>
            </select>
          )}
          <select aria-label="Screen size" value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">Any screen size</option>
            <option value="6.5">6.5 inches+</option>
            <option value="6.8">6.8 inches+</option>
          </select>
          <select aria-label="Storage" value={storage} onChange={(e) => setStorage(e.target.value)}>
            <option value="">Any storage</option>
            <option value="256">256 GB</option>
            <option value="512">512 GB</option>
            <option value="1024">1 TB</option>
          </select>
          <select aria-label="Refresh rate" value={refresh} onChange={(e) => setRefresh(e.target.value)}>
            <option value="">Any refresh rate</option>
            <option value="120">120 Hz</option>
          </select>
        </div>
      </section>
      <p className="ph-count" aria-live="polite">
        {shown.length} {shown.length === 1 ? 'phone' : 'phones'}
      </p>
      {shown.length ? (
        <div className="ph-grid">
          {shown.map((p) => (
            <PhoneCard key={p.id} phone={p} />
          ))}
        </div>
      ) : (
        <div className="ph-empty">
          <h2>No matching phones</h2>
          <p>Try removing a filter or using a broader search.</p>
        </div>
      )}
    </>
  );
}
