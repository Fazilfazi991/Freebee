import { json, redirect, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { isSameOriginPost } from '~/lib/integrations/instagram/config.server';
import { signOutHeader } from '~/lib/integrations/instagram/admin-auth.server';

export async function action({ request }: ActionFunctionArgs) {
  if (!isSameOriginPost(request)) return json({ error: 'Forbidden' }, { status: 403 });
  return redirect('/dashboard/login', {
    headers: { 'Cache-Control': 'private, no-store', 'Set-Cookie': await signOutHeader() },
  });
}

export function loader() {
  return json({ error: 'Method not allowed' }, { status: 405 });
}
