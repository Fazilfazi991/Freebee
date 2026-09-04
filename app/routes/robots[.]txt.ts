import type { LoaderFunctionArgs } from '@remix-run/cloudflare';

export function loader({ request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
