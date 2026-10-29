-- Public recipe images; only admins can upload, replace, or delete objects.
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view recipe images" on storage.objects;
create policy "Public can view recipe images"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

drop policy if exists "Admins can upload recipe images" on storage.objects;
create policy "Admins can upload recipe images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images' and public.is_admin());

drop policy if exists "Admins can update recipe images" on storage.objects;
create policy "Admins can update recipe images"
  on storage.objects for update to authenticated
  using (bucket_id = 'recipe-images' and public.is_admin())
  with check (bucket_id = 'recipe-images' and public.is_admin());

drop policy if exists "Admins can delete recipe images" on storage.objects;
create policy "Admins can delete recipe images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images' and public.is_admin());
