import type { LoaderFunctionArgs } from '@remix-run/cloudflare';

export function loader({ request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /*?*\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
    {
    headers: { 'Content-Type': 'text/plain' },
    },
  );
}
