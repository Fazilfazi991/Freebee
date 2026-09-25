import { json, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Form, useLoaderData } from '@remix-run/react';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';
import { getConnection } from '~/lib/integrations/instagram/supabase.server';
import stylesUrl from '~/styles/instagram-dashboard.css?url';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesUrl }];

const errorMessages: Record<string, string> = {
  authorization_denied: 'Instagram authorization was canceled.',
  invalid_state: 'This connection attempt expired or was already used. Please try again.',
  missing_code: 'Instagram did not return an authorization code. Please try again.',
  token_exchange_failed: 'Instagram could not complete the connection. Please try again.',
  missing_permissions: 'The required Instagram permissions were not granted.',
  account_lookup_failed: 'The Instagram account could not be verified.',
  unexpected_account: 'Please authorize the approved test account only.',
  connection_save_failed: 'The connection could not be saved. Please try again.',
  database_unavailable: 'The connection database is unavailable.',
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const connection = await getConnection(config, admin.userId);
  const tokenExpired = Boolean(connection?.status === 'connected' && connection.token_expires_at && Date.parse(connection.token_expires_at) <= Date.now());
  const query = new URL(request.url).searchParams;
  const error = query.get('error');
  return json({
    account: `@${config.expectedUsername}`,
    connection,
    tokenExpired,
    connected: query.get('connected') === '1',
    disconnected: query.get('disconnected') === '1',
    error: error && errorMessages[error] ? errorMessages[error] : null,
  }, { headers: privateHeaders(admin) });
}

function displayDate(value: string | null): string {
  return value ? new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/u, ' UTC') : '—';
}

export default function InstagramIntegration() {
  const { account, connection, tokenExpired, connected, disconnected, error } = useLoaderData<typeof loader>();
  const isConnected = connection?.status === 'connected';
  const isExpired = isConnected && tokenExpired;
  return (
    <main className="ig-page">
      <header className="ig-topbar">
        <a className="ig-wordmark" href="/dashboard">IncomeNow <span>Dashboard</span></a>
        <Form method="post" action="/dashboard/logout"><button className="ig-button ig-button-subtle" type="submit">Sign out</button></Form>
      </header>
      <div className="ig-content">
        <p className="ig-eyebrow">Integrations / Instagram</p>
        <h1>Instagram Publishing</h1>
        <p className="ig-lede">Connect your professional Instagram account for future Reel publishing.</p>
        {connected && <p className="ig-notice" role="status">Instagram account connected.</p>}
        {disconnected && <p className="ig-notice" role="status">Local connection removed. You can also revoke the app in Instagram Apps and websites.</p>}
        {error && <p className="ig-error" role="alert">{error}</p>}
        <section className="ig-panel" aria-label="Instagram account connection">
          <div className="ig-panel-heading">
            <div><p className="ig-eyebrow">Test account</p><h2>{account}</h2></div>
            <span className={`ig-status ${isConnected && !isExpired ? 'is-connected' : ''}`}>
              {isConnected && !isExpired ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <dl className="ig-details">
            <div><dt>Instagram Account ID</dt><dd>{connection?.instagram_user_id ?? '—'}</dd></div>
            <div><dt>Token status</dt><dd>{isConnected ? isExpired ? 'Expired · reconnect required' : 'Stored securely' : 'No active token'}</dd></div>
            <div><dt>Token expiry</dt><dd>{displayDate(connection?.token_expires_at ?? null)}</dd></div>
            <div><dt>Last connected</dt><dd>{displayDate(connection?.connected_at ?? null)}</dd></div>
          </dl>
          <div className="ig-actions">
            <a className="ig-button ig-button-primary" href="/api/integrations/instagram/connect">
              {isConnected ? 'Reconnect' : 'Connect Instagram'}
            </a>
            {isConnected && (
              <Form method="post" action="/api/integrations/instagram/disconnect">
                <button className="ig-button" type="submit">Disconnect</button>
              </Form>
            )}
          </div>
          <p className="ig-hint">This page never displays the access token. No Reel is published by connecting.</p>
        </section>
      </div>
    </main>
  );
}
