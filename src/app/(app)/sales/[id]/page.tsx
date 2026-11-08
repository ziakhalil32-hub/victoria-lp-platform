import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OrderEditor from '@/components/OrderEditor'
export const dynamic = 'force-dynamic'
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [o, customers, products, payments] = await Promise.all([
    sb.from('orders').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
    sb.from('customers').select('id,first_name,last_name,email').is('deleted_at', null).order('first_name'),
    sb.from('products').select('id,name').is('deleted_at', null),
    sb.from('payments').select('*').eq('order_id', id).is('deleted_at', null).order('paid_at'),
  ])
  if (!o.data) notFound()
  return (<div className="space-y-4"><Link href="/sales" className="text-sm text-blue-600">← All orders</Link>
    <OrderEditor order={o.data} customers={customers.data ?? []} products={products.data ?? []} payments={payments.data ?? []} /></div>)
}
