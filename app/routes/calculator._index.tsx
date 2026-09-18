import type { LinksFunction, MetaFunction } from '@remix-run/cloudflare';
import { CategoryPage } from '~/components/platform/CategoryPage';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { platformConfig } from '~/config/platform';
import { categoryBySlug } from '~/lib/tools/registry';
import { absoluteUrl, breadcrumbSchema } from '~/lib/seo';

export const links: LinksFunction = platformLinks;
export const meta: MetaFunction = () => [
  { title: `Online calculators | ${platformConfig.name}` },
  {
    name: 'description',
    content:
      'Free browser-local date, health, percentage, interest, loan, mortgage, investment, and calorie calculators.',
  },
  ...(absoluteUrl('/calculator') ? [{ tagName: 'link', rel: 'canonical', href: absoluteUrl('/calculator') }] : []),
];
export default function CalculatorIndex() {
  return (
    <PlatformLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema([{ name: 'Tools', path: '/tools' }, { name: 'Calculators', path: '/calculator' }])),
        }}
      />
      <CategoryPage category={categoryBySlug('calculator')!} />
    </PlatformLayout>
  );
}
