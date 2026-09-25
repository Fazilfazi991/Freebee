import { json, redirect, type ActionFunctionArgs, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Form, useActionData } from '@remix-run/react';
import { getAdmin, privateHeaders, signInAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig, isSameOriginPost } from '~/lib/integrations/instagram/config.server';
import stylesUrl from '~/styles/instagram-dashboard.css?url';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesUrl }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const admin = await getAdmin(request, getInstagramConfig(context));
  if (admin) return redirect('/dashboard/integrations/instagram', { headers: privateHeaders(admin) });
  return json({}, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (!isSameOriginPost(request)) return json({ error: 'Unable to sign in.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password || email.length > 254 || password.length > 1024) {
    return json({ error: 'Unable to sign in.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  }
  try {
    const cookie = await signInAdmin(getInstagramConfig(context), email, password);
    return redirect('/dashboard/integrations/instagram', {
      headers: { 'Cache-Control': 'private, no-store', 'Set-Cookie': cookie },
    });
  } catch {
    return json({ error: 'Unable to sign in.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }
}

export default function DashboardLogin() {
  const data = useActionData<typeof action>();
  return (
    <main className="ig-page ig-login-page">
      <div className="ig-login-card">
        <p className="ig-eyebrow">IncomeNow · Admin</p>
        <h1>Sign in</h1>
        <p>Use your approved Supabase admin account to manage Instagram publishing access.</p>
        <Form method="post" className="ig-form">
          <label>Email<input name="email" type="email" autoComplete="username" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          {data?.error && <p className="ig-error" role="alert">{data.error}</p>}
          <button className="ig-button ig-button-primary" type="submit">Sign in</button>
        </Form>
      </div>
    </main>
  );
}
