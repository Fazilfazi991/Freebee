import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { PhoneChrome, phoneLinks } from '~/components/phones/PhoneChrome';
import { platformConfig } from '~/config/platform';
import { curatedComparison } from '~/lib/phones/comparisons';
import { phoneRepository } from '~/lib/phones/repository';
export const links = phoneLinks;
export function loader({ params }: LoaderFunctionArgs) {
  const item = curatedComparison(params.pair ?? '');

  if (!item) {
    throw new Response('Curated comparison not found', { status: 404 });
  }

  const [a, b] = phoneRepository.comparePhones([item.a, item.b]);

  if (!a || !b) {
    throw new Response('Comparison unavailable', { status: 404 });
  }

  return json({ item, a, b });
}
export const meta: MetaFunction<typeof loader> = ({ data }) =>
  data
    ? [
        { title: `${data.a.model} vs ${data.b.model} specifications | ${platformConfig.name}` },
        { name: 'description', content: `Reviewed factual comparison of ${data.a.model} and ${data.b.model}.` },
        { tagName: 'link', rel: 'canonical', href: `${platformConfig.url}/phones/compare/${data.item.pair}` },
      ]
    : [{ title: 'Comparison not found' }, { name: 'robots', content: 'noindex' }];
export default function CuratedComparison() {
  const { a, b, item } = useLoaderData<typeof loader>();
  const rows = [
    [
      'Display',
      a.display.sizeInches ? `${a.display.sizeInches} inches` : 'Unknown',
      b.display.sizeInches ? `${b.display.sizeInches} inches` : 'Unknown',
    ],
    [
      'Refresh rate',
      a.display.refreshRateMaxHz ? `${a.display.refreshRateMaxHz} Hz` : 'Unknown',
      b.display.refreshRateMaxHz ? `${b.display.refreshRateMaxHz} Hz` : 'Unknown',
    ],
    [
      'Weight',
      a.dimensions.weightG ? `${a.dimensions.weightG} g` : 'Unknown',
      b.dimensions.weightG ? `${b.dimensions.weightG} g` : 'Unknown',
    ],
    ['Storage', a.memory.storageOptionsGb.join(' / '), b.memory.storageOptionsGb.join(' / ')],
  ];

  return (
    <PhoneChrome>
      <main className="ph-main">
        <div className="ph-section-head">
          <h1>
            {a.model} vs {b.model}
          </h1>
          <p>Curated comparison reviewed {item.reviewedAt}. Manufacturer-sourced facts only.</p>
        </div>
        <div className="ph-compare-table">
          <div className="ph-compare-head">
            <span>Specification</span>
            <strong>{a.model}</strong>
            <strong>{b.model}</strong>
          </div>
          {rows.map(([label, av, bv]) => (
            <div className="ph-compare-row" key={label}>
              <span>{label}</span>
              <div>{av}</div>
              <div>{bv}</div>
            </div>
          ))}
        </div>
      </main>
    </PhoneChrome>
  );
}
