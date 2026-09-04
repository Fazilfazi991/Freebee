import type { MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { PhoneChrome, phoneLinks } from '~/components/phones/PhoneChrome';
import { PhoneDirectory } from '~/components/phones/PhoneDirectory';
import { platformConfig } from '~/config/platform';
import { phoneRepository } from '~/lib/phones/repository';
export const links = phoneLinks;
export const meta: MetaFunction = () => [
  { title: `Phone specifications & comparisons | ${platformConfig.name}` },
  {
    name: 'description',
    content: 'Compare factual Apple, Samsung, and Google Pixel specifications from official manufacturer sources.',
  },
  { tagName: 'link', rel: 'canonical', href: `${platformConfig.url}/phones` },
];
export default function Phones() {
  const phones = phoneRepository.getPhones();
  return (
    <PhoneChrome>
      <header className="ph-hero">
        <div>
          <h1>
            Phone facts,
            <br />
            properly sourced.
          </h1>
          <p>
            Search and compare specifications traced to official manufacturer pages. No retailer copy, guessed values,
            or paid rankings.
          </p>
          <div className="ph-hero-actions">
            <Link className="ph-primary" to="/phones/compare">
              Compare two phones <ArrowRight />
            </Link>
            <Link to="/phones/finder">Open phone finder</Link>
          </div>
        </div>
        <aside>
          <ShieldCheck />
          <strong>Manufacturer-sourced</strong>
          <span>{phones.length} current phones · Apple AE · Samsung AE · Google US</span>
          <p>Regional details remain separate. Unknown values stay unknown.</p>
        </aside>
      </header>
      <main className="ph-main">
        <div className="ph-section-head">
          <h2>Current phones</h2>
          <p>Focused proof-of-concept set, last verified 4 September 2026.</p>
        </div>
        <PhoneDirectory phones={phones} />
      </main>
    </PhoneChrome>
  );
}
