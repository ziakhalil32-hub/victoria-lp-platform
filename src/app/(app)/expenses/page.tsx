import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewExpense from '@/components/NewExpense'
export const dynamic = 'force-dynamic'
const nice = (s: string) => s.replace(/_/g, ' ')
const money = (n: number) => '$' + n.toFixed(2)
const num = (v: any) => Number(v ?? 0)
export default async function Expenses({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  const [all, products] = await Promise.all([
    sb.from('expenses').select('*,products(name)').is('deleted_at', null).order('expense_date', { ascending: false }),
    sb.from('products').select('id,name').is('deleted_at', null).order('launch_date'),
  ])
  const rows: any[] = all.data ?? []
  const shown = rows.filter(e => (!f.product || e.product_id === f.product) && (!f.cat || e.category === f.cat) && (!f.appr || e.approval_status === f.appr))
  const approved = rows.filter(e => e.approval_status === 'approved')
  const by = (pid: string | null) => {
    const own = (list: any[]) => list.filter(e => e.product_id === pid)
    const ads = own(approved).filter(e => e.category === 'paid_advertising')
    const adSpend = ads.reduce((s, e) => s + num(e.amount), 0)
    const cust = ads.reduce((s, e) => s + num(e.attributed_customers), 0), revn = ads.reduce((s, e) => s + num(e.attributed_revenue), 0)
    const clicks = ads.reduce((s, e) => s + num(e.link_clicks), 0), conv = ads.reduce((s, e) => s + num(e.conversions), 0)
    return { proposed: own(rows.filter(e => e.approval_status === 'proposed')).reduce((s, e) => s + num(e.amount), 0), approved: own(approved).reduce((s, e) => s + num(e.amount), 0), adSpend,
      cac: adSpend > 0 && cust > 0 ? money(adSpend / cust) : 'Not recorded', roas: adSpend > 0 && revn > 0 ? (revn / adSpend).toFixed(2) + '×' : 'Not recorded', conv: clicks > 0 && conv >= 0 && ads.some(e => e.conversions != null) ? (100 * conv / clicks).toFixed(1) + '%' : 'Not recorded' }
  }
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  const pending = rows.filter(e => ['requires_approval', 'proposed'].includes(e.approval_status)).length
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">Advertising & Expenses</h1><p className="text-slate-500">Only approved expenses count as spending. Proposed budgets are not approved money.</p></header>
      <NewExpense products={(products.data ?? []).map((p: any) => ({ id: p.id, name: p.name }))} />
      <section className="grid gap-3 md:grid-cols-3">
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">Approved spending</div><div className="text-2xl font-semibold">{money(approved.reduce((s, e) => s + num(e.amount), 0))}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">Waiting for your approval</div><div className="text-2xl font-semibold">{pending}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">Rejected</div><div className="text-2xl font-semibold">{rows.filter(e => e.approval_status === 'rejected').length}</div></div>
      </section>
      <section className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm">
        <thead className="text-left text-slate-500"><tr>{['Product', 'Proposed (not approved)', 'Approved spend', 'Approved ad spend', 'Cost per customer', 'Return on ad spend', 'Conversion rate'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{(products.data ?? []).map((p: any) => { const b = by(p.id); return <tr key={p.id} className="border-t"><td className="p-3">{p.name}</td><td className="p-3">{money(b.proposed)}</td><td className="p-3">{money(b.approved)}</td><td className="p-3">{money(b.adSpend)}</td><td className="p-3">{b.cac}</td><td className="p-3">{b.roas}</td><td className="p-3">{b.conv}</td></tr> })}</tbody></table>
        <p className="text-xs text-slate-500 p-3">Cost per customer = approved ad spend ÷ attributed new customers. Return on ad spend = attributed revenue ÷ ad spend. Conversion rate = conversions ÷ link clicks × 100. Enter the attributed customers, revenue, clicks, and conversions on each ad expense. “Not recorded” means a needed number is missing or zero.</p></section>
      <form className="flex flex-wrap gap-2">
        <select name="product" defaultValue={f.product ?? ''} className={sel}><option value="">All products</option>{(products.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="cat" defaultValue={f.cat ?? ''} className={sel}><option value="">All categories</option>{['paid_advertising','content_production','design','printing','events','software','other'].map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <select name="appr" defaultValue={f.appr ?? ''} className={sel}><option value="">All approval statuses</option>{['proposed','requires_approval','approved','rejected'].map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button><a href="/expenses/export" className="border rounded-lg px-3 py-2 bg-white text-sm">Export CSV</a>
      </form>
      {all.error && <p className="text-red-600 text-sm">Could not load: {all.error.message}</p>}
      {shown.length === 0 ? <p className="text-sm text-slate-500">No expenses recorded.</p> : (
        <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm">
          <thead className="text-left text-slate-500"><tr>{['Date', 'Product', 'Category', 'Description', 'Amount', 'Approval'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{shown.map(e => <tr key={e.id} className="border-t hover:bg-slate-50"><td className="p-3"><Link href={`/expenses/${e.id}`} className="text-blue-600">{e.expense_date}</Link></td><td className="p-3">{e.products?.name ?? '–'}</td><td className="p-3">{nice(e.category)}</td><td className="p-3">{e.description ?? '–'}</td><td className="p-3">{money(num(e.amount))}</td><td className={`p-3 ${e.approval_status === 'approved' ? 'text-green-700' : 'text-amber-600'}`}>{nice(e.approval_status)}</td></tr>)}</tbody></table></div>)}
    </div>
  )
}
