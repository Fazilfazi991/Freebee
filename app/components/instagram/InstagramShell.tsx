import type { ReactNode } from 'react';
import { Form } from '@remix-run/react';

const navigation = [
  { href: '/dashboard/integrations/instagram', label: 'Overview' },
  { href: '/dashboard/instagram/accounts', label: 'Accounts' },
  { href: '/dashboard/instagram/content', label: 'Content library' },
  { href: '/dashboard/instagram/schedule', label: 'Schedule' },
];

export function InstagramShell({ active, children }: { active: string; children: ReactNode }) {
  return <main className="ig-page ig-control-page">
    <header className="ig-topbar">
      <a className="ig-wordmark" href="/dashboard">IncomeNow <span>Dashboard</span></a>
      <Form method="post" action="/dashboard/logout"><button className="ig-button ig-button-subtle" type="submit">Sign out</button></Form>
    </header>
    <div className="ig-control-shell">
      <nav className="ig-control-nav" aria-label="Instagram publishing">
        {navigation.map((item) => <a key={item.href} href={item.href}
          aria-current={active === item.label ? 'page' : undefined}>{item.label}</a>)}
      </nav>
      {children}
    </div>
  </main>;
}

export function StateBadge({ status }: { status: string }) {
  return <span className={`ig-state-badge ig-state-${status.replace(/[^a-z_]/giu, '').toLowerCase()}`}>{status.replaceAll('_', ' ')}</span>;
}

export function contentLabel(number: number): string { return `V${String(number).padStart(3, '0')}`; }

export function readableDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
}
