import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewCustomer from '@/components/NewCustomer'
import ImportCustomers from '@/components/ImportCustomers'
export const dynamic = 'force-dynamic'
const nice = (s: string | null) => (s ? s.replace(/_/g, ' ') : '–')
const LEAD = ['new','contacted','interested','qualified','follow_up_required','converted','not_interested','archived']
const CUST = ['prospect','customer','repeat_customer','event_attendee','course_student']
export default async function Customers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  let q = sb.from('customers').select('id,first_name,last_name,email,lead_status,customer_status,next_follow_up_date,products(name)').is('deleted_at', null).order('next_follow_up_date', { nullsFirst: false }).order('created_at', { ascending: false })
  if (f.lead) q = q.eq('lead_status', f.lead); if (f.cust) q = q.eq('customer_status', f.cust); if (f.product) q = q.eq('product_id', f.product)
  if (f.q) q = q.or(`first_name.ilike.%${f.q}%,last_name.ilike.%${f.q}%,email.ilike.%${f.q}%,organization.ilike.%${f.q}%`)
  const [{ data, error }, products] = await Promise.all([q, sb.from('products').select('id,name').is('deleted_at', null)])
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Customers & Leads</h1><p className="text-slate-500">Everyone you are talking to or selling to, with follow-up dates.</p></div>
        <NewCustomer />
      </header>
      <ImportCustomers />
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={f.q} placeholder="Search name, email, organization" className={sel + ' min-w-[14rem]'} />
        <select name="lead" defaultValue={f.lead ?? ''} className={sel}><option value="">All lead statuses</option>{LEAD.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <select name="cust" defaultValue={f.cust ?? ''} className={sel}><option value="">All customer statuses</option>{CUST.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <select name="product" defaultValue={f.product ?? ''} className={sel}><option value="">All products</option>{(products.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button>
        <a href="/customers/export" className="border rounded-lg px-3 py-2 bg-white text-sm">Export CSV</a>
      </form>
      {error && <p className="text-red-600 text-sm">Could not load: {error.message}</p>}
      {(data ?? []).length === 0 ? <p className="text-sm text-slate-500">No contacts yet. Click “+ Add customer or lead.”</p> : (
        <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm">
          <thead className="text-left text-slate-500"><tr>{['Name','Email','Product','Lead status','Customer status','Next follow-up'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(data ?? []).map((c: any) => (
            <tr key={c.id} className="border-t hover:bg-slate-50">
              <td className="p-3"><Link href={`/customers/${c.id}`} className="text-blue-600">{[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed'}</Link></td>
              <td className="p-3">{c.email ?? '–'}</td><td className="p-3">{c.products?.name ?? '–'}</td><td className="p-3">{nice(c.lead_status)}</td><td className="p-3">{nice(c.customer_status)}</td>
              <td className={`p-3 ${c.next_follow_up_date && c.next_follow_up_date < today ? 'text-red-600' : ''}`}>{c.next_follow_up_date ?? '–'}{c.next_follow_up_date && c.next_follow_up_date < today ? ' (overdue)' : ''}</td>
            </tr>))}</tbody></table></div>)}
    </div>
  )
}
