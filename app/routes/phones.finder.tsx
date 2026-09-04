import type { MetaFunction } from '@remix-run/cloudflare';
import { useMemo, useState } from 'react';
import { PhoneChrome, phoneLinks } from '~/components/phones/PhoneChrome';
import { PhoneCard } from '~/components/phones/PhoneCard';
import { platformConfig } from '~/config/platform';
import { phoneRepository } from '~/lib/phones/repository';
import type { PhoneBrand } from '~/lib/phones/schema';
export const links = phoneLinks;
export const meta: MetaFunction = () => [
  { title: `Phone finder | ${platformConfig.name}` },
  { name: 'description', content: 'Filter current phones by factual, manufacturer-published specifications.' },
  { tagName: 'link', rel: 'canonical', href: `${platformConfig.url}/phones/finder` },
];
export default function Finder() {
  const [brand, setBrand] = useState('');
  const [minDisplay, setDisplay] = useState('');
  const [refresh, setRefresh] = useState('');
  const [storage, setStorage] = useState('');
  const [weight, setWeight] = useState('');
  const [battery, setBattery] = useState('');
  const [esim, setEsim] = useState(false);
  const [nfc, setNfc] = useState(false);
  const [ip, setIp] = useState('');
  const [sort, setSort] = useState('model');
  const results = useMemo(() => {
    const matches = phoneRepository.findPhones({
      brand: (brand as PhoneBrand) || undefined,
      minDisplay: Number(minDisplay) || undefined,
      minRefreshRate: Number(refresh) || undefined,
      storageGb: Number(storage) || undefined,
      maxWeightG: Number(weight) || undefined,
      minBatteryMah: Number(battery) || undefined,
      esim: esim || undefined,
      nfc: nfc || undefined,
      ipRating: ip || undefined,
    });
    return [...matches].sort((a, b) =>
      sort === 'weight'
        ? (a.dimensions.weightG ?? Infinity) - (b.dimensions.weightG ?? Infinity)
        : sort === 'display'
          ? (b.display.sizeInches ?? 0) - (a.display.sizeInches ?? 0)
          : a.model.localeCompare(b.model),
    );
  }, [brand, minDisplay, refresh, storage, weight, battery, esim, nfc, ip, sort]);

  return (
    <PhoneChrome>
      <main className="ph-main">
        <div className="ph-section-head">
          <h1>Find your phone</h1>
          <p>Every filter maps to a normalized factual field. Missing data never passes a numeric filter.</p>
        </div>
        <div className="ph-finder">
          <aside>
            <h2>Filters</h2>
            <label>
              Sort results
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="model">Model name</option>
                <option value="weight">Lightest first</option>
                <option value="display">Largest display</option>
              </select>
            </label>
            <label>
              Brand
              <select value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">Any brand</option>
                <option value="apple">Apple</option>
                <option value="samsung">Samsung</option>
                <option value="google">Google</option>
              </select>
            </label>
            <label>
              Minimum display
              <select value={minDisplay} onChange={(e) => setDisplay(e.target.value)}>
                <option value="">Any size</option>
                <option value="6.3">6.3 inches</option>
                <option value="6.7">6.7 inches</option>
                <option value="6.8">6.8 inches</option>
              </select>
            </label>
            <label>
              Refresh rate
              <select value={refresh} onChange={(e) => setRefresh(e.target.value)}>
                <option value="">Any</option>
                <option value="120">120 Hz</option>
              </select>
            </label>
            <label>
              Storage option
              <select value={storage} onChange={(e) => setStorage(e.target.value)}>
                <option value="">Any</option>
                <option value="256">256 GB</option>
                <option value="512">512 GB</option>
                <option value="1024">1 TB</option>
              </select>
            </label>
            <label>
              Maximum weight
              <select value={weight} onChange={(e) => setWeight(e.target.value)}>
                <option value="">Any</option>
                <option value="180">180 g</option>
                <option value="210">210 g</option>
              </select>
            </label>
            <label>
              Minimum battery
              <select value={battery} onChange={(e) => setBattery(e.target.value)}>
                <option value="">Any published capacity</option>
                <option value="4900">4,900 mAh</option>
                <option value="5000">5,000 mAh</option>
              </select>
            </label>
            <label>
              IP rating
              <select value={ip} onChange={(e) => setIp(e.target.value)}>
                <option value="">Any</option>
                <option value="IP68">IP68</option>
              </select>
            </label>
            <label className="ph-check">
              <input type="checkbox" checked={esim} onChange={(e) => setEsim(e.target.checked)} /> eSIM
            </label>
            <label className="ph-check">
              <input type="checkbox" checked={nfc} onChange={(e) => setNfc(e.target.checked)} /> NFC
            </label>
            <button
              onClick={() => {
                setBrand('');
                setDisplay('');
                setRefresh('');
                setStorage('');
                setWeight('');
                setBattery('');
                setEsim(false);
                setNfc(false);
                setIp('');
                setSort('model');
              }}
            >
              Clear filters
            </button>
          </aside>
          <section>
            <p className="ph-count" aria-live="polite">
              {results.length} matches
            </p>
            <div className="ph-grid">
              {results.map((p) => (
                <PhoneCard key={p.id} phone={p} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </PhoneChrome>
  );
}
