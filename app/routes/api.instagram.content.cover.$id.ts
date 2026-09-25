import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';
import { getContent } from '~/lib/integrations/instagram/control-db.server';
import { createSignedContentDownload } from '~/lib/integrations/instagram/content-storage.server';

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const content = await getContent(config, admin.userId, params.id ?? '');
  if (!content?.cover_storage_path) throw new Response('Cover not found', { status: 404 });
  const signedUrl = await createSignedContentDownload(config, content.cover_storage_path, 300);
  const response = await fetch(signedUrl, { cache: 'no-store', redirect: 'error',
    signal: AbortSignal.timeout(10000) });
  if (!response.ok || !response.body) throw new Response('Cover unavailable', { status: 502 });
  return new Response(response.body, { headers: {
    'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=60',
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
  } });
}
