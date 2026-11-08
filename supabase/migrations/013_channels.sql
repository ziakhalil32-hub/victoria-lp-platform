-- Migration 013: marketing channels with verification, and website/signup-form requirement tracking.
create table channel_links (
  id uuid primary key default gen_random_uuid(),
  name text not null, url text,
  brand_id uuid references brands(id),
  product_ids uuid[] not null default '{}',
  verification_status text not null default 'not_checked'
    check (verification_status in ('not_checked','pending','verified','broken','unavailable')),
  last_checked_at timestamptz, notes text, sort_order int not null default 100,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create table link_verifications (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channel_links(id) on delete cascade,
  status text not null, note text,
  checked_at timestamptz not null default now(), checked_by uuid default auth.uid()
);
create index link_verifications_idx on link_verifications(channel_id, checked_at desc);
create table website_items (
  id uuid primary key default gen_random_uuid(),
  site text not null, section text, item text not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','ready_for_review','done')),
  confirmed_at timestamptz, notes text, sort_order int not null default 100,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
do $$
declare t text;
begin
  foreach t in array array['channel_links','website_items'] loop
    execute format('create trigger %I_touch before insert or update on %I for each row execute function touch_row()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function audit_row()', t, t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_read on %I for select using (can_read() and deleted_at is null)', t, t);
    execute format('create policy %I_write on %I for all using (can_write()) with check (can_write())', t, t);
  end loop;
end $$;
alter table link_verifications enable row level security;
create policy link_verifications_read on link_verifications for select using (can_read());
create policy link_verifications_insert on link_verifications for insert with check (can_write());

-- Channels from the plan. Only the Victoria LP website URL was provided. Every channel starts unchecked.
insert into channel_links(name, url, brand_id, sort_order) values
 ('Facebook', null, null, 1), ('Instagram', null, null, 2), ('TikTok', null, null, 3),
 ('Victoria LP website', 'https://www.victorialp.com/', (select id from brands where name='Victoria LP'), 4),
 ('ACC of Illinois website', null, (select id from brands where name='ACC of Illinois'), 5),
 ('Email marketing', null, null, 6), ('Direct outreach', null, null, 7), ('Professional networking', null, null, 8),
 ('Book-related events and workshops', null, null, 9), ('Amazon', null, null, 10), ('Walmart', null, null, 11);

-- Website work to be done. These track the TASKS only; nothing here changes a website.
insert into website_items(site, section, item, sort_order) values
 ('Victoria LP website','BOOKS, COURSES & RESOURCES','Create the “BOOKS, COURSES & RESOURCES” section',1),
 ('Victoria LP website','BOOKS, COURSES & RESOURCES','Product card: Turn the Page',2),
 ('Victoria LP website','BOOKS, COURSES & RESOURCES','Product card: Understanding Your Business',3),
 ('Victoria LP website','BOOKS, COURSES & RESOURCES','Product card: The Credit Blueprint',4),
 ('ACC of Illinois website','Educational resources','Understanding Your Business',1),
 ('ACC of Illinois website','Educational resources','The Credit Blueprint',2),
 ('ACC of Illinois website','Educational resources','Upcoming educational workshops',3),
 ('ACC of Illinois website','Educational resources','Credit and capital education',4),
 ('ACC of Illinois website','Educational resources','Newsletter enrollment',5),
 ('Email capture form','Form fields','First name field',1),
 ('Email capture form','Form fields','Email address field',2),
 ('Email capture form','Form fields','Optional area of interest: Self-Care, Entrepreneurship, Credit Education',3),
 ('Email capture form','Form fields','Recommended: consent statement and unsubscribe note near the sign-up button',4);
