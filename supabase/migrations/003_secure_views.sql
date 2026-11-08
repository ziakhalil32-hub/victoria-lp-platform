-- Migration 003: make reporting views respect login/row-level security.
-- Without this, views could be readable with the public key alone.
alter view v_revenue_by_product set (security_invoker = true);
alter view v_milestones set (security_invoker = true);
alter view v_active_links set (security_invoker = true);
revoke all on v_revenue_by_product, v_milestones, v_active_links from anon;
