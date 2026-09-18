import type { LinksFunction, MetaFunction } from '@remix-run/cloudflare';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { ToolCard } from '~/components/platform/ToolCard';
import { GlobalToolSearch } from '~/components/platform/ToolSearch';
import { platformConfig } from '~/config/platform';
import { publicIndexableTools } from '~/lib/seo';
import { absoluteUrl, breadcrumbSchema } from '~/lib/seo';
export const links: LinksFunction = platformLinks;
export const meta: MetaFunction = () => [
  { title: `All tools | ${platformConfig.name}` },
  { name: 'description', content: 'Browse file, media, business, developer, AI, and web tools.' },
  ...(absoluteUrl('/tools') ? [{ tagName: 'link', rel: 'canonical', href: absoluteUrl('/tools') }] : []),
];
export default function ToolsIndex() {
  return (
    <PlatformLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema([{ name: 'Tools', path: '/tools' }])) ,
        }}
      />
      <div className="tp-page">
        <section className="tp-category-head">
          <p>Tool directory</p>
          <h1>One catalog. Less hunting.</h1>
          <span>Search every utility or browse the complete collection.</span>
          <div className="tp-page-search">
            <GlobalToolSearch />
          </div>
        </section>
        <div className="tp-tool-grid">
          {publicIndexableTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </PlatformLayout>
  );
}
