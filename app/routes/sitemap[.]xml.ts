import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { platformConfig } from '~/config/platform';
import { publicIndexableCategories, publicIndexableTools } from '~/lib/seo';

const escapeXml = (value: string) =>
  value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;').replace(/'/gu, '&apos;');

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = platformConfig.url || new URL(request.url).origin;
  const paths = [
    { path: '', lastmod: '2026-09-18' },
    { path: 'tools', lastmod: '2026-09-18' },
    { path: 'privacy' },
    { path: 'terms' },
    { path: 'cookies' },
    ...publicIndexableCategories.map((category) => ({ path: category.id, lastmod: '2026-09-18' })),
    ...publicIndexableTools.map((tool) => ({ path: tool.slug, lastmod: '2026-09-18' })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths
    .map(({ path, lastmod }) => `<url><loc>${escapeXml(`${origin}/${path}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('')}</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
}
