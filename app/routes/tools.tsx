import type { LinksFunction, MetaFunction } from '@remix-run/cloudflare';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { ToolCard } from '~/components/platform/ToolCard';
import { GlobalToolSearch } from '~/components/platform/ToolSearch';
import { platformConfig } from '~/config/platform';
import { tools } from '~/lib/tools/registry';
export const links: LinksFunction = platformLinks;
export const meta: MetaFunction = () => [
  { title: `All tools | ${platformConfig.name}` },
  { name: 'description', content: 'Browse file, media, business, developer, AI, and web tools.' },
];
export default function ToolsIndex() {
  return (
    <PlatformLayout>
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
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </PlatformLayout>
  );
}
