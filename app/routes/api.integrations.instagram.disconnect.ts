import { json, redirect, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig, isSameOriginPost } from '~/lib/integrations/instagram/config.server';
import { disconnectConnection } from '~/lib/integrations/instagram/supabase.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (!isSameOriginPost(request)) return json({ error: 'Forbidden' }, { status: 403 });
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  await disconnectConnection(config, admin.userId);
  return redirect('/dashboard/integrations/instagram?disconnected=1', { headers: privateHeaders(admin) });
}

export function loader() {
  return json({ error: 'Method not allowed' }, { status: 405 });
}
