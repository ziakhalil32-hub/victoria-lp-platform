-- Victoria LP Platform: Migration 001 (core schema)
-- Run in Supabase: SQL Editor > New query > paste > Run.
-- Safe design: soft deletes, version numbers (conflict detection), audit log, RLS.

create extension if not exists pgcrypto;

-- ============ ACCESS ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now()
);

-- First person to sign up becomes the Owner. Later signups are read-only until you promote them.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name',
          case when exists (select 1 from profiles) then 'viewer' else 'owner' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('owner','admin','editor'));
$$;
create or replace function can_read() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

-- ============ BUSINESS TABLES ============
-- Common columns on every table: id, created_at, updated_at, created_by, updated_by, version, deleted_at

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, website text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id),
  name text not null,
  slug text unique,
  description text,
  category text,
  format text,                       -- configurable; Credit Blueprint is NOT assumed to be a book
  launch_date date,
  presale_start date,
  presale_deadline date,
  presale_price numeric(10,2),
  regular_price numeric(10,2),
  availability text,
  fulfillment_method text default 'Pending confirmation',
  marketing_status text not null default 'planning'
    check (marketing_status in ('planning','preparation','presale','ready_for_launch','launched','active_sales','completed','on_hold')),
  approval_status text not null default 'requires_approval'
    check (approval_status in ('requires_approval','approved','rejected')),
  image_path text, notes text, archived boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

-- Purchase-link verification: only 'verified' links count as active.
create table product_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  platform text not null,            -- Amazon, Walmart, Website, Enrollment, Other
  url text,
  verification_status text not null default 'not_checked'
    check (verification_status in ('not_checked','pending','verified','broken','unavailable')),
  last_verified_at timestamptz, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

