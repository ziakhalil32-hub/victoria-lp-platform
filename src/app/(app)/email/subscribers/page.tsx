import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SubscriberTools from '@/components/SubscriberTools'
export const dynamic = 'force-dynamic'
const nice = (s: string | null) => (s ? s.replace(/_/g, ' ') : '–')
export default async function Subscribers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  let q = sb.from('subscribers').select('id,first_name,last_name,email,consent_status,subscription_status,signup_date,email_lists(name)').is('deleted_at', null).order('created_at', { ascending: false }).limit(500)
  if (f.list) q = q.eq('list_id', f.list); if (f.sub) q = q.eq('subscription_status', f.sub); if (f.consent) q = q.eq('consent_status', f.consent)
  if (f.q) q = q.or(`first_name.ilike.%${f.q}%,last_name.ilike.%${f.q}%,email.ilike.%${f.q}%`)
  const [{ data, error }, lists] = await Promise.all([q, sb.from('email_lists').select('id,name').is('deleted_at', null).order('name')])
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-6">
      <header><Link href="/email" className="text-sm text-blue-600">← Email Marketing</Link><h1 className="text-2xl font-semibold">Subscribers</h1><p className="text-slate-500">Only subscribers marked “consented” and “subscribed” are eligible for marketing email.</p></header>
      <SubscriberTools lists={lists.data ?? []} />
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={f.q} placeholder="Search name or email" className={sel} />
        <select name="list" defaultValue={f.list ?? ''} className={sel}><option value="">All audiences</option>{(lists.data ?? []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select name="sub" defaultValue={f.sub ?? ''} className={sel}><option value="">All subscription statuses</option>{['subscribed','unsubscribed','bounced','suppressed'].map(s => <option key={s}>{s}</option>)}</select>
        <select name="consent" defaultValue={f.consent ?? ''} className={sel}><option value="">All consent statuses</option>{['consented','unknown','withdrawn'].map(s => <option key={s}>{s}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button><a href="/email/subscribers/export" className="border rounded-lg px-3 py-2 bg-white text-sm">Export CSV</a>
      </form>
      {error && <p className="text-red-600 text-sm">Could not load: {error.message}</p>}
      {(data ?? []).length === 0 ? <p className="text-sm text-slate-500">No subscribers yet.</p> : (
        <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm">
          <thead className="text-left text-slate-500"><tr>{['Name', 'Email', 'Audience', 'Consent', 'Status', 'Signed up'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(data ?? []).map((s: any) => <tr key={s.id} className="border-t hover:bg-slate-50"><td className="p-3"><Link href={`/email/subscribers/${s.id}`} className="text-blue-600">{[s.first_name, s.last_name].filter(Boolean).join(' ') || '(no name)'}</Link></td><td className="p-3">{s.email}</td><td className="p-3">{s.email_lists?.name}</td>
            <td className={`p-3 ${s.consent_status === 'consented' ? 'text-green-700' : 'text-amber-600'}`}>{nice(s.consent_status)}</td><td className="p-3">{nice(s.subscription_status)}</td><td className="p-3">{s.signup_date ?? '–'}</td></tr>)}</tbody></table></div>)}
    </div>
  )
}
