-- Trusted source registry and the normalized stories we ingest from them.

create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  feed_url text,
  category text not null,
  source_type text not null,
  reliability text not null default 'medium',
  update_frequency_minutes int not null default 120,
  last_checked_at timestamptz,
  last_status text,
  enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.content_sources
  drop constraint if exists content_sources_reliability_chk;
alter table public.content_sources
  add constraint content_sources_reliability_chk
  check (reliability in ('high', 'medium', 'low'));

alter table public.content_sources
  drop constraint if exists content_sources_type_chk;
alter table public.content_sources
  add constraint content_sources_type_chk
  check (source_type in (
    'official_ncaa', 'school_site', 'conference_site', 'ranking_site',
    'news_site', 'social_account', 'ryval_internal'
  ));

create unique index if not exists content_sources_url_key on public.content_sources (url);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.content_sources (id) on delete set null,
  source_name text not null,
  source_url text not null,
  story_url text not null,
  title text not null,
  summary text,
  published_at timestamptz,
  category text,
  suggested_format text,
  players jsonb not null default '[]'::jsonb,
  schools jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  image_url text,
  relevance_score int not null default 0,
  needs_review boolean not null default false,
  review_reason text,
  status text not null default 'new',
  post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.stories
  drop constraint if exists stories_status_chk;
alter table public.stories
  add constraint stories_status_chk
  check (status in ('new', 'approved', 'rejected', 'used'));

-- One row per story URL so re-polling a feed does not duplicate the queue.
create unique index if not exists stories_story_url_key on public.stories (story_url);
create index if not exists stories_status_score_idx
  on public.stories (status, relevance_score desc, published_at desc);

alter table public.content_sources enable row level security;
alter table public.stories enable row level security;

drop policy if exists "read content sources" on public.content_sources;
create policy "read content sources" on public.content_sources for all to authenticated
  using (true) with check (true);

drop policy if exists "read stories" on public.stories;
create policy "read stories" on public.stories for all to authenticated
  using (true) with check (true);

insert into public.content_sources (name, url, feed_url, category, source_type, reliability, update_frequency_minutes, notes)
values
  ('NCAA.com — DI Men''s Soccer', 'https://www.ncaa.com/news/soccer-men/d1',
   'https://ncaa-api.henrygd.me/news/soccer-men/d1', 'NCAA official news', 'official_ncaa', 'high', 120,
   'Official NCAA articles via the ncaa-api mirror.'),
  ('NCAA.com — DI Women''s Soccer', 'https://www.ncaa.com/news/soccer-women/d1',
   'https://ncaa-api.henrygd.me/news/soccer-women/d1', 'NCAA official news', 'official_ncaa', 'high', 120,
   'Official NCAA articles via the ncaa-api mirror.'),
  -- No feed_url: this one is read directly by the current-season lane, not polled as RSS.
  ('NCAA.com — DI Stat Leaderboards', 'https://www.ncaa.com/stats/soccer-women/d1',
   null, 'NCAA official stats', 'official_ncaa', 'high', 240,
   'Records, rankings, goal and assist leaders. Powers the current-season lane.'),
  ('College Soccer News', 'https://collegesoccernews.com', 'https://collegesoccernews.com/feed/',
   'College soccer news', 'news_site', 'medium', 120, null),
  ('United Soccer Coaches', 'https://unitedsoccercoaches.org', 'https://unitedsoccercoaches.org/feed/',
   'Rankings and polls', 'ranking_site', 'high', 360, 'Weekly national polls.'),
  ('TopDrawerSoccer', 'https://www.topdrawersoccer.com', 'https://www.topdrawersoccer.com/feed/',
   'Recruiting and commitments', 'news_site', 'medium', 180, 'Low feed volume; most content is behind the site.'),
  ('SoccerWire', 'https://www.soccerwire.com', 'https://www.soccerwire.com/feed/',
   'Youth and college soccer news', 'news_site', 'medium', 180, 'Feed returned no items on last check.'),
  ('Ryval app data', 'https://ryval.app', null, 'Ryval internal data', 'ryval_internal', 'high', 60,
   'Player profiles, posts, opportunities and coach activity inside Ryval.')
on conflict (url) do nothing;

update public.content_sources set enabled = false
where url = 'https://www.soccerwire.com' and last_checked_at is null;
