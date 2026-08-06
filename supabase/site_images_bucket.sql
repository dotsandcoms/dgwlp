-- Website images bucket (hero + scroller). Run once in the Supabase SQL Editor.
-- (You already created the bucket in the dashboard — this makes sure it's public
--  and that only admins can upload.)

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read" on storage.objects
  for select using (bucket_id = 'images');

drop policy if exists "images_admin_write" on storage.objects;
create policy "images_admin_write" on storage.objects
  for all using (bucket_id = 'images' and is_admin())
  with check (bucket_id = 'images' and is_admin());
