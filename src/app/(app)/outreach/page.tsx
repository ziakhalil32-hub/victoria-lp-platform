import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewPartnership from '@/components/NewPartnership'
export const dynamic = 'force-dynamic'
const nice = (s: string | null) => (s ? s.replace(/_/g, ' ') : '–')
const GOAL = 5
export default async function Outreach({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  const mon = d.toISOString().slice(0, 10), sun = new Date(d.getTime() + 6 * 86400000).toISOString().slice(0, 10)
  let q = sb.from('partnerships').select('id,organization,contact_person,organization_type,status,last_contact_date,next_follow_up_date,resulting_sales').is('deleted_at', null).order('next_follow_up_date', { nullsFirst: false }).order('organization')
  if (f.status) q = q.eq('status', f.status); if (f.type) q = q.eq('organization_type', f.type)
  if (f.q) q = q.or(`organization.ilike.%${f.q}%,contact_person.ilike.%${f.q}%`)
  const [{ data, error }, week, types] = await Promise.all([q, sb.from('outreach_interactions').select('partnership_id').is('deleted_at', null).gte('interaction_date', mon).lte('interaction_date', sun), sb.from('partnerships').select('organization_type').is('deleted_at', null)])
  const done = new Set((week.data ?? []).map((x: any) => x.partnership_id)).size
  const pct = Math.min(100, Math.round(100 * done / GOAL))
  const typeList = [...new Set((types.data ?? []).map((t: any) => t.organization_type).filter(Boolean))] as string[]
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap"><div><h1 className="text-2xl font-semibold">Partnerships & Outreach</h1><p className="text-slate-500">Organizations and people you are reaching out to. A partnership is only “confirmed” when you confirm it.</p></div><NewPartnership /></header>
      <section className="bg-white border rounded-2xl p-4 space-y-2"><div className="flex justify-between text-sm"><b>Weekly goal: {GOAL} organizations contacted</b><span>{done} of {GOAL} this week ({mon} to {sun})</span></div>
        <div className="h-2 bg-slate-200 rounded"><div className="h-2 bg-blue-600 rounded" style={{ width: pct + '%' }} /></div><p className="text-xs text-slate-500">Counts organizations that have a logged outreach interaction dated this week. Open an organization and click “Log outreach.”</p></section>
      <form className="flex flex-wrap gap-2"><input name="q" defaultValue={f.q} placeholder="Search organization or contact" className={sel} />
        <select name="status" defaultValue={f.status ?? ''} className={sel}><option value="">All statuses</option>{['identified','researching','ready_to_contact','contacted','responded','follow_up_required','meeting_scheduled','partnership_confirmed','declined','archived'].map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <select name="type" defaultValue={f.type ?? ''} className={sel}><option value="">All types</option>{typeList.map(t => <option key={t}>{t}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button><a href="/outreach/export" className="border rounded-lg px-3 py-2 bg-white text-sm">Export CSV</a></form>
      {error && <p className="text-red-600 text-sm">Could not load: {error.message}</p>}
      {(data ?? []).length === 0 ? <p className="text-sm text-slate-500">No organizations yet. Click “+ Add organization” to start your list.</p> : (
        <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm">
          <thead className="text-left text-slate-500"><tr>{['Organization', 'Contact', 'Type', 'Status', 'Last contact', 'Next follow-up'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(data ?? []).map((p: any) => { const late = p.next_follow_up_date && p.next_follow_up_date < today && !['declined', 'archived', 'partnership_confirmed'].includes(p.status)
            return <tr key={p.id} className="border-t hover:bg-slate-50"><td className="p-3"><Link href={`/outreach/${p.id}`} className="text-blue-600">{p.organization}</Link></td><td className="p-3">{p.contact_person ?? '–'}</td><td className="p-3">{p.organization_type ?? '–'}</td>
              <td className={`p-3 ${p.status === 'partnership_confirmed' ? 'text-green-700' : ''}`}>{nice(p.status)}</td><td className="p-3">{p.last_contact_date ?? '–'}</td><td className={`p-3 ${late ? 'text-red-600' : ''}`}>{p.next_follow_up_date ?? '–'}{late ? ' (overdue)' : ''}</td></tr> })}</tbody></table></div>)}
    </div>
  )
}
