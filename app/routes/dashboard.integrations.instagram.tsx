import { json, redirect, type ActionFunctionArgs, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Form, useLoaderData, useNavigation } from '@remix-run/react';
import { InstagramShell, StateBadge, contentLabel, readableDate } from '~/components/instagram/InstagramShell';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig, isSameOriginPost } from '~/lib/integrations/instagram/config.server';
import { getPublishingSettings, listAssignments, listContent, updatePublishingSettings } from '~/lib/integrations/instagram/control-db.server';
import { planPostingSlots } from '~/lib/integrations/instagram/distribution.server';
import { getCurrentReelAttempt } from '~/lib/integrations/instagram/reel-db.server';
import { listInstagramAccounts, IntegrationFailure } from '~/lib/integrations/instagram/supabase.server';
import stylesUrl from '~/styles/instagram-dashboard.css?url';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesUrl }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const [settings, accounts, content, assignments, legacyAttempt] = await Promise.all([
    getPublishingSettings(config), listInstagramAccounts(config, admin.userId), listContent(config, admin.userId),
    listAssignments(config, admin.userId), getCurrentReelAttempt(config, admin.userId),
  ]);
  const next = assignments.filter((item) => item.status === 'scheduled' && item.scheduled_at)
    .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!)).slice(0, 8);
  const attention = assignments.filter((item) => ['failed', 'publish_uncertain'].includes(item.status)).slice(0, 8);
  const accountAttention = accounts.filter((account) => account.status !== 'connected' ||
    (account.token_expires_at && Date.parse(account.token_expires_at) < Date.now() + 7 * 86400_000));
  const query = new URL(request.url).searchParams;
  return json({ settings, accounts, content, assignments, next, attention, accountAttention,
    legacyAttempt: legacyAttempt?.status === 'published' ? {
      instagramUserId: legacyAttempt.instagram_user_id, mediaId: legacyAttempt.media_id,
      publishedAt: legacyAttempt.published_at, caption: legacyAttempt.caption,
    } : null,
    notice: query.get('notice'), error: query.get('error'),
  }, { headers: privateHeaders(admin) });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (!isSameOriginPost(request)) return json({ error: 'Forbidden' }, { status: 403 });
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const headers = privateHeaders(admin);
  try {
    if (intent === 'pause_all') await updatePublishingSettings(config, admin.userId, { pause_all: true });
    else if (intent === 'resume_all') await updatePublishingSettings(config, admin.userId, { pause_all: false });
    else if (intent === 'auto_off') await updatePublishingSettings(config, admin.userId, { auto_publish: false });
    else if (intent === 'auto_on') {
      if (form.get('confirmation') !== 'ENABLE AUTO PUBLISH') throw new IntegrationFailure('confirmation_required');
      await updatePublishingSettings(config, admin.userId, { auto_publish: true });
    } else if (intent === 'plan') await planPostingSlots(config, admin.userId);
    else return json({ error: 'Invalid action' }, { status: 400, headers });
    return redirect('/dashboard/integrations/instagram?notice=saved', { headers });
  } catch (error) {
    const code = error instanceof IntegrationFailure ? error.code : 'database_unavailable';
    return redirect(`/dashboard/integrations/instagram?error=${encodeURIComponent(code)}`, { headers });
  }
}

