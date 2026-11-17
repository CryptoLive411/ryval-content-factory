-- ON CONFLICT cannot target an expression index, so team needs a real default.

drop index if exists public.brand_assets_program_team_key;

update public.brand_assets set team = '' where team is null;

alter table public.brand_assets
  alter column team set default '',
  alter column team set not null;

create unique index if not exists brand_assets_program_team_key
  on public.brand_assets (program_name, team);
