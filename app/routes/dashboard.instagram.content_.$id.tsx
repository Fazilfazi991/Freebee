import { json, redirect, type ActionFunctionArgs, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Form, useLoaderData, useNavigation } from '@remix-run/react';
import { InstagramShell, StateBadge, contentLabel, readableDate } from '~/components/instagram/InstagramShell';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig, isSameOriginPost } from '~/lib/integrations/instagram/config.server';
import { getContent, listAssignments, updateContent } from '~/lib/integrations/instagram/control-db.server';
import { archiveContent } from '~/lib/integrations/instagram/content-workflow.server';
import { assignContentToAccount } from '~/lib/integrations/instagram/distribution.server';
import { listInstagramAccounts, IntegrationFailure } from '~/lib/integrations/instagram/supabase.server';
import stylesUrl from '~/styles/instagram-dashboard.css?url';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesUrl }];

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const content = await getContent(config, admin.userId, params.id ?? '');
  if (!content) throw new Response('Content not found', { status: 404 });
  const [accounts, assignments] = await Promise.all([
    listInstagramAccounts(config, admin.userId), listAssignments(config, admin.userId, { contentId: content.id }),
  ]);
  const query = new URL(request.url).searchParams;
  return json({ content, accounts, assignments, notice: query.get('notice'), error: query.get('error') },
    { headers: privateHeaders(admin) });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  if (!isSameOriginPost(request)) return json({ error: 'Forbidden' }, { status: 403 });
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const contentId = params.id ?? '';
  const content = await getContent(config, admin.userId, contentId);
  if (!content) throw new Response('Content not found', { status: 404 });
  const form = await request.formData();
  const intent = form.get('intent');
  const headers = privateHeaders(admin);
  try {
    if (intent === 'save') {
      const title = String(form.get('title') ?? '').trim();
      const caption = String(form.get('caption') ?? '').trim();
      if (title.length > 200 || caption.length < 1 || caption.length > 2200) throw new IntegrationFailure('invalid_content');
      await updateContent(config, admin.userId, contentId, { title, caption });
    } else if (intent === 'archive') await archiveContent(config, admin.userId, contentId);
    else if (intent === 'assign') await assignContentToAccount(config, admin.userId,
      String(form.get('accountId') ?? ''), contentId);
    else return json({ error: 'Invalid action' }, { status: 400, headers });
    return redirect(`/dashboard/instagram/content/${contentId}?notice=saved`, { headers });
  } catch (error) {
    const code = error instanceof IntegrationFailure ? error.code : 'database_unavailable';
    return redirect(`/dashboard/instagram/content/${contentId}?error=${encodeURIComponent(code)}`, { headers });
  }
}

export default function InstagramContentDetail() {
  const { content, accounts, assignments, notice, error } = useLoaderData<typeof loader>();
  const busy = useNavigation().state !== 'idle';
  const byAccount = new Map(assignments.map((item) => [item.instagram_account_id, item]));
  const published = assignments.filter((item) => item.status === 'published').length;
  const scheduled = assignments.filter((item) => ['scheduled', 'preparing', 'container_created', 'processing', 'ready', 'publishing'].includes(item.status)).length;
  const failed = assignments.filter((item) => ['failed', 'publish_uncertain'].includes(item.status)).length;
  const unused = accounts.filter((item) => !byAccount.has(item.id));
  return <InstagramShell active="Content library">
    <div className="ig-control-head"><div><a className="ig-back" href="/dashboard/instagram/content">Content library</a>
      <h1>{contentLabel(content.content_number)}</h1><p>{content.title || content.caption.slice(0, 90)}</p></div>
      <StateBadge status={content.status} />
    </div>
    {notice === 'saved' && <p className="ig-notice" role="status">Content updated. Existing publication captions remain unchanged.</p>}
    {error && <p className="ig-error" role="alert">{error === 'duplicate_assignment' ? 'This account already has this content.'
      : error === 'content_in_process' ? 'This content has a Reel being processed. Review its outcome before archiving.'
        : 'The change could not be saved.'}</p>}
    <div className="ig-content-detail-grid">
      <section className="ig-panel"><h2>Content</h2>
        {content.cover_storage_path && <img className="ig-detail-cover" src={`/api/instagram/content/cover/${content.id}`} alt={`Cover for ${contentLabel(content.content_number)}`} />}
        <Form method="post" className="ig-settings-form"><input type="hidden" name="intent" value="save" />
          <label>Title<input name="title" defaultValue={content.title} maxLength={200} /></label>
          <label>Caption<textarea name="caption" defaultValue={content.caption} maxLength={2200} rows={8} required /></label>
          <button className="ig-button" disabled={busy}>Save text</button></Form>
        <p className="ig-hint">Changes affect future assignments. Scheduled and published posts keep their original caption.</p>
      </section>
      <section className="ig-panel"><h2>Video information</h2><dl className="ig-details">
        <div><dt>File size</dt><dd>{content.file_size_bytes ? `${(content.file_size_bytes / 1048576).toFixed(1)} MB` : '—'}</dd></div>
        <div><dt>Duration</dt><dd>{content.duration_seconds ? `${content.duration_seconds} sec` : 'Not available'}</dd></div>
        <div><dt>Resolution</dt><dd>{content.width && content.height ? `${content.width} × ${content.height}` : 'Not available'}</dd></div>
        <div><dt>Format</dt><dd>MP4 · JPEG cover</dd></div>
        <div><dt>Created</dt><dd>{readableDate(content.created_at)}</dd></div>
        <div><dt>Status</dt><dd>{content.status}</dd></div>
      </dl>
        {content.status !== 'archived' && <Form method="post"><input type="hidden" name="intent" value="archive" />
          <button className="ig-button" disabled={busy}>Archive content</button></Form>}
      </section>
    </div>
    <section className="ig-panel ig-overview-bottom"><div className="ig-section-head"><h2>Instagram distribution</h2><span>{accounts.length} accounts</span></div>
      <div className="ig-metrics ig-metrics-four"><div><span>Published</span><strong>{published}</strong></div>
        <div><span>Scheduled or processing</span><strong>{scheduled}</strong></div><div><span>Unused</span><strong>{unused.length}</strong></div>
        <div><span>Failed</span><strong>{failed}</strong></div></div>
      {content.status === 'ready' && unused.length > 0 && <Form method="post" className="ig-inline-form"><input type="hidden" name="intent" value="assign" />
        <label>Assign to account<select name="accountId" required defaultValue=""><option value="" disabled>Choose account</option>
          {unused.map((account) => <option key={account.id} value={account.id}>@{account.username}</option>)}</select></label>
        <button className="ig-button" disabled={busy}>Add to queue</button></Form>}
      <div className="ig-list ig-distribution-list">{accounts.map((account) => {
        const assignment = byAccount.get(account.id);
        return <div className="ig-list-row" key={account.id}><a href={`/dashboard/instagram/accounts/${account.id}`}><strong>@{account.username}</strong></a>
          <StateBadge status={assignment?.status ?? 'unused'} />
          <span>{assignment?.published_at ? readableDate(assignment.published_at) : assignment?.scheduled_at ? readableDate(assignment.scheduled_at) : '—'}</span>
          {assignment?.instagram_media_id && <small>Meta ID {assignment.instagram_media_id}</small>}
          {assignment?.last_error_code && <small>{assignment.last_error_summary ?? assignment.last_error_code}</small>}</div>;
      })}</div>
      {!accounts.length && <p className="ig-empty">Connect an Instagram account to see its distribution status here.</p>}
    </section>
  </InstagramShell>;
}
