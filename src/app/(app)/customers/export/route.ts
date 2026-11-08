import { createClient } from '@/lib/supabase/server'
import { toCsv, csvResponse } from '@/lib/csv'
const cols = ['first_name','last_name','email','phone','organization','interest','source','lead_status','customer_status','last_contact_date','next_follow_up_date','notes','created_at']
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data, error } = await sb.from('customers').select(cols.join(',')).is('deleted_at', null)
  if (error) return new Response(error.message, { status: 500 })
  return csvResponse(toCsv((data ?? []) as any[], cols), 'customers.csv')
}
