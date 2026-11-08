import type { SupabaseClient } from '@supabase/supabase-js'
// Every table the backup and export cover. All use an "id" column.
export const TABLES = ['brands','products','product_links','course_chapters','campaigns','campaign_milestones','tasks','content','content_platform_versions','customers','orders','payments','expenses',
  'email_lists','subscribers','email_suppressions','email_campaigns','marketing_assets','asset_versions','reports','events','partnerships','outreach_interactions','social_targets','social_engagement',
  'reviews','testimonials','attachments','application_settings','approvals','activity_logs']
export async function isAdmin(sb: SupabaseClient) {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  const { data } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return ['owner', 'admin'].includes(data?.role ?? '')
}
export async function fetchAll(sb: SupabaseClient, table: string) {
  const out: any[] = []
  for (let page = 0; page < 100; page++) {
    const { data, error } = await sb.from(table).select('*').order('id').range(page * 1000, page * 1000 + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  return out
}
