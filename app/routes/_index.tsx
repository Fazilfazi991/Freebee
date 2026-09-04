import type { LinksFunction, MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { ArrowRight, Check, Globe2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { GlobalToolSearch } from '~/components/platform/ToolSearch';
import { ToolCard } from '~/components/platform/ToolCard';
import { ToolIcon } from '~/components/platform/Icon';
import { platformConfig } from '~/config/platform';
import { categories, tools } from '~/lib/tools/registry';

export const links: LinksFunction = platformLinks;
export const meta: MetaFunction = () => [
  { title: `${platformConfig.name} — Useful tools, one calm workspace` },
  { name: 'description', content: platformConfig.description },
  { property: 'og:title', content: platformConfig.name },
  { property: 'og:description', content: platformConfig.description },
  { name: 'twitter:card', content: 'summary_large_image' },
  { tagName: 'link', rel: 'canonical', href: platformConfig.url },
];

export default function PlatformHome() {
  const featured = tools.filter((tool) => tool.featured && tool.engine === 'browser').slice(0, 10);
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: platformConfig.name,
    url: platformConfig.url,
    description: platformConfig.description,
  };

  return (
    <PlatformLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <section className="tp-hero">
        <div className="tp-hero-copy">
          <h1>Everything you need, in one browser.</h1>
          <p>Convert, compress, inspect, and create with focused tools that run in your browser.</p>
          <GlobalToolSearch />
          <div className="tp-popular">
            <span>Popular:</span>
            {featured.slice(0, 4).map((tool) => (
              <Link key={tool.id} to={`/${tool.slug}`}>
                {tool.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="tp-hero-panel" aria-label="Platform capabilities">
          <div className="tp-orbit">
            <span>
              <ToolIcon name="FileText" size={24} />
            </span>
            <span>
              <ToolIcon name="Image" size={24} />
            </span>
            <span>
              <ToolIcon name="Braces" size={24} />
            </span>
            <div>
              <strong>{tools.length}</strong>
              <small>
                useful tools,
                <br />
                growing carefully
              </small>
            </div>
          </div>
          <p>
            <Check size={17} /> {tools.filter((tool) => tool.engine !== 'planned').length} working tools with clear
            processing boundaries.
          </p>
        </div>
      </section>
      <section id="categories" className="tp-section tp-categories">
        <div className="tp-section-head">
          <h2>Find your starting point</h2>
          <p>Eight practical collections, shaped around the job in front of you.</p>
        </div>
        <div className="tp-category-grid">
          {categories.map((category) => (
            <Link key={category.id} to={`/${category.id}`}>
              <span>
                <ToolIcon name={category.icon} />
              </span>
              <strong>{category.name}</strong>
              <p>{category.description}</p>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="tp-section">
        <div className="tp-section-head">
          <h2>Popular tools</h2>
          <Link to="/tools">
            Browse all tools <ArrowRight size={17} />
          </Link>
        </div>
        <div className="tp-tool-grid">
          {featured.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>
      <section className="tp-section tp-why">
        <div>
          <h2>A quieter way to get small things done.</h2>
          <p>No installation maze. No overloaded dashboards. Just focused tools with clear boundaries.</p>
        </div>
        <div className="tp-principles">
          <article>
            <Zap />
            <h3>Fast by default</h3>
            <p>Light interfaces now, with heavier engines loaded only where they belong.</p>
          </article>
          <article>
            <ShieldCheck />
            <h3>Clear about privacy</h3>
            <p>Every tool will explain whether work stays local or needs a server.</p>
          </article>
          <article>
            <Globe2 />
            <h3>Ready everywhere</h3>
            <p>Built for touch, keyboard, small screens, and wide desktops.</p>
          </article>
          <article>
            <Sparkles />
            <h3>Useful before clever</h3>
            <p>AI sits alongside everyday utilities, never in the way of them.</p>
          </article>
        </div>
      </section>
      <section className="tp-discover">
        <h2>Your next task is probably already here.</h2>
        <p>
          Search the catalog or explore a category. New engines can be added without rebuilding the platform around
          them.
        </p>
        <Link className="tp-primary" to="/tools">
          Explore all tools <ArrowRight size={18} />
        </Link>
      </section>
    </PlatformLayout>
  );
}
