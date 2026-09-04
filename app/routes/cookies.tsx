import type { MetaFunction } from '@remix-run/cloudflare';
import { LegalPage } from '~/components/platform/LegalPage';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { platformConfig } from '~/config/platform';
export const links = platformLinks;
export const meta: MetaFunction = () => [
  { title: `Cookie notice | ${platformConfig.name}` },
  { name: 'description', content: 'Current cookie and browser-storage use on the public tools.' },
];
export default function Cookies() {
  return (
    <PlatformLayout>
      <LegalPage kind="cookies" />
    </PlatformLayout>
  );
}
