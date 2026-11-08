import { createClient } from '@/lib/supabase/server'
import { toCsv, csvResponse } from '@/lib/csv'
const cols = ['first_name','last_name','email','audience','interest_categories','signup_source','signup_date','consent_status','consent_date','subscription_status','last_email_sent','notes']
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data, error } = await sb.from('subscribers').select('*,email_lists(name)').is('deleted_at', null).order('created_at', { ascending: false })
  if (error) return new Response(error.message, { status: 500 })
  return csvResponse(toCsv((data ?? []).map((s: any) => ({ ...s, audience: s.email_lists?.name })), cols), 'subscribers.csv')
}
