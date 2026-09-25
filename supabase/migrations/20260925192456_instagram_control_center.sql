-- Preserve the proven Instagram Login connection and its published smoke-test history.
-- Every control-center table is server-only; browser roles have no Data API grants.
alter table public.instagram_connections
  add column display_name text,
  add column default_share_to_feed boolean not null default true,
  add column posting_enabled boolean not null default false,
  add column ordering_mode text not null default 'smart_random'
    check (ordering_mode in ('sequential', 'random', 'smart_random')),
  add column posts_per_day integer not null default 2 check (posts_per_day between 1 and 12),
  add column timezone text not null default 'Asia/Dubai',
  add column last_publish_at timestamptz,
  add column auth_failure_count integer not null default 0 check (auth_failure_count >= 0);
alter table public.instagram_connections
  add constraint instagram_connections_id_owner_unique unique (id, owner_user_id);
create unique index instagram_connections_instagram_user_unique_idx
  on public.instagram_connections (instagram_user_id);
alter table public.instagram_oauth_states
  add column target_instagram_user_id text
    check (target_instagram_user_id ~ '^[0-9]{10,25}$');

create index instagram_connections_owner_status_idx
  on public.instagram_connections (owner_user_id, status, updated_at desc);

create table public.instagram_publishing_settings (
  singleton boolean primary key default true check (singleton),
  auto_publish boolean not null default false,
  pause_all boolean not null default false,
  updated_by uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);
insert into public.instagram_publishing_settings (singleton, auto_publish, pause_all)
values (true, false, false);

create sequence public.instagram_content_number_seq as bigint start with 1;

create table public.instagram_content (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  content_number bigint not null default nextval('public.instagram_content_number_seq') unique,
  title text not null default '' check (char_length(title) <= 200),
  caption text not null check (char_length(caption) between 1 and 2200),
  video_storage_path text unique,
  cover_storage_path text unique,
  video_sha256 text check (video_sha256 ~ '^[0-9a-f]{64}$'),
  cover_sha256 text check (cover_sha256 ~ '^[0-9a-f]{64}$'),
  file_size_bytes bigint check (file_size_bytes between 1 and 52428800),
  duration_seconds numeric(8,3) check (duration_seconds between 3 and 900),
  width integer check (width between 1 and 1920),
  height integer check (height between 1 and 4096),
  video_codec text check (char_length(video_codec) <= 40),
  audio_codec text check (char_length(audio_codec) <= 40),
  status text not null default 'draft' check (status in ('draft', 'ready', 'invalid', 'archived')),
  validation_code text check (validation_code ~ '^[a-z0-9_]{1,80}$'),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'ready' or (video_storage_path is not null and cover_storage_path is not null and validated_at is not null))
);
alter table public.instagram_content
  add constraint instagram_content_id_owner_unique unique (id, owner_user_id);
create index instagram_content_owner_status_idx
  on public.instagram_content (owner_user_id, status, content_number desc);
create index instagram_content_video_hash_idx
  on public.instagram_content (video_sha256) where video_sha256 is not null;
create unique index instagram_content_owner_video_hash_unique_idx
  on public.instagram_content (owner_user_id, video_sha256)
  where video_sha256 is not null and status <> 'archived';

create table public.instagram_posting_slots (
  id uuid primary key default gen_random_uuid(),
  instagram_account_id uuid not null references public.instagram_connections(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  time_of_day time without time zone not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instagram_account_id, time_of_day),
  foreign key (instagram_account_id, owner_user_id)
    references public.instagram_connections(id, owner_user_id) on delete restrict
);
create index instagram_posting_slots_owner_idx
  on public.instagram_posting_slots (owner_user_id, instagram_account_id, enabled);

