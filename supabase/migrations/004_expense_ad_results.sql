-- Migration 004: ad-result fields on expenses. Blank (null) means "Not recorded".
alter table expenses add column if not exists attributed_customers int check (attributed_customers >= 0);
alter table expenses add column if not exists attributed_revenue numeric(10,2) check (attributed_revenue >= 0);
alter table expenses add column if not exists link_clicks int check (link_clicks >= 0);
alter table expenses add column if not exists conversions int check (conversions >= 0);
