-- Rights-tracked image library. Nothing renders unless safe_to_use is true.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  source_url text,
  credit text,
  license text,
  license_status text not null default 'unknown',
  origin text not null,
  tags text[] not null default '{}',
  subject_people text[] not null default '{}',
  subject_program text,
  sport text,
  orientation text not null default 'horizontal',
  best_use text[] not null default '{}',
  safe_to_use boolean not null default false,
  width int,
  height int,
  notes text,
  last_used_at timestamptz,
  use_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.media_assets
  drop constraint if exists media_assets_license_status_chk;
alter table public.media_assets
  add constraint media_assets_license_status_chk
  check (license_status in ('owned', 'permission_granted', 'rights_cleared', 'attribution_required', 'unknown', 'blocked'));

-- Selection order from the content spec: Ryval first, generic stock last.
alter table public.media_assets
  drop constraint if exists media_assets_origin_chk;
alter table public.media_assets
  add constraint media_assets_origin_chk
  check (origin in ('ryval_owned', 'player_submitted', 'licensed_stock', 'school_media', 'generic_stock'));

alter table public.media_assets
  drop constraint if exists media_assets_orientation_chk;
alter table public.media_assets
  add constraint media_assets_orientation_chk
  check (orientation in ('vertical', 'square', 'horizontal'));

create unique index if not exists media_assets_url_key on public.media_assets (url);
create index if not exists media_assets_pick_idx
  on public.media_assets (safe_to_use, origin, subject_program);
create index if not exists media_assets_tags_idx on public.media_assets using gin (tags);

alter table public.media_assets enable row level security;

drop policy if exists "read media assets" on public.media_assets;
create policy "read media assets" on public.media_assets for all to authenticated
  using (true) with check (true);
