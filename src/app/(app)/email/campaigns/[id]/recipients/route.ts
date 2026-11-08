import { createClient } from '@/lib/supabase/server'
import { toCsv, csvResponse } from '@/lib/csv'
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data: c } = await sb.from('email_campaigns').select('list_id,status,name').eq('id', id).is('deleted_at', null).maybeSingle()
  if (!c) return new Response('Not found', { status: 404 })
  if (!['approved', 'scheduled', 'sent'].includes(c.status)) return new Response('Approve this campaign first. Recipients are only exported for approved campaigns.', { status: 403 })
  const { data, error } = await sb.from('v_eligible_subscribers').select('first_name,last_name,email').eq('list_id', c.list_id)
  if (error) return new Response(error.message, { status: 500 })
  return csvResponse(toCsv((data ?? []) as any[], ['first_name', 'last_name', 'email']), 'eligible-recipients.csv')
}
