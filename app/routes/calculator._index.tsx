import type { LinksFunction, MetaFunction } from '@remix-run/cloudflare';
import { CategoryPage } from '~/components/platform/CategoryPage';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { platformConfig } from '~/config/platform';
import { categoryBySlug } from '~/lib/tools/registry';

export const links: LinksFunction = platformLinks;
export const meta: MetaFunction = () => [
  { title: `Online calculators | ${platformConfig.name}` },
  {
    name: 'description',
    content:
      'Free browser-local date, health, percentage, interest, loan, mortgage, investment, and calorie calculators.',
  },
  { tagName: 'link', rel: 'canonical', href: `${platformConfig.url}/calculator` },
];
export default function CalculatorIndex() {
  return (
    <PlatformLayout>
      <CategoryPage category={categoryBySlug('calculator')!} />
    </PlatformLayout>
  );
}
