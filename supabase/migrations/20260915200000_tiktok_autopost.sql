-- TikTok autopost + composed export URLs + generation cursor

create table if not exists public.tiktok_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  open_id text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  scopes text default '',
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, open_id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generation_cursor int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.posts
  add column if not exists export_slide_urls text[] not null default '{}',
  add column if not exists tiktok_publish_id text,
  add column if not exists tiktok_status text,
  add column if not exists tiktok_error text,
  add column if not exists posted_at timestamptz,
  add column if not exists tiktok_privacy_level text;

create trigger tiktok_accounts_set_updated_at before update on public.tiktok_accounts
  for each row execute function public.tg_set_updated_at();

alter table public.tiktok_accounts enable row level security;
alter table public.user_settings enable row level security;

create policy "own tiktok accounts" on public.tiktok_accounts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own user settings" on public.user_settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
