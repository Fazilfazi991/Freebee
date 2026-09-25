import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';
import { beginInstagramAuthorization } from '~/lib/integrations/instagram/oauth.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const authorizationUrl = await beginInstagramAuthorization(config, admin);
  return redirect(authorizationUrl, { headers: privateHeaders(admin) });
}
