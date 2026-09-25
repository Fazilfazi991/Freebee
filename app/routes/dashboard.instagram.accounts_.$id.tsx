import { json, redirect, type ActionFunctionArgs, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Form, useLoaderData, useNavigation } from '@remix-run/react';
import { useState } from 'react';
import { InstagramShell, StateBadge, contentLabel, readableDate } from '~/components/instagram/InstagramShell';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig, isSameOriginPost } from '~/lib/integrations/instagram/config.server';
import { listAssignments, listContent, listPostingSlots, savePostingSlot, setPostingSlotEnabled } from '~/lib/integrations/instagram/control-db.server';
import { assignContentToAccount, isValidTimezone } from '~/lib/integrations/instagram/distribution.server';
import { prepareInstagramPublication, processInstagramPublication, publishInstagramPublication } from '~/lib/integrations/instagram/publication-workflow.server';
import { getCurrentReelAttempt } from '~/lib/integrations/instagram/reel-db.server';
import { disconnectInstagramAccount, getInstagramAccount, IntegrationFailure, updateInstagramAccount } from '~/lib/integrations/instagram/supabase.server';
import stylesUrl from '~/styles/instagram-dashboard.css?url';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesUrl }];

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const id = params.id ?? '';
  const account = await getInstagramAccount(config, admin.userId, id);
  if (!account) throw new Response('Account not found', { status: 404 });
  const [slots, assignments, content, legacyAttempt] = await Promise.all([
    listPostingSlots(config, admin.userId, id), listAssignments(config, admin.userId, { accountId: id }),
    listContent(config, admin.userId), getCurrentReelAttempt(config, admin.userId),
  ]);
  const query = new URL(request.url).searchParams;
  return json({ account, slots, assignments, content,
    legacyAttempt: legacyAttempt?.status === 'published' && legacyAttempt.instagram_user_id === account.instagram_user_id
      ? { mediaId: legacyAttempt.media_id, caption: legacyAttempt.caption, publishedAt: legacyAttempt.published_at } : null,
    notice: query.get('notice'), error: query.get('error') }, { headers: privateHeaders(admin) });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  if (!isSameOriginPost(request)) return json({ error: 'Forbidden' }, { status: 403 });
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const id = params.id ?? '';
  const account = await getInstagramAccount(config, admin.userId, id);
  if (!account) throw new Response('Account not found', { status: 404 });
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const headers = privateHeaders(admin);
  try {
    if (intent === 'save_settings') {
      const mode = String(form.get('orderingMode') ?? '');
      const posts = Number(form.get('postsPerDay'));
      const timezone = String(form.get('timezone') ?? '').trim();
      if (!['sequential', 'random', 'smart_random'].includes(mode) || !Number.isSafeInteger(posts) ||
          posts < 1 || posts > 12 || !isValidTimezone(timezone)) throw new IntegrationFailure('invalid_settings');
      await updateInstagramAccount(config, admin.userId, id, {
        ordering_mode: mode as 'sequential' | 'random' | 'smart_random', posts_per_day: posts,
        timezone, default_share_to_feed: form.get('shareToFeed') === 'on',
        posting_enabled: form.get('postingEnabled') === 'on',
      });
    } else if (intent === 'pause') await updateInstagramAccount(config, admin.userId, id, { posting_enabled: false });
    else if (intent === 'resume') await updateInstagramAccount(config, admin.userId, id, { posting_enabled: true });
    else if (intent === 'disconnect') await disconnectInstagramAccount(config, admin.userId, id);
    else if (intent === 'add_slot') await savePostingSlot(config, admin.userId, id, String(form.get('time') ?? ''));
    else if (intent === 'toggle_slot') await setPostingSlotEnabled(config, admin.userId, id,
      String(form.get('slotId') ?? ''), form.get('enabled') === 'true');
    else if (intent === 'assign') await assignContentToAccount(config, admin.userId, id, String(form.get('contentId') ?? ''));
    else if (intent === 'prepare') await prepareInstagramPublication(config, admin.userId,
      String(form.get('assignmentId') ?? ''), 'manual');
    else if (intent === 'check') await processInstagramPublication(config, admin.userId,
      String(form.get('assignmentId') ?? ''));
    else if (intent === 'publish') {
      if (form.get('confirmation') !== 'PUBLISH ONE REEL') throw new IntegrationFailure('publish_confirmation_required');
      await publishInstagramPublication(config, admin.userId, String(form.get('assignmentId') ?? ''), 'manual');
    } else return json({ error: 'Invalid action' }, { status: 400, headers });
    return redirect(`/dashboard/instagram/accounts/${id}?notice=saved`, { headers });
  } catch (error) {
    const code = error instanceof IntegrationFailure ? error.code : 'database_unavailable';
    return redirect(`/dashboard/instagram/accounts/${id}?error=${encodeURIComponent(code)}`, { headers });
  }
}

