import { createClient } from '@/lib/supabase/server'
import { toCsv, csvResponse } from '@/lib/csv'
const cols = ['expense_date','product','category','platform','amount','currency','payment_method','description','approval_status','attributed_customers','attributed_revenue','link_clicks','conversions']
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data, error } = await sb.from('expenses').select('*,products(name)').is('deleted_at', null).order('expense_date', { ascending: false })
  if (error) return new Response(error.message, { status: 500 })
  return csvResponse(toCsv((data ?? []).map((e: any) => ({ ...e, product: e.products?.name })), cols), 'expenses.csv')
}
