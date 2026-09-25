import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Outlet } from '@remix-run/react';
import { getAdmin, privateHeaders } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Child routes perform their own authorization; the login child must stay public.
  if (new URL(request.url).pathname !== '/dashboard') return null;
  const admin = await getAdmin(request, getInstagramConfig(context));
  if (!admin) return redirect('/dashboard/login', { headers: { 'Cache-Control': 'private, no-store' } });
  return redirect('/dashboard/integrations/instagram', { headers: privateHeaders(admin) });
}

export default function DashboardLayout() {
  return <Outlet />;
}