const labels: Record<string, string> = {
  duplicate_assignment: 'This content is already assigned to this account.',
  content_not_ready: 'Choose a Ready content item.',
  check_too_soon: 'Wait at least one minute before checking again.',
  publishing_paused: 'Publishing is paused in the global controls.',
  token_expired: 'The Instagram credential expired. Reconnect the account.',
  publish_confirmation_required: 'Type PUBLISH ONE REEL before publishing.',
  not_ready_to_publish: 'Instagram has not confirmed this container is ready.',
  invalid_settings: 'Check the posting settings and timezone.',
};

export default function InstagramAccountDetail() {
  const { account, slots, assignments, content, legacyAttempt, notice, error } = useLoaderData<typeof loader>();
  const busy = useNavigation().state !== 'idle';
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const inRange = (item: typeof assignments[number]) => {
    const date = (item.published_at ?? item.scheduled_at ?? item.created_at).slice(0, 10);
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  };
  const contentById = new Map(content.map((item) => [item.id, item]));
  const visible = assignments.filter(inRange);
  const upcoming = visible.filter((item) => ['queued', 'scheduled'].includes(item.status));
  const processing = visible.filter((item) => ['preparing', 'container_created', 'processing', 'ready', 'publishing', 'publish_uncertain'].includes(item.status));
  const published = visible.filter((item) => item.status === 'published');
  const failed = visible.filter((item) => item.status === 'failed');
  const available = content.filter((item) => item.status === 'ready' && !assignments.some((assignment) => assignment.content_id === item.id));
  const expired = account.token_expires_at && Date.parse(account.token_expires_at) <= Date.now();
  return <InstagramShell active="Accounts">
    <div className="ig-control-head"><div><a className="ig-back" href="/dashboard/instagram/accounts">All accounts</a>
      <h1>@{account.username}</h1><p>{account.instagram_user_id} · {account.account_type}</p></div>
      <StateBadge status={expired ? 'reconnect' : account.status} />
    </div>
    {notice === 'saved' && <p className="ig-notice" role="status">Account updated.</p>}
    {error && <p className="ig-error" role="alert">{labels[error] ?? 'The action could not be completed. Review the account and try again.'}</p>}
    <div className="ig-control-grid">
      <section className="ig-panel"><div className="ig-section-head"><h2>Account settings</h2><span>Token expires {readableDate(account.token_expires_at)}</span></div>
        <Form method="post" className="ig-settings-form"><input type="hidden" name="intent" value="save_settings" />
          <label className="ig-check"><input type="checkbox" name="postingEnabled" defaultChecked={account.posting_enabled} />Posting enabled</label>
          <label className="ig-check"><input type="checkbox" name="shareToFeed" defaultChecked={account.default_share_to_feed} />Share Reels to Feed by default</label>
          <label>Posts per day<input type="number" name="postsPerDay" min="1" max="12" defaultValue={account.posts_per_day ?? 2} required /></label>
          <label>Content order<select name="orderingMode" defaultValue={account.ordering_mode ?? 'smart_random'}>
            <option value="sequential">Sequential</option><option value="random">Random</option><option value="smart_random">Smart random</option></select></label>
          <label>Timezone<input name="timezone" defaultValue={account.timezone ?? 'Asia/Dubai'} required /></label>
          <button className="ig-button ig-button-primary" disabled={busy}>Save settings</button>
        </Form>
        <div className="ig-actions"><a className="ig-button" href={`/api/integrations/instagram/connect?accountId=${account.id}`}>Reconnect</a>
          <Form method="post"><input type="hidden" name="intent" value={account.posting_enabled ? 'pause' : 'resume'} />
            <button className="ig-button" disabled={busy}>{account.posting_enabled ? 'Pause posting' : 'Resume posting'}</button></Form>
          {account.status === 'connected' && <Form method="post"><input type="hidden" name="intent" value="disconnect" />
            <button className="ig-button ig-button-danger" disabled={busy}>Disconnect</button></Form>}
        </div><p className="ig-hint">Disconnect removes the local credential and keeps publication history.</p>
      </section>
      <section className="ig-panel"><div className="ig-section-head"><h2>Posting times</h2><span>{account.timezone ?? 'Asia/Dubai'}</span></div>
        <div className="ig-slot-list">{slots.map((slot) => <div key={slot.id}><strong>{slot.time_of_day.slice(0, 5)}</strong>
          <span>{slot.enabled ? 'Enabled' : 'Paused'}</span><Form method="post"><input type="hidden" name="intent" value="toggle_slot" />
            <input type="hidden" name="slotId" value={slot.id} /><input type="hidden" name="enabled" value={slot.enabled ? 'false' : 'true'} />
            <button className="ig-text-button" disabled={busy}>{slot.enabled ? 'Pause' : 'Enable'}</button></Form></div>)}</div>
        <Form method="post" className="ig-inline-form"><input type="hidden" name="intent" value="add_slot" />
          <label>Add a time<input type="time" name="time" required /></label><button className="ig-button" disabled={busy}>Add time</button></Form>
        <p className="ig-hint">Posts are staggered up to 19 minutes after each configured time.</p>
      </section>
    </div>
    <section className="ig-panel ig-overview-bottom"><div className="ig-section-head"><h2>Assign content</h2><a href="/dashboard/instagram/content">Content library</a></div>
      <Form method="post" className="ig-inline-form"><input type="hidden" name="intent" value="assign" />
        <label>Ready content<select name="contentId" required defaultValue=""><option value="" disabled>Choose content</option>
          {available.map((item) => <option key={item.id} value={item.id}>{contentLabel(item.content_number)} · {item.title || item.caption.slice(0, 50)}</option>)}
        </select></label><button className="ig-button" disabled={busy || !available.length}>Add to queue</button></Form>
      <p className="ig-hint">The same content cannot be assigned twice to this account. It can be used by other accounts.</p>
    </section>
    <div className="ig-library-filters" aria-label="Filter account publication history">
      <label>From date<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
      <label>To date<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
      {(fromDate || toDate) && <button type="button" className="ig-text-button" onClick={() => { setFromDate(''); setToDate(''); }}>Clear dates</button>}
    </div>
    <section className="ig-panel ig-overview-bottom"><div className="ig-section-head"><h2>Upcoming</h2><span>{upcoming.length}</span></div>
      <AssignmentList items={upcoming} contentById={contentById} busy={busy} />
    </section>
    <section className="ig-panel ig-overview-bottom"><div className="ig-section-head"><h2>Processing</h2><span>{processing.length}</span></div>
      <AssignmentList items={processing} contentById={contentById} busy={busy} />
    </section>
    <section className="ig-panel ig-overview-bottom"><div className="ig-section-head"><h2>Published</h2><span>{published.length + (legacyAttempt ? 1 : 0)}</span></div>
      <AssignmentList items={published} contentById={contentById} busy={busy} />
      {legacyAttempt && <div className="ig-list-row"><span>Original API test</span><strong>{legacyAttempt.mediaId}</strong><span>{readableDate(legacyAttempt.publishedAt)}</span></div>}
    </section>
    <section className="ig-panel ig-overview-bottom"><div className="ig-section-head"><h2>Failed</h2><span>{failed.length}</span></div>
      <AssignmentList items={failed} contentById={contentById} busy={busy} />
    </section>
  </InstagramShell>;
}

