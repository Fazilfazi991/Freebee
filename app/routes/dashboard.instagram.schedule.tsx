import { json, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { InstagramShell, StateBadge, contentLabel, readableDate } from '~/components/instagram/InstagramShell';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';
import { getPublishingSettings, listAssignments, listContent, listPostingSlots } from '~/lib/integrations/instagram/control-db.server';
import { listInstagramAccounts } from '~/lib/integrations/instagram/supabase.server';
import stylesUrl from '~/styles/instagram-dashboard.css?url';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesUrl }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const [settings, accounts, content, assignments, slots] = await Promise.all([
    getPublishingSettings(config), listInstagramAccounts(config, admin.userId),
    listContent(config, admin.userId), listAssignments(config, admin.userId),
    listPostingSlots(config, admin.userId),
  ]);
  return json({ settings, accounts, content, assignments, slots }, { headers: privateHeaders(admin) });
}

export default function InstagramSchedule() {
  const { settings, accounts, content, assignments, slots } = useLoaderData<typeof loader>();
  const [accountFilter, setAccountFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const byAccount = new Map(accounts.map((item) => [item.id, item]));
  const byContent = new Map(content.map((item) => [item.id, item]));
  const visible = assignments.filter((item) => (accountFilter === 'all' || item.instagram_account_id === accountFilter) &&
    (statusFilter === 'all' || item.status === statusFilter))
    .sort((a, b) => Date.parse(b.scheduled_at ?? b.published_at ?? b.created_at) - Date.parse(a.scheduled_at ?? a.published_at ?? a.created_at));
  return <InstagramShell active="Schedule">
    <div className="ig-control-head"><div><p className="ig-kicker">Publication calendar</p><h1>Schedule & history</h1>
      <p>Planned posts, live processing, completed Reels, and failures.</p></div></div>
    <div className="ig-safety ig-safety-compact"><div><p className="ig-kicker">Global auto publish</p><strong>{settings.auto_publish ? 'ON' : 'OFF'}</strong>
      <p>{settings.pause_all ? 'All publishing is paused.' : settings.auto_publish ? 'Validated due posts can publish.' : 'Schedules remain visible; automatic posting is off.'}</p></div>
      <a className="ig-button" href="/dashboard/integrations/instagram">Publishing controls</a></div>
    <div className="ig-metrics ig-metrics-four"><div><span>Posting slots</span><strong>{slots.filter((slot) => slot.enabled).length}</strong></div>
      <div><span>Scheduled</span><strong>{assignments.filter((item) => item.status === 'scheduled').length}</strong></div>
      <div><span>Published</span><strong>{assignments.filter((item) => item.status === 'published').length}</strong></div>
      <div><span>Failed or uncertain</span><strong>{assignments.filter((item) => ['failed', 'publish_uncertain'].includes(item.status)).length}</strong></div></div>
    <section className="ig-panel ig-table-panel"><div className="ig-section-head"><h2>Publications</h2><span>{visible.length} shown</span></div>
      <div className="ig-library-filters"><label>Account<select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
        <option value="all">All accounts</option>{accounts.map((item) => <option key={item.id} value={item.id}>@{item.username}</option>)}</select></label>
        <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>{['queued', 'scheduled', 'preparing', 'processing', 'ready', 'publishing', 'published', 'failed', 'publish_uncertain'].map((status) =>
            <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label></div>
      {visible.length ? <div className="ig-list">{visible.map((item) => <div className="ig-list-row ig-schedule-row" key={item.id}>
        <span>{readableDate(item.scheduled_at ?? item.published_at)}</span>
        <a href={`/dashboard/instagram/accounts/${item.instagram_account_id}`}><strong>@{byAccount.get(item.instagram_account_id)?.username ?? 'Account'}</strong></a>
        <a href={`/dashboard/instagram/content/${item.content_id}`}>{byContent.get(item.content_id) ? contentLabel(byContent.get(item.content_id)!.content_number) : 'Content'}</a>
        <StateBadge status={item.status} />
        {item.instagram_media_id && <small>Meta ID {item.instagram_media_id}</small>}
        {item.last_error_summary && <small>{item.last_error_summary}</small>}
      </div>)}</div> : <p className="ig-empty">No publications match these filters. Add content and posting slots to build a schedule.</p>}
    </section>
  </InstagramShell>;
}
