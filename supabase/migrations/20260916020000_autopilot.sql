-- Autopilot: hourly generate/schedule preferences

alter table public.user_settings
  add column if not exists autopilot_enabled boolean not null default false,
  add column if not exists autopilot_interval_hours int not null default 1,
  add column if not exists autopilot_queue_hours int not null default 12,
  add column if not exists preferred_privacy text not null default 'PUBLIC_TO_EVERYONE';

alter table public.user_settings
  drop constraint if exists user_settings_interval_chk;
alter table public.user_settings
  add constraint user_settings_interval_chk
  check (autopilot_interval_hours between 1 and 12);

alter table public.user_settings
  drop constraint if exists user_settings_queue_chk;
alter table public.user_settings
  add constraint user_settings_queue_chk
  check (autopilot_queue_hours between 1 and 48);
