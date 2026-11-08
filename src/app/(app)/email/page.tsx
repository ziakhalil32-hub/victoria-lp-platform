import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewCampaign from '@/components/NewCampaign'
export const dynamic = 'force-dynamic'
const nice = (s: string | null) => (s ? s.replace(/_/g, ' ') : '–')
const ORDER = ['introduction', 'what_is_inside', 'why_created', 'final_opportunity', 'launch_day']
export default async function Email({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  const [lists, subs, elig, camps] = await Promise.all([
    sb.from('email_lists').select('id,name,description,product_id,products(name)').is('deleted_at', null).order('name'),
    sb.from('subscribers').select('list_id,subscription_status').is('deleted_at', null),
    sb.from('v_eligible_subscribers').select('list_id'),
    sb.from('email_campaigns').select('id,name,stage,subject,status,scheduled_for,sent_at,list_id,email_lists(name)').is('deleted_at', null).order('created_at'),
  ])
  const L: any[] = lists.data ?? []
  const total = (id: string) => (subs.data ?? []).filter((s: any) => s.list_id === id).length
  const unsub = (id: string) => (subs.data ?? []).filter((s: any) => s.list_id === id && s.subscription_status === 'unsubscribed').length
  const eligible = (id: string) => (elig.data ?? []).filter((s: any) => s.list_id === id).length
  const rows = (camps.data ?? []).filter((c: any) => (!f.list || c.list_id === f.list) && (!f.status || c.status === f.status))
    .sort((a: any, b: any) => (a.email_lists?.name ?? '').localeCompare(b.email_lists?.name ?? '') || ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage))
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-semibold">Email Marketing</h1><p className="text-slate-500">Three separate audiences. This app prepares and tracks emails; you send them from your email tool.</p></div>
        {L[0] && <NewCampaign listId={L[0].id} productId={L[0].product_id} />}
      </header>
      <div className="flex gap-4 text-sm"><Link href="/email/subscribers" className="text-blue-600">Subscribers →</Link><Link href="/email/suppressions" className="text-blue-600">Suppression list →</Link></div>
      {(lists.error || subs.error || camps.error) && <p className="text-red-600 text-sm">Could not load: {(lists.error ?? subs.error ?? camps.error)?.message}</p>}
      <section className="grid gap-3 md:grid-cols-3">
        {L.map(l => <div key={l.id} className="bg-white border rounded-2xl p-4 space-y-1"><b>{l.name}</b><div className="text-xs text-slate-500">For {l.products?.name ?? 'no product'}</div>
          <div className="text-3xl font-semibold">{eligible(l.id)}<span className="text-sm font-normal text-slate-500"> eligible to email</span></div>
          <div className="text-xs text-slate-500">{total(l.id)} total · {unsub(l.id)} unsubscribed</div></div>)}
      </section>
      <form className="flex flex-wrap gap-2">
        <select name="list" defaultValue={f.list ?? ''} className={sel}><option value="">All audiences</option>{L.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select name="status" defaultValue={f.status ?? ''} className={sel}><option value="">All statuses</option>{['draft','ready_for_review','approved','scheduled','sent','cancelled'].map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button>
      </form>
      <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm">
        <thead className="text-left text-slate-500"><tr>{['Campaign', 'Audience', 'Subject', 'Status', 'Scheduled', 'Sent'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{rows.map((c: any) => <tr key={c.id} className="border-t hover:bg-slate-50"><td className="p-3"><Link href={`/email/campaigns/${c.id}`} className="text-blue-600">{c.name}</Link></td><td className="p-3">{c.email_lists?.name ?? '–'}</td><td className="p-3">{c.subject ?? <span className="text-slate-400">No subject yet</span>}</td>
          <td className="p-3">{nice(c.status)}</td><td className="p-3">{c.scheduled_for ? c.scheduled_for.slice(0, 10) : '–'}</td><td className="p-3">{c.sent_at ? c.sent_at.slice(0, 10) : 'Not sent'}</td></tr>)}</tbody></table></div>
    </div>
  )
}
