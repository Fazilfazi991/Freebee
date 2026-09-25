import { json, redirect, type ActionFunctionArgs, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Form, useLoaderData, useNavigation } from '@remix-run/react';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig, isSameOriginPost } from '~/lib/integrations/instagram/config.server';
import { getCurrentReelAttempt } from '~/lib/integrations/instagram/reel-db.server';
import { checkTestReel, prepareTestReel, publishTestReel } from '~/lib/integrations/instagram/reel-publishing.server';
import { getConnection, IntegrationFailure } from '~/lib/integrations/instagram/supabase.server';
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
  invalid_video_url: 'Enter a public HTTPS MP4 URL without a query string, credentials, or a private host.',
  video_dns_unavailable: 'The video host could not be verified as public. Try a different public URL.',
  video_unavailable: 'The video URL is not reachable by a lightweight HEAD request.',
  invalid_video_type: 'The URL must serve an MP4 video.',
  invalid_video_size: 'The MP4 must have a valid size below 300 MB.',
  invalid_caption: 'Enter a caption of 1 to 2,200 characters.',
  account_disconnected: 'Reconnect the approved Instagram account first.',
  token_expired: 'The Instagram token expired. Reconnect the account first.',
  missing_credential: 'The Instagram credential is missing. Reconnect the account.',
  credential_decrypt_failed: 'The stored Instagram credential could not be read. Reconnect the account.',
  already_prepared: 'A test Reel is already prepared or has been published.',
  container_create_rejected: 'Instagram rejected the Reel container. Check the MP4 and account access.',
  container_create_server_error: 'Instagram could not create the Reel container. Try later.',
  container_create_timeout: 'Instagram did not respond in time. Check the attempt before preparing another.',
  meta_permission_denied: 'Instagram denied publishing access. Reconnect and check the app permission.',
  meta_rate_limited: 'Instagram publishing is rate limited. Try later.',
  invalid_meta_response: 'Instagram returned an unexpected response.',
  nothing_to_check: 'There is no processing Reel container to check.',
  check_too_soon: 'Check again after one minute.',
  status_check_timeout: 'Instagram did not respond to the status check.',
  status_check_rejected: 'Instagram rejected the status check.',
  status_check_server_error: 'Instagram could not report processing status. Try later.',
  processing_timeout: 'Instagram processing did not finish after five checks. Prepare a new attempt after reviewing the video.',
  publish_confirmation_required: 'Type PUBLISH ONE REEL to confirm the real Instagram post.',
  not_ready_to_publish: 'The container is not confirmed ready. Check its status.',
  duplicate_publish: 'This Reel is already being published or was published.',
  publish_timeout: 'The publish outcome is uncertain. Do not retry automatically.',
  publish_rejected: 'Instagram rejected the publish request. Review the outcome before retrying.',
  publish_server_error: 'Instagram returned an error. The publish outcome is uncertain.',
  publish_record_failed: 'Instagram returned a media ID, but the database update failed. Stop and review manually.',
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const connection = await getConnection(config, admin.userId);
  const attempt = await getCurrentReelAttempt(config, admin.userId);
  const tokenExpired = Boolean(connection?.status === 'connected' && connection.token_expires_at && Date.parse(connection.token_expires_at) <= Date.now());
  const query = new URL(request.url).searchParams;
  const error = query.get('error');
  return json({
    account: `@${config.expectedUsername}`,
    connection,
    attempt,
    tokenExpired,
    connected: query.get('connected') === '1',
    disconnected: query.get('disconnected') === '1',
    error: error && errorMessages[error] ? errorMessages[error] : null,
  }, { headers: privateHeaders(admin) });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (!isSameOriginPost(request)) return json({ error: 'Forbidden' }, { status: 403 });
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const form = await request.formData();
  const intent = form.get('intent');
  const headers = privateHeaders(admin);
  try {
    if (intent === 'prepare') {
      await prepareTestReel(config, admin.userId, String(form.get('videoUrl') ?? ''), String(form.get('caption') ?? ''));
    } else if (intent === 'check') {
      await checkTestReel(config, admin.userId);
    } else if (intent === 'publish') {
      await publishTestReel(config, admin.userId, String(form.get('confirmation') ?? ''));
    } else {
      return json({ error: 'Invalid action' }, { status: 400, headers });
    }
    return redirect('/dashboard/integrations/instagram', { headers });
  } catch (error) {
    const code = error instanceof IntegrationFailure && errorMessages[error.code] ? error.code : 'database_unavailable';
    return redirect(`/dashboard/integrations/instagram?error=${code}`, { headers });
  }
}

