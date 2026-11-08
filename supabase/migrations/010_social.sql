-- Migration 010: social media weekly targets (editable) and the daily engagement log.
create table social_targets (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('Facebook','Instagram','TikTok')),
  label text not null, content_types text[] not null default '{}',
  target int not null check (target >= 0), period_days int not null default 7,
  distinct_days boolean not null default false, sort_order int not null default 0,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create table social_engagement (
  id uuid primary key default gen_random_uuid(),
  log_date date not null default current_date,
  platform text not null check (platform in ('Facebook','Instagram','TikTok')),
  comments int check (comments >= 0), direct_messages int check (direct_messages >= 0),
  inquiries int check (inquiries >= 0), questions_pending int check (questions_pending >= 0),
  follow_up_status text not null default 'none' check (follow_up_status in ('none','pending','done')),
  notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid, updated_by uuid, version int default 1, deleted_at timestamptz
);
create index social_engagement_idx on social_engagement(platform, log_date);
do $$
declare t text;
begin
  foreach t in array array['social_targets','social_engagement'] loop
    execute format('create trigger %I_touch before insert or update on %I for each row execute function touch_row()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function audit_row()', t, t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_read on %I for select using (can_read() and deleted_at is null)', t, t);
    execute format('create policy %I_write on %I for all using (can_write()) with check (can_write())', t, t);
  end loop;
end $$;

-- Starting targets from the marketing plan. You can change any number on the Social Media page.
insert into social_targets(platform,label,content_types,target,period_days,distinct_days,sort_order) values
 ('TikTok','Original videos','{"Short-form video","TikTok video"}',5,7,false,1),
 ('TikTok','Live discussion or educational session','{"Live session topic"}',1,7,false,2),
 ('Instagram','Reels','{"Instagram Reel","Short-form video"}',4,7,false,1),
 ('Instagram','Carousel posts','{"Instagram carousel"}',2,7,false,2),
 ('Instagram','Days with Stories','{"Instagram Story"}',5,7,true,3),
 ('Instagram','Live discussion (every other week)','{"Live session topic"}',1,14,false,4),
 ('Facebook','Original videos or Reels','{"Facebook Reel","Short-form video"}',3,7,false,1),
 ('Facebook','Conversation posts','{"Facebook post"}',2,7,false,2),
 ('Facebook','Live session (when possible)','{"Live session topic"}',1,7,false,3);
