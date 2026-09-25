import { json, redirect, type ActionFunctionArgs, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { useMemo, useState } from 'react';
import { InstagramShell, StateBadge, contentLabel, readableDate } from '~/components/instagram/InstagramShell';
import { ContentUploader } from '~/components/instagram/ContentUploader';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig, isSameOriginPost } from '~/lib/integrations/instagram/config.server';
import { listAssignments, listContent } from '~/lib/integrations/instagram/control-db.server';
import { archiveContent, beginContentUpload, finalizeContentUpload } from '~/lib/integrations/instagram/content-workflow.server';
import { listInstagramAccounts, IntegrationFailure } from '~/lib/integrations/instagram/supabase.server';
import stylesUrl from '~/styles/instagram-dashboard.css?url';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesUrl }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const [content, assignments, accounts] = await Promise.all([
    listContent(config, admin.userId), listAssignments(config, admin.userId),
    listInstagramAccounts(config, admin.userId),
  ]);
  return json({ content, assignments, accounts, notice: new URL(request.url).searchParams.get('notice') },
    { headers: privateHeaders(admin) });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (!isSameOriginPost(request)) return json({ error: 'Forbidden' }, { status: 403 });
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const headers = privateHeaders(admin);
  try {
    if (intent === 'begin_upload') {
      const result = await beginContentUpload(config, admin.userId, {
        title: String(form.get('title') ?? ''), caption: String(form.get('caption') ?? ''),
        videoHash: String(form.get('videoHash') ?? ''), coverHash: String(form.get('coverHash') ?? ''),
        videoSize: Number(form.get('videoSize')), coverSize: Number(form.get('coverSize')),
      });
      return json({ contentId: result.content.id, contentNumber: result.content.content_number,
        videoUploadUrl: result.videoUploadUrl, coverUploadUrl: result.coverUploadUrl }, { headers });
    }
    if (intent === 'finalize_upload') {
      const result = await finalizeContentUpload(config, admin.userId, String(form.get('contentId') ?? ''), {
        durationSeconds: form.has('durationSeconds') ? Number(form.get('durationSeconds')) : undefined,
        width: form.has('width') ? Number(form.get('width')) : undefined,
        height: form.has('height') ? Number(form.get('height')) : undefined,
      });
      return json({ contentId: result.id, contentNumber: result.content_number, status: result.status }, { headers });
    }
    if (intent === 'archive') {
      await archiveContent(config, admin.userId, String(form.get('contentId') ?? ''));
      return redirect('/dashboard/instagram/content?notice=archived', { headers });
    }
    return json({ error: 'Invalid action' }, { status: 400, headers });
  } catch (error) {
    const code = error instanceof IntegrationFailure ? error.code : 'database_unavailable';
    return json({ error: code }, { status: 400, headers });
  }
}

export default function InstagramContentLibrary() {
  const { content, assignments, accounts, notice } = useLoaderData<typeof loader>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const visible = useMemo(() => content.filter((item) => (filter === 'all' || item.status === filter) &&
    `${contentLabel(item.content_number)} ${item.title} ${item.caption}`.toLowerCase().includes(search.toLowerCase())),
  [content, filter, search]);
  return <InstagramShell active="Content library">
    <div className="ig-control-head"><div><p className="ig-kicker">Prepared media</p><h1>Content library</h1>
      <p>Upload a video, caption, and cover once. Assign it independently to each Instagram account.</p></div></div>
    {notice === 'archived' && <p className="ig-notice" role="status">Content archived. Its publication history remains available.</p>}
    <ContentUploader />
    <div className="ig-metrics ig-metrics-three">
      <div><span>Total items</span><strong>{content.length}</strong></div>
      <div><span>Ready</span><strong>{content.filter((item) => item.status === 'ready').length}</strong></div>
      <div><span>Needs review</span><strong>{content.filter((item) => ['draft', 'invalid'].includes(item.status)).length}</strong></div>
    </div>
    <section className="ig-panel ig-table-panel"><div className="ig-section-head"><h2>All content</h2><span>{visible.length} shown</span></div>
      <div className="ig-library-filters"><label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Number, title, or caption" /></label>
        <label>Status<select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All</option><option value="ready">Ready</option><option value="draft">Draft</option>
          <option value="invalid">Invalid</option><option value="archived">Archived</option></select></label></div>
      {visible.length ? <div className="ig-content-list">{visible.map((item) => {
        const usage = assignments.filter((assignment) => assignment.content_id === item.id);
        const posted = usage.filter((assignment) => assignment.status === 'published').length;
        const scheduled = usage.filter((assignment) => ['scheduled', 'preparing', 'container_created', 'processing', 'ready', 'publishing'].includes(assignment.status)).length;
        return <a href={`/dashboard/instagram/content/${item.id}`} className="ig-content-row" key={item.id}>
          <div className="ig-cover-thumb">{item.cover_storage_path ? <img src={`/api/instagram/content/cover/${item.id}`} alt="" loading="lazy" /> : contentLabel(item.content_number)}</div>
          <div><strong>{contentLabel(item.content_number)} <span>{item.title || item.caption.slice(0, 58)}</span></strong><small>Added {readableDate(item.created_at)}</small></div>
          <StateBadge status={item.status} />
          <div className="ig-usage"><strong>{posted} / {accounts.length}</strong><small>posted · {scheduled} scheduled</small></div>
          <span className="ig-row-arrow" aria-hidden="true">›</span>
        </a>;
      })}</div> : <p className="ig-empty">No content matches this view.</p>}
    </section>
  </InstagramShell>;
}
