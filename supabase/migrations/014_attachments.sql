-- Migration 014: file attachments for content (media) and expenses (receipts). Files live in the private marketing-assets bucket.
create table attachments (
  id uuid primary key default gen_random_uuid(),
  entity_table text not null check (entity_table in ('content','expenses','tasks')),
  entity_id uuid not null,
  name text not null, storage_path text not null, mime_type text, size_bytes bigint,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create index attachments_entity_idx on attachments(entity_table, entity_id);
create trigger attachments_touch before insert or update on attachments for each row execute function touch_row();
create trigger attachments_audit after insert or update or delete on attachments for each row execute function audit_row();
alter table attachments enable row level security;
create policy attachments_read on attachments for select using (can_read() and deleted_at is null);
create policy attachments_write on attachments for all using (can_write()) with check (can_write());
