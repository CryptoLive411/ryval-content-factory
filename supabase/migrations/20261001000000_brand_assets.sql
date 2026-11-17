-- Program branding: real logos, wordmarks and team colours with a verification trail.
-- Facts and branding must be real even when the background art is generated.

create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  school_id text,
  program_name text not null,
  conference text,
  division text,
  association text,
  team text,
  primary_logo_url text,
  secondary_logo_url text,
  wordmark_url text,
  primary_color text,
  secondary_color text,
  governing_logo_url text,
  source_url text,
  permission_status text not null default 'unverified',
  safe_to_use boolean not null default false,
  confidence int not null default 0,
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.brand_assets
  drop constraint if exists brand_assets_permission_chk;
alter table public.brand_assets
  add constraint brand_assets_permission_chk
  check (permission_status in ('ncaa_partnership', 'granted', 'fair_use_editorial', 'unverified', 'blocked'));

alter table public.brand_assets
  drop constraint if exists brand_assets_confidence_chk;
alter table public.brand_assets
  add constraint brand_assets_confidence_chk
  check (confidence between 0 and 100);

create unique index if not exists brand_assets_program_team_key
  on public.brand_assets (program_name, coalesce(team, ''));
create index if not exists brand_assets_school_idx on public.brand_assets (school_id);
create index if not exists brand_assets_pick_idx on public.brand_assets (safe_to_use, confidence desc);

alter table public.brand_assets enable row level security;

drop policy if exists "read brand assets" on public.brand_assets;
create policy "read brand assets" on public.brand_assets for all to authenticated
  using (true) with check (true);

-- Generated background art needs its own origin so it is never mistaken for a real photo.
alter table public.media_assets
  drop constraint if exists media_assets_origin_chk;
alter table public.media_assets
  add constraint media_assets_origin_chk
  check (origin in (
    'ryval_owned', 'player_submitted', 'licensed_stock', 'school_media',
    'generic_stock', 'ai_generated', 'manual_override'
  ));

alter table public.media_assets
  add column if not exists generated_prompt text,
  add column if not exists story_id uuid references public.stories (id) on delete set null;

-- Manual story entry for transfers, commitments and anything with no usable feed.
alter table public.stories
  add column if not exists entry_mode text not null default 'ingested',
  add column if not exists bucket text,
  add column if not exists manual_notes text,
  add column if not exists override_image_url text,
  add column if not exists brand_asset_id uuid references public.brand_assets (id) on delete set null,
  add column if not exists show_logos boolean not null default true;

alter table public.stories
  drop constraint if exists stories_entry_mode_chk;
alter table public.stories
  add constraint stories_entry_mode_chk
  check (entry_mode in ('ingested', 'manual'));
