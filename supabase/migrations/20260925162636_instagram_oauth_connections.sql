-- The tables are intentionally inaccessible to browser Data API roles.
-- Only the server's Supabase secret/service role can read or write them.
create table public.instagram_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  instagram_user_id text not null,
  username text not null,
  account_type text not null,
  access_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null check (status in ('connected', 'disconnected')),
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (owner_user_id, instagram_user_id),
  check (status <> 'connected' or (access_token_encrypted is not null and token_expires_at is not null))
);

create table public.instagram_oauth_states (
  state_hash text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  session_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index instagram_oauth_states_expiry_idx on public.instagram_oauth_states (expires_at);

alter table public.instagram_connections enable row level security;
alter table public.instagram_oauth_states enable row level security;

revoke all on public.instagram_connections from public, anon, authenticated;
revoke all on public.instagram_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on public.instagram_connections to service_role;
grant select, insert, update, delete on public.instagram_oauth_states to service_role;