create table course_chapters (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  chapter_number int not null, title text not null,
  description text, lesson_content text, video_url text,
  completion_status text not null default 'not_started'
    check (completion_status in ('not_started','in_progress','completed')),
  notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz,
  unique (product_id, chapter_number)
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  name text not null, theme text,
  start_date date, end_date date, status text default 'not_started', notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

create table campaign_milestones (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  title text not null, details text,
  start_date date not null, end_date date not null,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','completed','skipped')),
  completed_at timestamptz, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null, notes text,
  product_id uuid references products(id),
  due_date date, priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','done')),
  completed_at timestamptz,
  recurrence text check (recurrence in ('daily','weekdays','weekly','monthly')),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

create table content (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  campaign_id uuid references campaigns(id),
  title text not null,
  platform text, content_type text, topic text,
  hook text, script text, caption text, hashtags text, call_to_action text,
  link_url text, media_path text,
  scheduled_for timestamptz, published_at timestamptz,
  status text not null default 'idea'
    check (status in ('idea','planned','drafting','ready_for_review','pending_approval','approved','scheduled','published','needs_revision','archived')),
  views int, reach int, likes int, comments int, shares int, saves int,
  link_clicks int, leads_generated int, orders_generated int, revenue_generated numeric(10,2),
  notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

-- Platform captions are separate rows so the original is never overwritten.
create table content_platform_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content(id) on delete cascade,
  platform text not null check (platform in ('facebook','instagram','tiktok')),
  caption text, hashtags text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz,
  unique (content_id, platform)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  first_name text, last_name text, email text, phone text, organization text,
  interest text, product_id uuid references products(id), source text,
  lead_status text default 'new'
    check (lead_status in ('new','contacted','interested','qualified','follow_up_required','converted','not_interested','archived')),
  customer_status text default 'prospect'
    check (customer_status in ('prospect','customer','repeat_customer','event_attendee','course_student')),
  last_contact_date date, next_follow_up_date date, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create unique index customers_email_uniq on customers (lower(email)) where email is not null and deleted_at is null;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  customer_id uuid references customers(id),
  product_id uuid not null references products(id),
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total_amount numeric(10,2) generated always as (quantity * unit_price - discount) stored,
  order_date date not null default current_date,
  platform text, payment_method text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','partially_paid','refunded','cancelled')),
  fulfillment_status text not null default 'not_started'
    check (fulfillment_status in ('not_started','processing','delivered','access_provided','completed','issue_reported')),
  transaction_ref text, idempotency_key text unique, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  amount numeric(10,2) not null,
  kind text not null default 'payment' check (kind in ('payment','refund')),
  paid_at date not null default current_date, reference text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  product_id uuid references products(id), platform text, campaign_id uuid references campaigns(id),
  category text not null default 'other'
    check (category in ('paid_advertising','content_production','design','printing','events','software','other')),
  amount numeric(10,2) not null check (amount >= 0), currency text default 'USD',
  payment_method text, receipt_path text, description text,
  approval_status text not null default 'requires_approval'
    check (approval_status in ('proposed','requires_approval','approved','rejected')),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  entity_table text not null, entity_id uuid not null, action text not null,
  decision text not null check (decision in ('approved','rejected')),
  decided_by uuid default auth.uid(), decided_at timestamptz default now(), note text
);

create table activity_logs (
  id bigserial primary key,
  at timestamptz default now(), user_id uuid default auth.uid(),
  table_name text, record_id uuid, action text, old_data jsonb, new_data jsonb
);

-- ============ AUTOSAVE SUPPORT: version + timestamps + audit ============
create or replace function touch_row() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.created_by := auth.uid(); new.updated_by := auth.uid();
  else new.updated_at := now(); new.updated_by := auth.uid(); new.version := coalesce(old.version,1) + 1; end if;
  return new;
end $$;

create or replace function audit_row() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_logs(table_name, record_id, action, old_data, new_data)
  values (tg_table_name, coalesce((to_jsonb(new)->>'id'),(to_jsonb(old)->>'id'))::uuid, tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['brands','products','product_links','course_chapters','campaigns',
    'campaign_milestones','tasks','content','content_platform_versions','customers','orders','payments','expenses']
  loop
    execute format('create trigger %I_touch before insert or update on %I for each row execute function touch_row()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function audit_row()', t, t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_read on %I for select using (can_read() and deleted_at is null)', t, t);
    execute format('create policy %I_write on %I for all using (can_write()) with check (can_write())', t, t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy profiles_self on profiles for select using (id = auth.uid());
alter table approvals enable row level security;
create policy approvals_read on approvals for select using (can_read());
create policy approvals_write on approvals for insert with check (can_write());
alter table activity_logs enable row level security;
create policy logs_read on activity_logs for select using (can_read());

-- ============ VIEWS: every dashboard number comes from real records ============
-- Collected revenue = recorded payments minus refunds. Unpaid orders never count.
create view v_revenue_by_product as
select p.id as product_id, p.name,
  coalesce(sum(case when pay.kind='payment' then pay.amount end),0)
  - coalesce(sum(case when pay.kind='refund' then pay.amount end),0) as collected_revenue,
  count(distinct o.id) filter (where o.payment_status not in ('cancelled')) as orders
from products p
left join orders o on o.product_id = p.id and o.deleted_at is null
left join payments pay on pay.order_id = o.id and pay.deleted_at is null
where p.deleted_at is null group by p.id, p.name;

-- Milestones whose dates passed without confirmed completion need review (never assumed done).
create view v_milestones as
select m.*, c.product_id,
  case when m.status in ('not_started','in_progress') and m.end_date < current_date
       then 'requires_review' else m.status end as display_status
from campaign_milestones m join campaigns c on c.id = m.campaign_id
where m.deleted_at is null;

-- Only verified links are active purchase destinations.
create view v_active_links as
select * from product_links where verification_status = 'verified' and deleted_at is null;

-- ============ SEED: known facts only. No sales, subscribers, or posts invented. ============
insert into brands(name, website) values
 ('Victoria LP','https://www.victorialp.com/'),
 ('ACC of Illinois', null);

insert into products(brand_id,name,slug,description,format,launch_date,presale_start,presale_deadline,presale_price,regular_price,marketing_status) values
 ((select id from brands where name='Victoria LP'),'Turn the Page','turn-the-page',
  'Turn the Page: A Grown Folks Activity Book. Coloring, recipes, puzzles, reflection, relaxation, and personal wellness.',
  'Activity book (confirm)', '2026-11-26', null, null, null, 10.00, 'preparation'),
 ((select id from brands where name='Victoria LP'),'Understanding Your Business','understanding-your-business',
  'Understanding Your Business: The Entrepreneur Survival Guide.',
  'Book (confirm)', '2026-12-24', null, '2026-12-23', 50.00, 99.00, 'preparation'),
 ((select id from brands where name='ACC of Illinois'),'The Credit Blueprint','the-credit-blueprint',
  'Six-chapter online course on personal and business credit. No guarantees of score changes, removals, or funding.',
  'Online course (confirm delivery method)', '2027-02-08', null, '2027-02-07', 50.00, 99.00, 'planning');

-- Every link starts unverified. Nothing is shown as active until you verify it.
insert into product_links(product_id, platform)
select p.id, x.platform from products p
cross join (values ('Website'),('Amazon'),('Walmart'),('Enrollment')) as x(platform);

insert into course_chapters(product_id, chapter_number, title)
select (select id from products where slug='the-credit-blueprint'), n, t from (values
 (1,'Understanding Your Personal Credit'),(2,'Audit It. Dispute It.'),
 (3,'Repair It. Rebuild It. Grow It. Protect It.'),
 (4,'Build The Business Before You Build The Credit'),
 (5,'Build Your Business Credit Profile'),(6,'From Business Credit To Business Funding')) v(n,t);

insert into campaigns(product_id,name,theme,start_date,end_date) values
 ((select id from products where slug='turn-the-page'),'Turn the Page Launch','Take a Break. Turn the Page.','2026-11-04','2026-11-26'),
 ((select id from products where slug='understanding-your-business'),'Understanding Your Business Launch','Starting a Business Is One Thing. Understanding How to Sustain It Is Another.','2026-11-16','2026-12-24'),
 ((select id from products where slug='the-credit-blueprint'),'The Credit Blueprint Launch','Learn the System. Build the Credit. Access the Capital.','2027-01-04','2027-02-08');

insert into campaign_milestones(campaign_id,title,details,start_date,end_date)
select c.id, m.title, m.details, m.s::date, m.e::date from campaigns c join (values
 ('Turn the Page Launch','Introduce the book','Show cover, why Victoria created it, make-time-for-yourself video, collect email subscribers','2026-11-04','2026-11-08'),
 ('Turn the Page Launch','Show the activities','Coloring/puzzle demo, sample pages, self-care reflection, behind the scenes, first dedicated email','2026-11-09','2026-11-15'),
 ('Turn the Page Launch','Holiday gift focus','Holiday self-care video, affordable gift, another activity, resting vs giving up, prep launch emails and graphics','2026-11-16','2026-11-22'),
 ('Turn the Page Launch','Three-day countdown',null,'2026-11-23','2026-11-23'),
 ('Turn the Page Launch','Show what is inside',null,'2026-11-24','2026-11-24'),
 ('Turn the Page Launch','One-day reminder',null,'2026-11-25','2026-11-25'),
 ('Turn the Page Launch','Official launch','Launch video, verified purchase links, launch-day email','2026-11-26','2026-11-26'),
 ('Understanding Your Business Launch','Introduce and announce presale','Official cover, presale, first chapter preview, entrepreneurship email sequence','2026-11-16','2026-11-30'),
 ('Understanding Your Business Launch','Educate and promote presale','Educational videos, workshop content, what readers learn, $50 presale, contact entrepreneurial organizations','2026-12-01','2026-12-10'),
 ('Understanding Your Business Launch','Build toward launch','Publishing updates, entrepreneurship Q&A, reminder emails, highlight Dec 23 deadline','2026-12-11','2026-12-20'),
 ('Understanding Your Business Launch','Final presale countdown','Confirm purchasing and delivery, final presale email, verify pricing and checkout','2026-12-21','2026-12-23'),
 ('Understanding Your Business Launch','Official launch','Birthday book launch video, announce launch','2026-12-24','2026-12-24'),
 ('The Credit Blueprint Launch','Introduce the course','Cover, announce Feb 8 launch, collect leads, promote at Jan 9 celebration','2027-01-04','2027-01-10'),
 ('The Credit Blueprint Launch','Educate','Educational videos, six-chapter curriculum, sample lessons, verified presale enrollment, email sequence','2027-01-11','2027-01-24'),
 ('The Credit Blueprint Launch','Live session and presale push','Credit education live, lesson preview, FAQs, $50 presale, website signups','2027-01-25','2027-02-01'),
 ('The Credit Blueprint Launch','Final countdown','Presale reminders, test enrollment and access, confirm price change, welcome emails','2027-02-02','2027-02-07'),
 ('The Credit Blueprint Launch','Official enrollment launch',null,'2027-02-08','2027-02-08')
) as m(campaign, title, details, s, e) on m.campaign = c.name;

-- Daily checklist template as recurring weekday tasks (due today; you tick them off)
insert into tasks(title, recurrence, due_date, priority)
select t, 'weekdays', current_date, 'normal' from unnest(array[
 'Check the master marketing calendar','Review scheduled posts and videos',
 'Publish or schedule approved content','Respond to legitimate questions and inquiries',
 'Check active purchase and enrollment links','Review new email subscribers',
 'Follow up on outstanding partnership opportunities','Record sales and campaign results',
 'Identify content worth repeating in a new format','Report problems requiring Victoria''s attention']) as t;
