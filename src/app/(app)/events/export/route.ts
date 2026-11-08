import { createClient } from '@/lib/supabase/server'
import { toCsv, csvResponse } from '@/lib/csv'
const cols = ['name','product','event_type','event_date','start_time','end_time','location','meeting_link','status','ticket_price','capacity','registration_count','attendance','revenue','expenses','notes']
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data, error } = await sb.from('events').select('*,products(name)').is('deleted_at', null).order('event_date')
  if (error) return new Response(error.message, { status: 500 })
  return csvResponse(toCsv((data ?? []).map((e: any) => ({ ...e, product: e.products?.name })), cols), 'events.csv')
}
