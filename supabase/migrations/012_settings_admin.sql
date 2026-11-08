-- Migration 012: application settings (content mix guideline) and owner/admin visibility of user profiles.
create table application_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, value jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create trigger application_settings_touch before insert or update on application_settings for each row execute function touch_row();
create trigger application_settings_audit after insert or update or delete on application_settings for each row execute function audit_row();
alter table application_settings enable row level security;
create policy application_settings_read on application_settings for select using (can_read() and deleted_at is null);
create policy application_settings_write on application_settings for all using (can_write()) with check (can_write());
insert into application_settings(key, value) values ('content_mix', '{"educate_entertain":3,"trust":1,"promote":1}');

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('owner','admin'));
$$;
create policy profiles_admin_read on profiles for select using (is_admin());
