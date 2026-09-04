import type { MetaFunction } from '@remix-run/cloudflare';
import { useSearchParams } from '@remix-run/react';
import { PhoneChrome, phoneLinks } from '~/components/phones/PhoneChrome';
import { platformConfig } from '~/config/platform';
import { format } from '~/lib/phones/format';
import { phoneRepository } from '~/lib/phones/repository';
export const links = phoneLinks;
export const meta: MetaFunction = () => [
  { title: `Compare phones | ${platformConfig.name}` },
  { name: 'description', content: 'Compare two phones using manufacturer-sourced specifications.' },
  { name: 'robots', content: 'noindex, follow' },
  { tagName: 'link', rel: 'canonical', href: `${platformConfig.url}/phones/compare` },
];
export default function Compare() {
  const phones = phoneRepository.getPhones();
  const [params, setParams] = useSearchParams();
  const a = phones.find((p) => p.slug === (params.get('a') ?? phones[0].slug)) ?? phones[0];
  const b = phones.find((p) => p.slug === (params.get('b') ?? phones[3].slug)) ?? phones[3];
  const set = (key: string, value: string) => {
    const n = new URLSearchParams(params);
    n.set(key, value);
    setParams(n);
  };
  const rows = [
    ['Display', format.display(a.display.sizeInches), format.display(b.display.sizeInches)],
    ['Technology', a.display.technology, b.display.technology],
    ['Refresh rate', format.hz(a.display.refreshRateMaxHz), format.hz(b.display.refreshRateMaxHz)],
    [
      'Weight',
      format.weight(a.dimensions.weightG),
      format.weight(b.dimensions.weightG),
      a.dimensions.weightG && b.dimensions.weightG
        ? a.dimensions.weightG < b.dimensions.weightG
          ? 'A is lighter'
          : b.dimensions.weightG < a.dimensions.weightG
            ? 'B is lighter'
            : 'Same weight'
        : undefined,
    ],
    ['Chipset', a.performance.chipset, b.performance.chipset],
    ['Storage', format.storage(a.memory.storageOptionsGb), format.storage(b.memory.storageOptionsGb)],
    [
      'Main camera',
      a.rearCameras[0]?.megapixels ? `${a.rearCameras[0].megapixels} MP` : 'Unknown',
      b.rearCameras[0]?.megapixels ? `${b.rearCameras[0].megapixels} MP` : 'Unknown',
    ],
    ['Battery', format.battery(a.battery.capacityMah), format.battery(b.battery.capacityMah)],
    ['Wi-Fi', a.connectivity.wifi, b.connectivity.wifi],
    ['Software', a.software.operatingSystem, b.software.operatingSystem],
  ];

  return (
    <PhoneChrome>
      <main className="ph-main ph-compare">
        <div className="ph-section-head">
          <h1>Compare phones</h1>
          <p>Side-by-side facts, without an invented overall winner.</p>
        </div>
        <div className="ph-pickers">
          <label>
            Phone A
            <select value={a.slug} onChange={(e) => set('a', e.target.value)}>
              {phones.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.model}
                </option>
              ))}
            </select>
          </label>
          <span>versus</span>
          <label>
            Phone B
            <select value={b.slug} onChange={(e) => set('b', e.target.value)}>
              {phones.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.model}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ph-compare-table">
          <div className="ph-compare-head">
            <span>Specification</span>
            <strong>{a.model}</strong>
            <strong>{b.model}</strong>
          </div>
          {rows.map(([label, av, bv, note]) => (
            <div className="ph-compare-row" key={label}>
              <span>{label}</span>
              <div>
                {av ?? 'Unknown'}
                {note === 'A is lighter' && <small>Lighter</small>}
              </div>
              <div>
                {bv ?? 'Unknown'}
                {note === 'B is lighter' && <small>Lighter</small>}
              </div>
            </div>
          ))}
        </div>
        <p className="ph-compare-note">
          This dynamic comparison is intentionally noindex. Future curated comparison pages can use stable, indexable
          URLs after editorial review.
        </p>
      </main>
    </PhoneChrome>
  );
}
