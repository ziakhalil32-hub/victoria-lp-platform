-- Migration 006: marketing materials library + private file storage.
create table marketing_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  folder text not null default 'Other',
  name text not null, description text,
  storage_path text not null, mime_type text, size_bytes bigint,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create index marketing_assets_product_idx on marketing_assets(product_id, folder);
-- Older copies kept when a file is replaced (version history).
create table asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references marketing_assets(id) on delete cascade,
  name text, storage_path text not null, mime_type text, size_bytes bigint,
  replaced_at timestamptz default now(), replaced_by uuid default auth.uid()
);
do $$
declare t text;
begin
  execute 'create trigger marketing_assets_touch before insert or update on marketing_assets for each row execute function touch_row()';
  execute 'create trigger marketing_assets_audit after insert or update or delete on marketing_assets for each row execute function audit_row()';
  foreach t in array array['marketing_assets','asset_versions'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
create policy marketing_assets_read on marketing_assets for select using (can_read() and deleted_at is null);
create policy marketing_assets_write on marketing_assets for all using (can_write()) with check (can_write());
create policy asset_versions_read on asset_versions for select using (can_read());
create policy asset_versions_write on asset_versions for insert with check (can_write());

-- Private bucket: files are only reachable through short-lived signed links for logged-in users.
insert into storage.buckets (id, name, public, file_size_limit)
values ('marketing-assets', 'marketing-assets', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

create policy "assets_storage_read" on storage.objects for select using (bucket_id = 'marketing-assets' and public.can_read());
create policy "assets_storage_insert" on storage.objects for insert with check (bucket_id = 'marketing-assets' and public.can_write());
create policy "assets_storage_update" on storage.objects for update using (bucket_id = 'marketing-assets' and public.can_write());
create policy "assets_storage_delete" on storage.objects for delete using (bucket_id = 'marketing-assets' and public.can_write());
