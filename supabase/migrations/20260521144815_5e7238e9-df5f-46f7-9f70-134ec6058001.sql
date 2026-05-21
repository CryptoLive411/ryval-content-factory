
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

drop policy if exists "public read assets" on storage.objects;
create policy "owner list assets" on storage.objects for select to authenticated
  using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);
