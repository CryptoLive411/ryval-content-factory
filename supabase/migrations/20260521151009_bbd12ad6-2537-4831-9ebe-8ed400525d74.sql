alter table public.posts
  add column if not exists bg_image_url text,
  add column if not exists app_screen_url text,
  add column if not exists logo_url text;