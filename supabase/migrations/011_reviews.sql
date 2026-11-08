-- Migration 011: Amazon reviews (public, legitimate feedback) and course testimonials (permission-based, kept separate).
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  customer_id uuid references customers(id),
  purchase_date date, listing_url text,
  has_connection boolean not null default false,
  eligibility text not null default 'not_checked' check (eligibility in ('not_checked','eligible','not_eligible')),
  request_date date,
  review_received boolean not null default false,
  rating int check (rating between 1 and 5),
  feedback_text text, feedback_date date, improvement_notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz,
  -- Never request a review from someone with a personal or financial connection.
  constraint no_request_with_connection check (not (has_connection and request_date is not null))
);
create table testimonials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id), customer_id uuid references customers(id),
  person_name text, testimonial_text text, source text,
  permission_status text not null default 'not_requested' check (permission_status in ('not_requested','requested','granted','declined')),
  permission_date date, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
do $$
declare t text;
begin
  foreach t in array array['reviews','testimonials'] loop
    execute format('create trigger %I_touch before insert or update on %I for each row execute function touch_row()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function audit_row()', t, t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_read on %I for select using (can_read() and deleted_at is null)', t, t);
    execute format('create policy %I_write on %I for all using (can_write()) with check (can_write())', t, t);
  end loop;
end $$;
