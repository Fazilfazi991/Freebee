import { json, type LinksFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { InstagramShell, StateBadge, readableDate } from '~/components/instagram/InstagramShell';
import { privateHeaders, requireAdmin } from '~/lib/integrations/instagram/admin-auth.server';
import { getInstagramConfig } from '~/lib/integrations/instagram/config.server';
import { listAssignments } from '~/lib/integrations/instagram/control-db.server';
import { listInstagramAccounts } from '~/lib/integrations/instagram/supabase.server';
import stylesUrl from '~/styles/instagram-dashboard.css?url';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesUrl }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const config = getInstagramConfig(context);
  const admin = await requireAdmin(request, config);
  const [accounts, assignments] = await Promise.all([
    listInstagramAccounts(config, admin.userId), listAssignments(config, admin.userId),
  ]);
  return json({ accounts, assignments, error: new URL(request.url).searchParams.get('error') },
    { headers: privateHeaders(admin) });
}

export default function InstagramAccounts() {
  const { accounts, assignments, error } = useLoaderData<typeof loader>();
  return <InstagramShell active="Accounts">
    <div className="ig-control-head"><div><p className="ig-kicker">Connected destinations</p><h1>Instagram accounts</h1>
      <p>Each account keeps its own schedule, content order, and publication history.</p></div>
      <a className="ig-button ig-button-primary" href="/api/integrations/instagram/connect">Connect Instagram account</a>
    </div>
    {error && <p className="ig-error" role="alert">The selected account could not be found. Open an account from this list and try again.</p>}
    <p className="ig-hint">Meta currently limits this Development-mode app to authorized testers and app roles. Other accounts may require Meta review before they can connect.</p>
    <div className="ig-metrics ig-metrics-three">
      <div><span>Total accounts</span><strong>{accounts.length}</strong></div>
      <div><span>Connected</span><strong>{accounts.filter((item) => item.status === 'connected').length}</strong></div>
      <div><span>Needs attention</span><strong>{accounts.filter((item) => item.status !== 'connected' || (item.token_expires_at && Date.parse(item.token_expires_at) < Date.now())).length}</strong></div>
    </div>
    <section className="ig-panel ig-table-panel" aria-label="Instagram accounts">
      {accounts.length ? <div className="ig-account-list">{accounts.map((account) => {
        const history = assignments.filter((item) => item.instagram_account_id === account.id);
        const next = history.filter((item) => item.status === 'scheduled' && item.scheduled_at)
          .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!))[0];
        const expired = account.token_expires_at && Date.parse(account.token_expires_at) <= Date.now();
        return <a className="ig-account-row" key={account.id} href={`/dashboard/instagram/accounts/${account.id}`}>
          <div><strong>@{account.username}</strong><small>{account.instagram_user_id}</small></div>
          <StateBadge status={expired ? 'reconnect' : account.status} />
          <div><span>{account.posts_per_day ?? 2} posts/day</span><small>Feed {account.default_share_to_feed ? 'on' : 'off'} · {account.posting_enabled ? 'Posting on' : 'Posting paused'}</small></div>
          <div><span>Last post {readableDate(account.last_publish_at)}</span><small>Next {readableDate(next?.scheduled_at)}</small></div>
          <span className="ig-row-arrow" aria-hidden="true">›</span>
        </a>;
      })}</div> : <p className="ig-empty">No accounts connected yet. Connect an Instagram Professional account to start.</p>}
    </section>
  </InstagramShell>;
}
