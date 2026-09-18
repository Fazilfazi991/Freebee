import { Link } from '@remix-run/react';
import type { LinksFunction, MetaFunction } from '@remix-run/cloudflare';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { platformConfig } from '~/config/platform';

export const links: LinksFunction = platformLinks;

export const meta: MetaFunction = () => [
  { title: `AI Website Builder | ${platformConfig.name}` },
  { name: 'description', content: 'Build and shape a website with a focused AI-assisted workspace.' },
  { tagName: 'link', rel: 'canonical', href: `${platformConfig.url}/builder` },
];

export default function BuilderRoute() {
  return (
    <PlatformLayout>
      <div className="tp-page">
        <section className="tp-tool-heading">
          <div>
            <span className="tp-home-eyebrow">AI / Website Builder</span>
            <h1>Shape a website from a clear starting point.</h1>
            <p>
              The website builder remains part of the platform while the public catalog stays focused on practical,
              browser-based tools.
            </p>
          </div>
          <span className="tp-status ready">Available</span>
        </section>
        <section className="tp-workspace" aria-label="Website builder workspace">
          <Sparkles size={32} aria-hidden="true" />
          <h2>Start with the tools you need</h2>
          <p>Use the shared tools platform to prepare content, images, documents, and data for your site.</p>
          <Link className="tp-primary" to="/tools">
            Explore all tools <ArrowRight size={18} />
          </Link>
        </section>
      </div>
    </PlatformLayout>
  );
}
