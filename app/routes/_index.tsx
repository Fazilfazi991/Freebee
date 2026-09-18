import type { LinksFunction, MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { ArrowRight, LockKeyhole, Monitor, Zap } from 'lucide-react';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { GlobalToolSearch } from '~/components/platform/ToolSearch';
import { ToolCard } from '~/components/platform/ToolCard';
import { ToolIcon } from '~/components/platform/Icon';
import { platformConfig } from '~/config/platform';
import { categories, tools, toolsForCategory } from '~/lib/tools/registry';
import type { ToolDefinition } from '~/lib/tools/types';
import { absoluteUrl } from '~/lib/seo';

export const links: LinksFunction = platformLinks;
export const meta: MetaFunction = () => [
  { title: `${platformConfig.name} — ${platformConfig.tagline}` },
  { name: 'description', content: platformConfig.description },
  { property: 'og:site_name', content: platformConfig.name },
  { property: 'og:title', content: platformConfig.name },
  { property: 'og:description', content: platformConfig.description },
  { property: 'og:type', content: 'website' },
  ...(absoluteUrl(platformConfig.logo) ? [{ property: 'og:image', content: absoluteUrl(platformConfig.logo) }] : []),
  { name: 'twitter:card', content: 'summary_large_image' },
  ...(absoluteUrl('/') ? [{ tagName: 'link', rel: 'canonical', href: absoluteUrl('/') }] : []),
];

const pickTools = (slugs: string[], limit = slugs.length) =>
  slugs
    .map((slug) => tools.find((tool) => tool.slug === slug && tool.engine === 'browser'))
    .filter((tool): tool is ToolDefinition => Boolean(tool))
    .slice(0, limit);

const categoryIds = ['pdf', 'image', 'calculator', 'developer', 'business', 'video'] as const;

export default function PlatformHome() {
  const popular = pickTools([
    'merge-pdf', 'compress-image', 'calculator/loan-calculator', 'qr-generator',
    'json-formatter', 'word-counter', 'resize-image', 'image-to-text',
  ]);
  const calculators = pickTools([
    'calculator/loan-calculator', 'calculator/mortgage-calculator', 'calculator/compound-interest-calculator',
    'calculator/bmi-calculator', 'calculator/calorie-calculator', 'calculator/percentage-calculator',
  ]);
  const pdfTools = pickTools(['merge-pdf', 'split-pdf', 'jpg-to-pdf', 'pdf-to-jpg', 'organize-pdf', 'rotate-pdf']);
  const imageTools = pickTools(['compress-image', 'resize-image', 'jpg-to-png', 'png-to-jpg', 'jpg-to-webp']);
  const websiteSchema = {
    '@context': 'https://schema.org', '@type': 'WebSite', name: platformConfig.name,
    alternateName: 'Freebee World',
    ...(absoluteUrl('/') ? { url: absoluteUrl('/') } : {}), description: platformConfig.description,
    ...(absoluteUrl(platformConfig.logo)
      ? { publisher: { '@type': 'Organization', name: platformConfig.name, logo: absoluteUrl(platformConfig.logo) } }
      : {}),
  };

  return (
    <PlatformLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <div className="tp-home">
        <section className="tp-home-hero" aria-labelledby="home-title">
          <div className="tp-home-hero-inner">
            <h1 id="home-title">Useful tools, made simple.</h1>
            <p className="tp-home-lede">Free, fast tools for PDFs, images, calculations and everyday tasks.</p>
            <GlobalToolSearch />
            <div className="tp-quick-links" aria-label="Quick links">
              <span>Try</span>
              {popular.slice(0, 5).map((tool) => <Link key={tool.id} to={`/${tool.slug}`}>{tool.name}</Link>)}
            </div>
          </div>
        </section>

        <section className="tp-home-section" aria-labelledby="popular-title">
          <div className="tp-home-section-head"><div><p className="tp-home-eyebrow">Start here</p><h2 id="popular-title">Popular tools</h2></div><Link className="tp-section-link" to="/tools">View all tools <ArrowRight size={16} /></Link></div>
          <div className="tp-tool-grid tp-home-tool-grid">{popular.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div>
        </section>

        <section className="tp-home-section tp-browse-section" aria-labelledby="browse-title">
          <div className="tp-home-section-head"><div><p className="tp-home-eyebrow">Explore the collection</p><h2 id="browse-title">Browse tools</h2></div></div>
          <div className="tp-browse-grid">
            {categoryIds.map((id) => {
              const category = categories.find((item) => item.id === id);
              if (!category) return null;
              const count = toolsForCategory(category.id).filter((tool) => tool.engine === 'browser').length;
              return <Link className="tp-category-card" key={category.id} to={`/${category.id}`}><span className="tp-category-icon"><ToolIcon name={category.icon} size={19} /></span><span className="tp-category-copy"><strong>{category.name}</strong><small>{count} {count === 1 ? 'tool' : 'tools'}</small></span><ArrowRight size={17} aria-hidden="true" /></Link>;
            })}
          </div>
        </section>

        <section className="tp-home-section tp-feature-section" aria-labelledby="calculators-title">
          <div className="tp-home-section-head"><div><p className="tp-home-eyebrow">Numbers, without the spreadsheet</p><h2 id="calculators-title">Calculators</h2></div><Link className="tp-section-link" to="/calculator">View all calculators <ArrowRight size={16} /></Link></div>
          <div className="tp-chip-row" aria-label="Calculator categories"><span className="is-active">All calculators</span><span>Finance</span><span>Health</span><span>Math</span></div>
          <div className="tp-tool-grid tp-home-tool-grid">{calculators.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div>
        </section>

        <section className="tp-home-section tp-split-section" aria-labelledby="pdf-title">
          <div className="tp-home-subsection"><div className="tp-home-section-head"><div><p className="tp-home-eyebrow">Documents</p><h2 id="pdf-title">Work with PDFs</h2></div><Link className="tp-section-link" to="/pdf" aria-label="View all PDF tools">All PDF tools <ArrowRight size={16} /></Link></div><div className="tp-compact-list">{pdfTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div></div>
          <div className="tp-home-subsection" aria-labelledby="image-title"><div className="tp-home-section-head"><div><p className="tp-home-eyebrow">Visuals</p><h2 id="image-title">Image tools</h2></div><Link className="tp-section-link" to="/image" aria-label="View all image tools">All image tools <ArrowRight size={16} /></Link></div><div className="tp-compact-list">{imageTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div></div>
        </section>

        <section className="tp-builder-promo" aria-labelledby="builder-title"><div><p className="tp-home-eyebrow">Also from freebee.world</p><h2 id="builder-title">Build something with AI</h2><p>Describe what you want and generate a working website.</p></div><Link className="tp-builder-link" to="/builder">Open AI Builder <ArrowRight size={16} /></Link></section>
        <section className="tp-builder-note" aria-labelledby="privacy-title"><div className="tp-builder-note-copy"><p className="tp-home-eyebrow">A little peace of mind</p><h2 id="privacy-title">Your files stay with you.</h2><p>Many PDF and image tools process files directly in your browser. Each tool explains its processing boundary before you begin.</p></div><div className="tp-privacy-points"><span><Monitor size={17} /> Browser processing</span><span><Zap size={17} /> No installation</span><span><LockKeyhole size={17} /> Clear privacy notes</span></div></section>
      </div>
    </PlatformLayout>
  );
}
