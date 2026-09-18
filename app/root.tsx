import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import { createHead } from 'remix-island';
import { platformConfig } from './config/platform';
import { AnalyticsBridge } from './components/platform/AnalyticsBridge';
import { AnalyticsConsent } from './components/platform/AnalyticsConsent';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: platformConfig.favicon,
    type: 'image/png',
    sizes: '32x32',
  },
  {
    rel: 'apple-touch-icon',
    href: '/brand/apple-touch-icon.png',
    sizes: '180x180',
  },
  {
    rel: 'icon',
    href: '/brand/freebee-icon-192.png',
    type: 'image/png',
    sizes: '192x192',
  },
  {
    rel: 'icon',
    href: '/brand/freebee-icon-512.png',
    type: 'image/png',
    sizes: '512x512',
  },
];

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

export default function App() {
  return (
    <>
      <Outlet />
      <AnalyticsBridge />
      <AnalyticsConsent />
    </>
  );
}
