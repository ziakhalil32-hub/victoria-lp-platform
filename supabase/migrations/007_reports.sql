-- Migration 007: weekly reports. Sections are stored as editable text so manual edits are kept permanently.
create table reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null, week_end date not null,
  status text not null default 'draft' check (status in ('draft','final')),
  sections jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create unique index reports_week_uniq on reports(week_start) where deleted_at is null;
create trigger reports_touch before insert or update on reports for each row execute function touch_row();
create trigger reports_audit after insert or update or delete on reports for each row execute function audit_row();
alter table reports enable row level security;
create policy reports_read on reports for select using (can_read() and deleted_at is null);
create policy reports_write on reports for all using (can_write()) with check (can_write());
