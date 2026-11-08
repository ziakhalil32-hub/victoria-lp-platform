import { createClient } from '@/lib/supabase/server'
import { toCsv, csvResponse } from '@/lib/csv'
const cols = ['organization','contact_person','email','phone','website','organization_type','interest_area','proposed_opportunity','first_contact_date','last_contact_date','next_follow_up_date','response','status','resulting_sales','notes']
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data, error } = await sb.from('partnerships').select(cols.join(',')).is('deleted_at', null).order('organization')
  if (error) return new Response(error.message, { status: 500 })
  return csvResponse(toCsv((data ?? []) as any[], cols), 'outreach.csv')
}
