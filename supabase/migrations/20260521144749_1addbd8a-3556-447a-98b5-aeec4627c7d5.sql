
-- ============ ENUMS ============
create type public.post_status as enum (
  'idea','drafted','needs_edit','approved','designed','scheduled','posted','winner','reuse_later'
);
create type public.platform as enum ('tiktok','instagram','youtube_shorts','linkedin');
create type public.audience as enum ('players','parents','coaches','academies','international');
create type public.category as enum (
  'harsh_truths','highlight_tips','coach_pov','parent_education',
  'international_pathway','soft_pitch','launch_countdown','product_feature','educational','pain_point'
);
create type public.account as enum ('ryval_main','recruiting_truth','global_pathway','founder');

-- ============ POSTS ============
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hook text not null default '',
  slide_2 text default '',
  slide_3 text default '',
  slide_4 text default '',
  slide_5 text default '',
  slide_6 text default '',
  cta text default '',
  caption text default '',
  hashtags text default '',
  category public.category,
  audience public.audience,
  platform public.platform,
  account public.account,
  status public.post_status not null default 'idea',
  scheduled_date timestamptz,
  cta_type text,
  asset_id uuid,
  template_id uuid,
  notes text default '',
  is_winner boolean not null default false,
  tone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ ASSETS ============
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  asset_type text,
  tags text[] default '{}',
  description text default '',
  created_at timestamptz not null default now()
);

-- ============ TEMPLATES ============
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_name text not null,
  background_style text not null default 'dark_premium',
  font_style text not null default 'sans',
  logo_position text not null default 'bottom_left',
  cta_style text not null default 'pill',
  accent_color text not null default '#3b82f6',
  created_at timestamptz not null default now()
);

-- ============ PERFORMANCE ============
create table public.performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  views int not null default 0,
  likes int not null default 0,
  comments int not null default 0,
  shares int not null default 0,
  saves int not null default 0,
  profile_visits int not null default 0,
  link_clicks int not null default 0,
  signups int not null default 0,
  notes text default '',
  created_at timestamptz not null default now()
);

-- ============ PROMPT TEMPLATES ============
create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  prompt_text text not null,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ PLANNER ============
create table public.planner_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  plan_time text,
  platform public.platform,
  account public.account,
  post_id uuid references public.posts(id) on delete set null,
  status public.post_status not null default 'idea',
  notes text default '',
  created_at timestamptz not null default now()
);

-- ============ TRIGGERS for updated_at ============
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger posts_set_updated_at before update on public.posts
  for each row execute function public.tg_set_updated_at();
create trigger prompts_set_updated_at before update on public.prompt_templates
  for each row execute function public.tg_set_updated_at();

-- ============ RLS ============
alter table public.posts enable row level security;
alter table public.assets enable row level security;
alter table public.templates enable row level security;
alter table public.performance enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.planner_entries enable row level security;

create policy "own posts" on public.posts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own assets" on public.assets for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own templates" on public.templates for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own performance" on public.performance for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own prompts" on public.prompt_templates for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own planner" on public.planner_entries for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ STORAGE BUCKET ============
insert into storage.buckets (id, name, public) values ('assets','assets',true)
  on conflict (id) do nothing;

create policy "public read assets" on storage.objects for select
  using (bucket_id = 'assets');
create policy "auth upload assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner update assets" on storage.objects for update to authenticated
  using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner delete assets" on storage.objects for delete to authenticated
  using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);