function displayDate(value: string | null): string {
  return value ? new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/u, ' UTC') : '—';
}

export default function InstagramIntegration() {
  const { account, connection, attempt, tokenExpired, connected, disconnected, error } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
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
        {isConnected && !isExpired && (
          <section className="ig-panel ig-reel-panel" aria-label="Test Reel Publishing">
            <p className="ig-eyebrow">One account · one Reel</p>
            <h2>Test Reel Publishing</h2>
            <p className="ig-hint">Prepare creates a container for Instagram to process. It does not publish a Reel.</p>
            {(!attempt || attempt.status === 'failed') && (
              <>
                {attempt?.status === 'failed' && <p className="ig-error" role="status">Previous attempt failed: {errorMessages[attempt.failure_code ?? ''] ?? 'Review the video and try a new attempt.'}</p>}
                <Form method="post" className="ig-form">
                  <input type="hidden" name="intent" value="prepare" />
                  <label>Public MP4 URL
                    <input name="videoUrl" type="url" placeholder="https://example.com/test-reel.mp4" required maxLength={2048} />
                  </label>
                  <label>Caption
                    <textarea name="caption" defaultValue="Instagram API publishing test." maxLength={2200} required rows={4} />
                  </label>
                  <p className="ig-hint">Share to Feed: No. The MP4 must remain publicly reachable while Instagram processes it. Maximum size: 300 MB.</p>
                  <button className="ig-button ig-button-primary" type="submit" disabled={busy}>Prepare Test Reel</button>
                </Form>
              </>
            )}
            {attempt && attempt.status !== 'failed' && (
              <div className="ig-reel-progress">
                <dl className="ig-details">
                  <div><dt>Application status</dt><dd>{attempt.status.replaceAll('_', ' ')}</dd></div>
                  <div><dt>Instagram container status</dt><dd>{attempt.container_status ?? '—'}</dd></div>
                  <div><dt>Container ID</dt><dd>{attempt.container_id ?? '—'}</dd></div>
                  <div><dt>Share to Feed</dt><dd>No</dd></div>
                </dl>
                {['container_created', 'processing'].includes(attempt.status) && (
                  <Form method="post" className="ig-actions">
                    <input type="hidden" name="intent" value="check" />
                    <button className="ig-button" type="submit" disabled={busy}>Check Status</button>
                    <span className="ig-hint">Check at most once a minute, up to five checks.</span>
                  </Form>
                )}
                {attempt.status === 'ready' && (
                  <div className="ig-ready">
                    <h3>Ready to publish</h3>
                    <p><strong>Account:</strong> {account}</p>
                    <p><strong>Caption:</strong> {attempt.caption}</p>
                    <p><strong>Share to Feed:</strong> No</p>
                    <p className="ig-error"><strong>The next action creates a real Instagram Reel.</strong></p>
                    <Form method="post" className="ig-form">
                      <input type="hidden" name="intent" value="publish" />
                      <label>Type PUBLISH ONE REEL to confirm
                        <input name="confirmation" autoComplete="off" required />
                      </label>
                      <button className="ig-button ig-button-primary" type="submit" disabled={busy}>Publish Reel</button>
                    </Form>
                  </div>
                )}
                {attempt.status === 'published' && (
                  <div className="ig-ready" role="status">
                    <h3>Published ✓</h3>
                    <p><strong>Account:</strong> {account}</p>
                    <p><strong>Instagram Media ID:</strong> {attempt.media_id}</p>
                    <p><strong>Published:</strong> {displayDate(attempt.published_at)}</p>
                    <p><strong>Caption:</strong> {attempt.caption}</p>
                  </div>
                )}
                {['publishing', 'publish_uncertain'].includes(attempt.status) && <p className="ig-error" role="alert">Publish outcome needs manual review. Do not retry this container. {errorMessages[attempt.failure_code ?? ''] ?? ''}</p>}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
