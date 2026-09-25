import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';
import { finishInstagramAuthorization, validateAndConsumeState } from '~/lib/integrations/instagram/oauth.server';
import { IntegrationFailure } from '~/lib/integrations/instagram/supabase.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const query = new URL(request.url).searchParams;
  const headers = privateHeaders(admin);
  try {
    const targetInstagramUserId = await validateAndConsumeState(config, admin, query.get('state'));
    if (query.has('error')) throw new IntegrationFailure('authorization_denied');
    await finishInstagramAuthorization(config, admin, query.get('code'), targetInstagramUserId);
    return redirect('/dashboard/integrations/instagram?connected=1', { headers });
  } catch (error) {
    const allowed = new Set([
      'authorization_denied', 'invalid_state', 'missing_code', 'token_exchange_failed',
      'missing_permissions', 'account_lookup_failed', 'unexpected_account',
      'connection_save_failed', 'database_unavailable',
    ]);
    const code = error instanceof IntegrationFailure && allowed.has(error.code) ? error.code : 'token_exchange_failed';
    return redirect(`/dashboard/integrations/instagram?error=${code}`, { headers });
  }
}
