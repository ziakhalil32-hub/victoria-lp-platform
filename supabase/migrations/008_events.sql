-- Migration 008: events and workshops. Blank (null) means "Not recorded". No times, places, or prices are invented.
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null, product_id uuid references products(id),
  event_type text not null default 'workshop'
    check (event_type in ('workshop','book_signing','book_celebration','educational_session','webinar','live_discussion','networking','other')),
  event_date date, start_time time, end_time time, location text, meeting_link text, description text,
  ticket_price numeric(10,2) check (ticket_price >= 0), capacity int check (capacity >= 0),
  registration_count int check (registration_count >= 0), attendance int check (attendance >= 0),
  revenue numeric(10,2) check (revenue >= 0), expenses numeric(10,2) check (expenses >= 0),
  status text not null default 'planning' check (status in ('planning','confirmed','completed','cancelled','postponed')),
  promotional_content text, notes text,
  printed_book_display boolean not null default false, purchase_qr_codes boolean not null default false,
  signup_form boolean not null default false, photographer text, interview_opportunities text,
  credit_blueprint_promotion boolean not null default false,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create trigger events_touch before insert or update on events for each row execute function touch_row();
create trigger events_audit after insert or update or delete on events for each row execute function audit_row();
alter table events enable row level security;
create policy events_read on events for select using (can_read() and deleted_at is null);
create policy events_write on events for all using (can_write()) with check (can_write());

insert into events(name, product_id, event_type, event_date, status, notes)
values ('Understanding Your Business Book Celebration', (select id from products where slug='understanding-your-business'), 'book_celebration', '2027-01-09', 'planning',
 'Date comes from the marketing plan. Start/end time, location, ticket price, and capacity are not confirmed yet.');
