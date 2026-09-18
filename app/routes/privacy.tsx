import type { MetaFunction } from '@remix-run/cloudflare';
import { LegalPage } from '~/components/platform/LegalPage';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { platformConfig } from '~/config/platform';
import { absoluteUrl } from '~/lib/seo';
export const links = platformLinks;
export const meta: MetaFunction = () => [
  { title: `Privacy policy | ${platformConfig.name}` },
  { name: 'description', content: 'How browser-local tools, storage, analytics, and cookies are handled.' },
  ...(absoluteUrl('/privacy') ? [{ tagName: 'link', rel: 'canonical', href: absoluteUrl('/privacy') }] : []),
];
export default function Privacy() {
  return (
    <PlatformLayout>
      <LegalPage kind="privacy" />
    </PlatformLayout>
  );
}
