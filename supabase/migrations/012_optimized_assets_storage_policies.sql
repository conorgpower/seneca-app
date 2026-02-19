-- Ensure optimized mobile assets bucket exists and is public for reads
insert into storage.buckets (id, name, public)
values ('app-assets-mobile', 'app-assets-mobile', true)
on conflict (id) do update
set public = true;

-- Public read access for optimized mobile assets
drop policy if exists "Public read app-assets-mobile" on storage.objects;
create policy "Public read app-assets-mobile"
on storage.objects
for select
to public
using (bucket_id = 'app-assets-mobile');

-- Allow anon uploads to optimized bucket (used by local upload script)
drop policy if exists "Anon insert app-assets-mobile" on storage.objects;
create policy "Anon insert app-assets-mobile"
on storage.objects
for insert
to anon
with check (bucket_id = 'app-assets-mobile');

-- Allow anon upserts/overwrites inside optimized bucket
drop policy if exists "Anon update app-assets-mobile" on storage.objects;
create policy "Anon update app-assets-mobile"
on storage.objects
for update
to anon
using (bucket_id = 'app-assets-mobile')
with check (bucket_id = 'app-assets-mobile');
