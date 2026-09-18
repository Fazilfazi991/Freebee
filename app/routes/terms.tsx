import type { MetaFunction } from '@remix-run/cloudflare';
import { LegalPage } from '~/components/platform/LegalPage';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { platformConfig } from '~/config/platform';
import { absoluteUrl } from '~/lib/seo';
export const links = platformLinks;
export const meta: MetaFunction = () => [
  { title: `Terms of use | ${platformConfig.name}` },
  { name: 'description', content: 'Public-beta terms and important limitations for freebee.world tools.' },
  ...(absoluteUrl('/terms') ? [{ tagName: 'link', rel: 'canonical', href: absoluteUrl('/terms') }] : []),
];
export default function Terms() {
  return (
    <PlatformLayout>
      <LegalPage kind="terms" />
    </PlatformLayout>
  );
}
