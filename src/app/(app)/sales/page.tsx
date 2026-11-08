import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewOrder from '@/components/NewOrder'
export const dynamic = 'force-dynamic'
const nice = (s: string) => s.replace(/_/g, ' ')
const money = (n: any) => '$' + Number(n ?? 0).toFixed(2)
export default async function Sales({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  let q = sb.from('orders').select('id,order_number,order_date,total_amount,payment_status,fulfillment_status,platform,customers(first_name,last_name),products(name)').is('deleted_at', null).order('order_date', { ascending: false })
  if (f.product) q = q.eq('product_id', f.product); if (f.pay) q = q.eq('payment_status', f.pay)
  const [{ data, error }, products, customers, rev] = await Promise.all([
    q, sb.from('products').select('id,name,regular_price').is('deleted_at', null),
    sb.from('customers').select('id,first_name,last_name,email').is('deleted_at', null).order('first_name'),
    sb.from('v_revenue_by_product').select('*'),
  ])
  const totalRev = (rev.data ?? []).reduce((s: number, r: any) => s + Number(r.collected_revenue), 0)
  const pending = (data ?? []).filter((o: any) => ['pending', 'partially_paid'].includes(o.payment_status)).length
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-semibold">Sales & Orders</h1><p className="text-slate-500">Revenue counts only payments you have recorded, minus refunds.</p></div>
        <NewOrder customers={customers.data ?? []} products={products.data ?? []} presetCustomer={f.new} />
      </header>
      <section className="grid gap-3 md:grid-cols-4">
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">Collected revenue</div><div className="text-2xl font-semibold">{money(totalRev)}</div></div>
        {(rev.data ?? []).map((r: any) => <div key={r.product_id} className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">{r.name}</div><div className="text-lg font-semibold">{money(r.collected_revenue)}</div><div className="text-xs text-slate-500">{r.orders} orders</div></div>)}
      </section>
      <p className="text-xs text-slate-500">{pending} order(s) in the list below are not fully paid yet and are not counted as collected.</p>
      <form className="flex flex-wrap gap-2">
        <select name="product" defaultValue={f.product ?? ''} className={sel}><option value="">All products</option>{(products.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="pay" defaultValue={f.pay ?? ''} className={sel}><option value="">All payment statuses</option>{['pending','paid','partially_paid','refunded','cancelled'].map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button><a href="/sales/export" className="border rounded-lg px-3 py-2 bg-white text-sm">Export CSV</a>
      </form>
      {(error || rev.error) && <p className="text-red-600 text-sm">Could not load: {(error ?? rev.error)?.message}</p>}
      {(data ?? []).length === 0 ? <p className="text-sm text-slate-500">No orders recorded yet. Revenue shows $0.00 until you record real payments.</p> : (
        <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm">
          <thead className="text-left text-slate-500"><tr>{['Order','Date','Customer','Product','Total','Payment','Fulfillment','Platform'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(data ?? []).map((o: any) => (
            <tr key={o.id} className="border-t hover:bg-slate-50">
              <td className="p-3"><Link href={`/sales/${o.id}`} className="text-blue-600">{o.order_number}</Link></td><td className="p-3">{o.order_date}</td>
              <td className="p-3">{[o.customers?.first_name, o.customers?.last_name].filter(Boolean).join(' ') || '–'}</td><td className="p-3">{o.products?.name}</td>
              <td className="p-3">{money(o.total_amount)}</td><td className="p-3">{nice(o.payment_status)}</td><td className="p-3">{nice(o.fulfillment_status)}</td><td className="p-3">{o.platform ?? '–'}</td>
            </tr>))}</tbody></table></div>)}
    </div>
  )
}
