import type { LinksFunction, MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { platformConfig } from '~/config/platform';

export const links: LinksFunction = platformLinks;
export const meta: MetaFunction = () => [
  { title: `Guides | ${platformConfig.name}` },
  { name: 'description', content: 'Practical guides for using calculators, PDF tools, business tools, and browser utilities.' },
  { name: 'robots', content: 'noindex, follow' },
];

export default function BlogIndex() {
  return (
    <PlatformLayout>
      <div className="tp-page">
        <section className="tp-category-head">
          <p>Guides</p>
          <h1>Practical answers for everyday tool tasks.</h1>
          <span>Reviewed guides will appear here as they are written and linked to a working tool.</span>
          <p>
            <Link to="/tools">Browse the working tools</Link>
          </p>
        </section>
      </div>
    </PlatformLayout>
  );
}
