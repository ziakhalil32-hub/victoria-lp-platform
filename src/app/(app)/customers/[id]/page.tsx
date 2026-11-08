import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CustomerEditor from '@/components/CustomerEditor'
export const dynamic = 'force-dynamic'
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [c, products, orders] = await Promise.all([
    sb.from('customers').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
    sb.from('products').select('id,name').is('deleted_at', null),
    sb.from('orders').select('id,order_number,order_date,total_amount,payment_status,products(name),payments(amount,kind,deleted_at)').eq('customer_id', id).is('deleted_at', null).order('order_date', { ascending: false }),
  ])
  if (!c.data) notFound()
  const rows = (orders.data ?? []).map((o: any) => {
    const ps = (o.payments ?? []).filter((p: any) => !p.deleted_at)
    return { ...o, paid: ps.reduce((s: number, p: any) => s + (p.kind === 'refund' ? -1 : 1) * Number(p.amount), 0) }
  })
  const total = rows.reduce((s: number, o: any) => s + o.paid, 0)
  return (
    <div className="space-y-4">
      <Link href="/customers" className="text-sm text-blue-600">← All customers</Link>
      <CustomerEditor customer={c.data} products={products.data ?? []} />
      <section className="bg-white rounded-2xl border p-4 space-y-2">
        <h2 className="font-semibold">Purchase history <span className="text-sm font-normal text-slate-500">· Collected: ${total.toFixed(2)}</span></h2>
        {rows.length === 0 && <p className="text-sm text-slate-500">No orders recorded.</p>}
        {rows.map((o: any) => <Link key={o.id} href={`/sales/${o.id}`} className="flex justify-between text-sm border rounded-lg p-2 hover:bg-slate-50"><span>{o.order_number} · {o.products?.name} · {o.order_date}</span><span>${Number(o.total_amount).toFixed(2)} · {o.payment_status.replace(/_/g, ' ')}</span></Link>)}
        <Link href={`/sales?new=${id}`} className="text-sm text-blue-600 inline-block">+ Record an order for this customer</Link>
      </section>
    </div>
  )
}
