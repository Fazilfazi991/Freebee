import type { LinksFunction } from '@remix-run/cloudflare';
import { Link, NavLink } from '@remix-run/react';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import stylesUrl from '~/styles/phones.css?url';
export const phoneLinks: LinksFunction = () => [...platformLinks(), { rel: 'stylesheet', href: stylesUrl }];
export function PhoneChrome({ children }: { children: React.ReactNode }) {
  return (
    <PlatformLayout>
      <div className="ph-shell">
        <nav className="ph-nav" aria-label="Phone section">
          <Link to="/phones" className="ph-wordmark">
            Phone index
          </Link>
          <div>
            <NavLink to="/phones/apple">Apple</NavLink>
            <NavLink to="/phones/samsung">Samsung</NavLink>
            <NavLink to="/phones/google">Google Pixel</NavLink>
            <NavLink to="/phones/compare">Compare</NavLink>
            <NavLink to="/phones/finder">Finder</NavLink>
          </div>
        </nav>
        {children}
      </div>
    </PlatformLayout>
  );
}
