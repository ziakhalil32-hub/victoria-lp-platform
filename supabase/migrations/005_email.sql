-- Migration 005: email marketing (audiences, subscribers with consent, suppression list, campaigns).
create table email_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, product_id uuid references products(id), description text, interests text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references email_lists(id),
  first_name text, last_name text, email text not null check (email = lower(email)),
  interest_categories text, signup_source text, signup_date date default current_date,
  consent_status text not null default 'unknown' check (consent_status in ('consented','unknown','withdrawn')),
  consent_date date, consent_note text,
  subscription_status text not null default 'subscribed' check (subscription_status in ('subscribed','unsubscribed','bounced','suppressed')),
  last_email_sent date, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz,
  unique (list_id, email)
);
create table email_suppressions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)), reason text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create unique index email_suppressions_email_uniq on email_suppressions (email) where deleted_at is null;
create table email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null, product_id uuid references products(id), list_id uuid references email_lists(id),
  stage text check (stage in ('introduction','what_is_inside','why_created','final_opportunity','launch_day')),
  subject text, body text, scheduled_for timestamptz, sent_at timestamptz,
  status text not null default 'draft' check (status in ('draft','ready_for_review','approved','scheduled','sent','cancelled')),
  recipients int, opens int, clicks int, unsubscribes int, purchases_attributed int, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
do $$
declare t text;
begin
  foreach t in array array['email_lists','subscribers','email_suppressions','email_campaigns']
  loop
    execute format('create trigger %I_touch before insert or update on %I for each row execute function touch_row()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function audit_row()', t, t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_read on %I for select using (can_read() and deleted_at is null)', t, t);
    execute format('create policy %I_write on %I for all using (can_write()) with check (can_write())', t, t);
  end loop;
end $$;

-- Only consented, subscribed, non-suppressed people are eligible for marketing email.
create view v_eligible_subscribers with (security_invoker = true) as
select s.* from subscribers s
where s.deleted_at is null and s.consent_status = 'consented' and s.subscription_status = 'subscribed'
  and not exists (select 1 from email_suppressions x where x.email = s.email and x.deleted_at is null);
revoke all on v_eligible_subscribers from anon;

insert into email_lists(name, product_id, description, interests) values
 ('Self-Care & Lifestyle',(select id from products where slug='turn-the-page'),'Audience for Turn the Page','Self-care, relaxation, journaling, adult activities, grief processing, cooking, personal wellness'),
 ('Entrepreneurship',(select id from products where slug='understanding-your-business'),'Audience for Understanding Your Business','Entrepreneurship, small business ownership, business registration, compliance, financial planning, business education'),
 ('Credit & Capital',(select id from products where slug='the-credit-blueprint'),'Audience for The Credit Blueprint','Personal credit, business credit, credit education, access to capital, financial literacy');

-- Five standard drafts per audience. Structure only: no subjects, bodies, dates, or sends are invented.
insert into email_campaigns(name, product_id, list_id, stage)
select l.name || ': ' || s.label, l.product_id, l.id, s.stage from email_lists l
cross join (values ('introduction','1. Introduction'),('what_is_inside','2. What Is Inside?'),('why_created','3. Why I Created This'),('final_opportunity','4. Final Opportunity'),('launch_day','5. Launch Day')) s(stage,label);
