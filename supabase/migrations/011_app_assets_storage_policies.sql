-- Ensure app assets bucket exists and is public for reads
insert into storage.buckets (id, name, public)
values ('app-assets', 'app-assets', true)
on conflict (id) do update
set public = true;

-- Public read access for app assets
drop policy if exists "Public read app-assets" on storage.objects;
create policy "Public read app-assets"
on storage.objects
for select
to public
using (bucket_id = 'app-assets');

-- Allow anon uploads to app-assets bucket (used by local upload script)
drop policy if exists "Anon insert app-assets" on storage.objects;
create policy "Anon insert app-assets"
on storage.objects
for insert
to anon
with check (bucket_id = 'app-assets');

-- Allow anon upserts/overwrites inside app-assets bucket
drop policy if exists "Anon update app-assets" on storage.objects;
create policy "Anon update app-assets"
on storage.objects
for update
to anon
using (bucket_id = 'app-assets')
with check (bucket_id = 'app-assets');
