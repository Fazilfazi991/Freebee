-- One-account, one-published-Reel smoke test. Public Data API roles cannot access this table.
create table public.instagram_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  instagram_connection_id uuid not null references public.instagram_connections(id) on delete restrict,
  instagram_user_id text not null check (instagram_user_id = '17841426407668459'),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  source_host text not null check (char_length(source_host) between 1 and 255),
  source_url_sha256 text not null check (source_url_sha256 ~ '^[0-9a-f]{64}$'),
  caption text not null check (char_length(caption) between 1 and 2200),
  share_to_feed boolean not null default false check (share_to_feed = false),
  container_id text check (container_id ~ '^[0-9]{10,25}$'),
  container_status text check (container_status in ('IN_PROGRESS', 'FINISHED', 'ERROR', 'EXPIRED', 'PUBLISHED')),
  media_id text unique check (media_id ~ '^[0-9]{10,25}$'),
  status text not null check (status in (
    'pending', 'container_created', 'processing', 'ready', 'publishing',
    'published', 'failed', 'publish_uncertain'
  )),
  failure_code text check (failure_code ~ '^[a-z0-9_]{1,80}$'),
  status_checks integer not null default 0 check (status_checks between 0 and 5),
  last_checked_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (created_by = owner_user_id),
  check (status <> 'ready' or (container_id is not null and container_status = 'FINISHED')),
  check (status <> 'published' or (container_id is not null and media_id is not null and published_at is not null))
);

-- Failed preparation/processing attempts may be retried. Every other state reserves this
-- account, including uncertain outcomes and the single successfully published Reel.
create unique index instagram_publish_one_active_per_account_idx
  on public.instagram_publish_attempts (instagram_user_id)
  where status <> 'failed';

create index instagram_publish_attempts_owner_created_idx
  on public.instagram_publish_attempts (owner_user_id, instagram_user_id, created_at desc);

alter table public.instagram_publish_attempts enable row level security;
revoke all on public.instagram_publish_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.instagram_publish_attempts to service_role;
