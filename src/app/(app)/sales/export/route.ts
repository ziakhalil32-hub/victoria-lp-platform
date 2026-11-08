import { createClient } from '@/lib/supabase/server'
import { toCsv, csvResponse } from '@/lib/csv'
const cols = ['order_number','order_date','customer','product','quantity','unit_price','discount','total_amount','payment_status','fulfillment_status','platform','payment_method','transaction_ref','notes']
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data, error } = await sb.from('orders').select('*,customers(first_name,last_name),products(name)').is('deleted_at', null).order('order_date', { ascending: false })
  if (error) return new Response(error.message, { status: 500 })
  const rows = (data ?? []).map((o: any) => ({ ...o, customer: [o.customers?.first_name, o.customers?.last_name].filter(Boolean).join(' '), product: o.products?.name }))
  return csvResponse(toCsv(rows, cols), 'orders.csv')
}