export default function InstagramOverview() {
  const { settings, accounts, content, assignments, next, attention, accountAttention,
    legacyAttempt, notice, error } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const byContent = new Map(content.map((item) => [item.id, item]));
  const byAccount = new Map(accounts.map((item) => [item.id, item]));
  const publishedToday = assignments.filter((item) => item.status === 'published' && item.published_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  return <InstagramShell active="Overview">
    <div className="ig-control-head">
      <div><p className="ig-kicker">Publishing workspace</p><h1>Instagram Publishing</h1>
        <p>Keep accounts, prepared Reels, schedules, and outcomes in one place.</p></div>
      <a className="ig-button ig-button-primary" href="/dashboard/instagram/content">Add content</a>
    </div>
    {notice === 'saved' && <p className="ig-notice" role="status">Publishing settings saved.</p>}
    {error && <p className="ig-error" role="alert">{error === 'confirmation_required' ? 'Type ENABLE AUTO PUBLISH to turn on live scheduled posting.' : 'The change could not be saved. Check the configuration and try again.'}</p>}
    <section className="ig-safety" aria-label="Publishing safety controls">
      <div><p className="ig-kicker">Global auto publish</p><strong>{settings.auto_publish ? 'ON' : 'OFF'}</strong>
        <p>{settings.auto_publish ? 'Due, validated posts may publish automatically.' : 'Schedules can be prepared. No scheduled Reel will publish automatically.'}</p></div>
      <div className="ig-safety-actions">
        {settings.auto_publish ? <Form method="post"><input type="hidden" name="intent" value="auto_off" /><button className="ig-button" disabled={busy}>Turn off auto publish</button></Form>
          : <Form method="post" className="ig-inline-form"><input type="hidden" name="intent" value="auto_on" />
              <label>Type ENABLE AUTO PUBLISH to activate live posting<input name="confirmation" autoComplete="off" /></label>
              <button className="ig-button" disabled={busy}>Turn on</button></Form>}
        <Form method="post"><input type="hidden" name="intent" value={settings.pause_all ? 'resume_all' : 'pause_all'} />
          <button className="ig-button ig-button-danger" disabled={busy}>{settings.pause_all ? 'Resume all publishing' : 'Pause all publishing'}</button></Form>
      </div>
    </section>
    <div className="ig-metrics" aria-label="Publishing totals">
      <div><span>Accounts</span><strong>{accounts.length}</strong><small>{accounts.filter((item) => item.status === 'connected').length} connected</small></div>
      <div><span>Content</span><strong>{content.length}</strong><small>{content.filter((item) => item.status === 'ready').length} ready</small></div>
      <div><span>Scheduled</span><strong>{assignments.filter((item) => item.status === 'scheduled').length}</strong><small>Upcoming across accounts</small></div>
      <div><span>Published today</span><strong>{publishedToday}</strong><small>UTC reporting day</small></div>
    </div>
    <div className="ig-control-grid">
      <section className="ig-panel"><div className="ig-section-head"><h2>Upcoming publications</h2><a href="/dashboard/instagram/schedule">View schedule</a></div>
        {next.length ? <div className="ig-list">{next.map((item) => <a key={item.id} href={`/dashboard/instagram/accounts/${item.instagram_account_id}`} className="ig-list-row">
          <span>{readableDate(item.scheduled_at)}</span><strong>@{byAccount.get(item.instagram_account_id)?.username ?? 'Account'}</strong>
          <span>{byContent.get(item.content_id) ? contentLabel(byContent.get(item.content_id)!.content_number) : 'Content'}</span><StateBadge status={item.status} />
        </a>)}</div> : <p className="ig-empty">No upcoming posts. Add ready content and posting times, then plan the schedule.</p>}
      </section>
      <section className="ig-panel"><div className="ig-section-head"><h2>Needs attention</h2><a href="/dashboard/instagram/accounts">View accounts</a></div>
        {accountAttention.length + attention.length ? <div className="ig-list">
          {accountAttention.map((account) => <a className="ig-list-row" key={account.id} href={`/dashboard/instagram/accounts/${account.id}`}><strong>@{account.username}</strong><span>Reconnect or review expiry</span></a>)}
          {attention.map((item) => <a className="ig-list-row" key={item.id} href={`/dashboard/instagram/accounts/${item.instagram_account_id}`}><strong>@{byAccount.get(item.instagram_account_id)?.username ?? 'Account'}</strong><span>{item.last_error_summary ?? item.last_error_code ?? 'Review publication'}</span></a>)}
        </div> : <p className="ig-empty">No failures or connection issues need attention.</p>}
      </section>
    </div>
    <section className="ig-panel ig-overview-bottom"><div className="ig-section-head"><h2>Setup progress</h2><a href="/dashboard/instagram/accounts">Manage accounts</a></div>
      <p>The first Instagram API publishing test is complete. Future content uses the private library and account schedules.</p>
      {legacyAttempt && <p className="ig-hint">Test Reel: {legacyAttempt.mediaId} · {readableDate(legacyAttempt.publishedAt)} · caption “{legacyAttempt.caption}”</p>}
      <Form method="post"><input type="hidden" name="intent" value="plan" /><button className="ig-button" disabled={busy}>Plan next batch</button></Form>
      <p className="ig-hint">Each click plans up to 10 posts within the next 36 hours. Global auto publish remains {settings.auto_publish ? 'on' : 'off'}.</p>
      <a className="ig-text-link" href="/dashboard/instagram/test">View original API test</a>
    </section>
  </InstagramShell>;
}