create table public.instagram_account_content (
  id uuid primary key default gen_random_uuid(),
  instagram_account_id uuid not null references public.instagram_connections(id) on delete restrict,
  content_id uuid not null references public.instagram_content(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  posting_slot_id uuid references public.instagram_posting_slots(id) on delete restrict,
  slot_local_date date,
  status text not null default 'queued' check (status in (
    'queued', 'scheduled', 'preparing', 'container_created', 'processing',
    'ready', 'publishing', 'published', 'failed', 'skipped', 'cancelled', 'publish_uncertain'
  )),
  order_position bigint,
  scheduled_at timestamptz,
  started_at timestamptz,
  published_at timestamptz,
  caption_snapshot text not null check (char_length(caption_snapshot) between 1 and 2200),
  share_to_feed boolean not null default true,
  cover_storage_path_snapshot text,
  instagram_container_id text unique check (instagram_container_id ~ '^[0-9]{10,25}$'),
  instagram_media_id text unique check (instagram_media_id ~ '^[0-9]{10,25}$'),
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  status_checks integer not null default 0 check (status_checks between 0 and 20),
  last_checked_at timestamptz,
  last_error_code text check (last_error_code ~ '^[a-z0-9_]{1,80}$'),
  last_error_summary text check (char_length(last_error_summary) <= 300),
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instagram_account_id, content_id),
  check ((posting_slot_id is null) = (slot_local_date is null)),
  check (status <> 'scheduled' or scheduled_at is not null),
  check (status <> 'published' or (instagram_media_id is not null and published_at is not null))
);
alter table public.instagram_account_content
  add constraint instagram_assignment_account_owner_fk
    foreign key (instagram_account_id, owner_user_id)
    references public.instagram_connections(id, owner_user_id) on delete restrict,
  add constraint instagram_assignment_content_owner_fk
    foreign key (content_id, owner_user_id)
    references public.instagram_content(id, owner_user_id) on delete restrict;
create index instagram_account_content_due_idx
  on public.instagram_account_content (scheduled_at, id)
  where status in ('scheduled', 'processing', 'ready');
create unique index instagram_account_content_active_slot_unique_idx
  on public.instagram_account_content (posting_slot_id, slot_local_date)
  where posting_slot_id is not null and status not in ('cancelled', 'skipped', 'failed');
create index instagram_account_content_account_idx
  on public.instagram_account_content (instagram_account_id, scheduled_at desc, created_at desc);
create index instagram_account_content_content_idx
  on public.instagram_account_content (content_id, status, scheduled_at);

create table public.instagram_publication_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.instagram_account_content(id) on delete restrict,
  attempt_number integer not null check (attempt_number between 1 and 20),
  container_id text check (container_id ~ '^[0-9]{10,25}$'),
  media_id text unique check (media_id ~ '^[0-9]{10,25}$'),
  status text not null check (status in (
    'preparing', 'container_created', 'processing', 'ready', 'publishing',
    'published', 'failed', 'publish_uncertain'
  )),
  safe_error_code text check (safe_error_code ~ '^[a-z0-9_]{1,80}$'),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (assignment_id, attempt_number)
);
create index instagram_publication_attempts_assignment_idx
  on public.instagram_publication_attempts (assignment_id, started_at desc);

-- Private objects become fetchable by Meta only through short-lived signed download URLs.
-- The project is currently on Supabase Free, whose global file limit is 50 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('instagram-content', 'instagram-content', false, 52428800,
  array['video/mp4', 'image/jpeg'])
on conflict (id) do nothing;

alter table public.instagram_publishing_settings enable row level security;
alter table public.instagram_content enable row level security;
alter table public.instagram_posting_slots enable row level security;
alter table public.instagram_account_content enable row level security;
alter table public.instagram_publication_attempts enable row level security;

revoke all on public.instagram_publishing_settings, public.instagram_content,
  public.instagram_posting_slots, public.instagram_account_content,
  public.instagram_publication_attempts from public, anon, authenticated;
grant select, insert, update on public.instagram_publishing_settings, public.instagram_content,
  public.instagram_posting_slots, public.instagram_account_content,
  public.instagram_publication_attempts to service_role;
revoke all on sequence public.instagram_content_number_seq from public, anon, authenticated;
grant usage, select on sequence public.instagram_content_number_seq to service_role;
