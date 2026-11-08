-- Migration 009: partnerships and outreach. No organizations are preloaded.
create table partnerships (
  id uuid primary key default gen_random_uuid(),
  organization text not null, contact_person text, email text, phone text, website text,
  organization_type text, interest_area text, proposed_opportunity text,
  first_contact_date date, last_contact_date date, next_follow_up_date date, response text,
  status text not null default 'identified'
    check (status in ('identified','researching','ready_to_contact','contacted','responded','follow_up_required','meeting_scheduled','partnership_confirmed','declined','archived')),
  resulting_sales numeric(10,2) check (resulting_sales >= 0), notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create table outreach_interactions (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships(id) on delete cascade,
  interaction_date date not null default current_date,
  channel text not null default 'email' check (channel in ('email','phone','in_person','social','other')),
  summary text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create index outreach_interactions_idx on outreach_interactions(partnership_id, interaction_date);
do $$
declare t text;
begin
  foreach t in array array['partnerships','outreach_interactions'] loop
    execute format('create trigger %I_touch before insert or update on %I for each row execute function touch_row()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function audit_row()', t, t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_read on %I for select using (can_read() and deleted_at is null)', t, t);
    execute format('create policy %I_write on %I for all using (can_write()) with check (can_write())', t, t);
  end loop;
end $$;
