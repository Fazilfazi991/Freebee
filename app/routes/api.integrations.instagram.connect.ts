import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';
import { beginInstagramAuthorization } from '~/lib/integrations/instagram/oauth.server';
import { getInstagramAccount } from '~/lib/integrations/instagram/supabase.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const targetAccountId = new URL(request.url).searchParams.get('accountId');
  const target = targetAccountId ? await getInstagramAccount(config, admin.userId, targetAccountId) : null;
  if (targetAccountId && !target) return redirect('/dashboard/instagram/accounts?error=account_not_found', { headers: privateHeaders(admin) });
  const authorizationUrl = await beginInstagramAuthorization(config, admin, target?.instagram_user_id);
  return redirect(authorizationUrl, { headers: privateHeaders(admin) });
}
