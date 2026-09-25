import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getAdmin, privateHeaders } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const admin = await getAdmin(request, getInstagramConfig(context));
  if (!admin) return redirect('/dashboard/login', { headers: { 'Cache-Control': 'private, no-store' } });
  return redirect('/dashboard/integrations/instagram', { headers: privateHeaders(admin) });
}