function AssignmentList({ items, contentById, busy }: { items: ReturnType<typeof useLoaderData<typeof loader>>['assignments'];
  contentById: Map<string, ReturnType<typeof useLoaderData<typeof loader>>['content'][number]>; busy: boolean }) {
  if (!items.length) return <p className="ig-empty">Nothing here yet.</p>;
  return <div className="ig-list">{items.map((item) => {
    const content = contentById.get(item.content_id);
    return <div className="ig-list-row ig-assignment-row" key={item.id}>
      <a href={`/dashboard/instagram/content/${item.content_id}`}><strong>{content ? contentLabel(content.content_number) : 'Content'}</strong>
        <span>{content?.title || item.caption_snapshot.slice(0, 70)}</span></a>
      <span>{readableDate(item.scheduled_at ?? item.published_at)}</span><StateBadge status={item.status} />
      {item.instagram_media_id && <small>Meta ID {item.instagram_media_id}</small>}
      {item.last_error_summary && <small>{item.last_error_summary}</small>}
      {['queued', 'scheduled'].includes(item.status) && <Form method="post"><input type="hidden" name="intent" value="prepare" />
        <input type="hidden" name="assignmentId" value={item.id} /><button className="ig-button" disabled={busy}>Prepare</button></Form>}
      {['container_created', 'processing'].includes(item.status) && <Form method="post"><input type="hidden" name="intent" value="check" />
        <input type="hidden" name="assignmentId" value={item.id} /><button className="ig-button" disabled={busy}>Check status</button></Form>}
      {item.status === 'ready' && <Form method="post" className="ig-inline-form"><input type="hidden" name="intent" value="publish" />
        <input type="hidden" name="assignmentId" value={item.id} /><label>Type PUBLISH ONE REEL<input name="confirmation" autoComplete="off" required /></label>
        <button className="ig-button ig-button-primary" disabled={busy}>Publish Reel</button></Form>}
    </div>;
  })}</div>;
}
