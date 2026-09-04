import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { Link, useLoaderData } from '@remix-run/react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { PhoneChrome, phoneLinks } from '~/components/phones/PhoneChrome';
import { platformConfig } from '~/config/platform';
import { format } from '~/lib/phones/format';
import { phoneRepository } from '~/lib/phones/repository';
export const links = phoneLinks;
export function loader({ params }: LoaderFunctionArgs) {
  const phone = phoneRepository.getPhone(params.brand ?? '', params.slug ?? '');

  if (!phone) {
    throw new Response('Phone not found', { status: 404 });
  }

  return json({ phone });
}
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [{ title: 'Phone not found' }];
  }

  const p = data.phone;
  const description = `${p.model} specifications: ${format.display(p.display.sizeInches)}, ${format.hz(p.display.refreshRateMaxHz)}, ${format.storage(p.memory.storageOptionsGb)}, and official-source details.`;

  return [
    { title: `${p.model} Specifications, Features & Comparison | ${platformConfig.name}` },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: `${platformConfig.url}/phones/${p.brand}/${p.slug}` },
    { property: 'og:title', content: `${p.model} specifications` },
    { property: 'og:description', content: description },
  ];
};

const groups = (p: ReturnType<typeof useLoaderData<typeof loader>>['phone']) => [
  {
    name: 'Design',
    rows: [
      ['Colors', p.design.colors.join(', ')],
      ['Materials', p.design.materials],
      ['Protection', p.design.ipRating],
      [
        'Dimensions',
        p.dimensions.heightMm
          ? `${p.dimensions.heightMm} × ${p.dimensions.widthMm} × ${p.dimensions.depthMm} mm`
          : undefined,
      ],
      ['Weight', format.weight(p.dimensions.weightG)],
    ],
  },
  {
    name: 'Display',
    rows: [
      ['Size', format.display(p.display.sizeInches)],
      ['Technology', p.display.technology],
      ['Resolution', format.resolution(p.display.resolutionWidth, p.display.resolutionHeight)],
      [
        'Refresh rate',
        p.display.refreshRateMaxHz
          ? `${p.display.refreshRateMinHz ? `${p.display.refreshRateMinHz}–` : 'Up to '}${p.display.refreshRateMaxHz} Hz`
          : undefined,
      ],
      ['Peak brightness', p.display.brightnessPeakNits ? `${p.display.brightnessPeakNits} nits` : undefined],
      ['HDR', p.display.hdr ? 'Yes' : undefined],
    ],
  },
  {
    name: 'Performance & memory',
    rows: [
      ['Chipset', p.performance.chipset],
      ['CPU', p.performance.cpu],
      ['GPU', p.performance.gpu],
      ['RAM', p.memory.ramGb ? `${p.memory.ramGb} GB` : undefined],
      ['Storage', format.storage(p.memory.storageOptionsGb)],
    ],
  },
  {
    name: 'Cameras',
    rows: [
      [
        'Rear',
        p.rearCameras
          .map(
            (c) =>
              `${c.role ?? 'Camera'} ${c.megapixels ?? '—'} MP${c.opticalZoom ? ` · ${c.opticalZoom}× optical` : ''}`,
          )
          .join(' / '),
      ],
      ['Front', p.frontCameras.map((c) => `${c.megapixels ?? '—'} MP ${c.role ?? ''}`).join(' / ')],
    ],
  },
  {
    name: 'Battery',
    rows: [
      ['Capacity', format.battery(p.battery.capacityMah)],
      ['Video playback', p.battery.videoPlaybackHours ? `Up to ${p.battery.videoPlaybackHours} hours` : undefined],
      [
        'Wireless charging',
        p.battery.wirelessChargingWatts ? format.watts(p.battery.wirelessChargingWatts) : undefined,
      ],
      ['Fast charge', p.battery.fastChargeClaim],
    ],
  },
  {
    name: 'Connectivity & software',
    rows: [
      ['Cellular', p.connectivity.cellular],
      ['Wi-Fi', p.connectivity.wifi],
      ['Bluetooth', p.connectivity.bluetooth],
      ['NFC', p.connectivity.nfc ? 'Yes' : undefined],
      ['USB', p.connectivity.usb],
      ['SIM', p.sim.esim ? `eSIM${p.sim.dualSim ? ' · Dual SIM' : ''}` : undefined],
      ['Operating system', p.software.operatingSystem],
      ['Updates', p.software.updatePolicy],
    ],
  },
];

export default function Detail() {
  const { phone: p } = useLoaderData<typeof loader>();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.model,
    brand: { '@type': 'Brand', name: p.source.manufacturer },
    category: 'Smartphone',
    url: `${platformConfig.url}/phones/${p.brand}/${p.slug}`,
  };

  return (
    <PhoneChrome>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main className="ph-detail">
        <nav className="ph-crumb" aria-label="Breadcrumb">
          <Link to="/phones">Phones</Link>
          <span>/</span>
          <Link to={`/phones/${p.brand}`}>{p.source.manufacturer}</Link>
          <span>/</span>
          <span>{p.model}</span>
        </nav>
        <header className="ph-detail-hero">
          <div>
            <p className="ph-source-badge">
              <CheckCircle2 /> Specifications sourced from manufacturer
            </p>
            <h1>{p.model}</h1>
            <p>
              {p.series} · {p.source.region} source · Verified{' '}
              {new Date(p.source.lastCheckedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <Link className="ph-primary" to={`/phones/compare?a=${p.slug}`}>
              Add to comparison
            </Link>
          </div>
          <div className={`ph-device ph-device-large ph-${p.brand}`} aria-hidden="true">
            <span></span>
          </div>
        </header>
        <section className="ph-key">
          <div>
            <span>Display</span>
            <strong>{format.display(p.display.sizeInches)}</strong>
            <small>{p.display.technology}</small>
          </div>
          <div>
            <span>Chip</span>
            <strong>{p.performance.chipset ?? 'Not published'}</strong>
          </div>
          <div>
            <span>Storage</span>
            <strong>{format.storage(p.memory.storageOptionsGb)}</strong>
          </div>
          <div>
            <span>Weight</span>
            <strong>{format.weight(p.dimensions.weightG)}</strong>
          </div>
        </section>
        <div className="ph-spec-layout">
          <article>
            <h2>Full specifications</h2>
            {groups(p).map((g) => (
              <section className="ph-spec-group" key={g.name}>
                <h3>{g.name}</h3>
                <dl>
                  {g.rows
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>
              </section>
            ))}
          </article>
          <aside className="ph-source-panel">
            <h2>Source record</h2>
            <p>
              <CheckCircle2 /> {p.quality}
            </p>
            <dl>
              <dt>Manufacturer</dt>
              <dd>{p.source.manufacturer}</dd>
              <dt>Region</dt>
              <dd>{p.source.region}</dd>
              <dt>Last checked</dt>
              <dd>{new Date(p.source.lastCheckedAt).toLocaleDateString()}</dd>
              <dt>Data limitation</dt>
              <dd>Only facts published on the cited regional page are included. Unknown fields are not inferred.</dd>
            </dl>
            <a href={p.source.officialUrl} rel="noreferrer" target="_blank">
              Official specification page <ArrowUpRight />
            </a>
          </aside>
        </div>
      </main>
    </PhoneChrome>
  );
}
