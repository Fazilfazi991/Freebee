import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { platformConfig } from '~/config/platform';
import { categories, tools } from '~/lib/tools/registry';

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin || platformConfig.url;
  const paths = [
    '',
    'tools',
    'privacy',
    'terms',
    'cookies',
    ...categories.map((c) => c.id),
    ...tools.filter((t) => t.engine === 'browser').map((t) => t.slug),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${origin}/${path}</loc></url>`).join('')}</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
}
