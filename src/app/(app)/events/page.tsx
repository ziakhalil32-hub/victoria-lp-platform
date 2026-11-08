import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewEvent from '@/components/NewEvent'
export const dynamic = 'force-dynamic'
const nice = (s: string | null) => (s ? s.replace(/_/g, ' ') : '–')
const num = (n: number | null) => (n == null ? '–' : n)
export default async function Events({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  let q = sb.from('events').select('id,name,event_type,event_date,start_time,location,status,registration_count,attendance,revenue,expenses,products(name)').is('deleted_at', null).order('event_date', { nullsFirst: false })
  if (f.status) q = q.eq('status', f.status); if (f.type) q = q.eq('event_type', f.type); if (f.q) q = q.ilike('name', `%${f.q}%`)
  const { data, error } = await q
  const days = (d: string) => Math.ceil((Date.parse(d + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000)
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap"><div><h1 className="text-2xl font-semibold">Events & Workshops</h1><p className="text-slate-500">Workshops, book events, webinars, and live sessions.</p></div><NewEvent /></header>
      <form className="flex flex-wrap gap-2"><input name="q" defaultValue={f.q} placeholder="Search events" className={sel} />
        <select name="type" defaultValue={f.type ?? ''} className={sel}><option value="">All types</option>{['workshop','book_signing','book_celebration','educational_session','webinar','live_discussion','networking','other'].map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <select name="status" defaultValue={f.status ?? ''} className={sel}><option value="">All statuses</option>{['planning','confirmed','completed','cancelled','postponed'].map(s => <option key={s}>{s}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button><a href="/events/export" className="border rounded-lg px-3 py-2 bg-white text-sm">Export CSV</a></form>
      {error && <p className="text-red-600 text-sm">Could not load: {error.message}</p>}
      <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm">
        <thead className="text-left text-slate-500"><tr>{['Event', 'Type', 'Date', 'Status', 'Registered', 'Attended', 'Revenue', 'Expenses'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{(data ?? []).map((e: any) => <tr key={e.id} className="border-t hover:bg-slate-50"><td className="p-3"><Link href={`/events/${e.id}`} className="text-blue-600">{e.name}</Link>{e.products?.name && <div className="text-xs text-slate-500">{e.products.name}</div>}</td>
          <td className="p-3">{nice(e.event_type)}</td><td className="p-3">{e.event_date ?? 'Date not set'}{e.event_date && e.event_date >= today && e.status !== 'cancelled' && <div className="text-xs text-slate-500">in {days(e.event_date)} days</div>}</td>
          <td className="p-3">{e.status}</td><td className="p-3">{num(e.registration_count)}</td><td className="p-3">{num(e.attendance)}</td><td className="p-3">{e.revenue == null ? '–' : '$' + Number(e.revenue).toFixed(2)}</td><td className="p-3">{e.expenses == null ? '–' : '$' + Number(e.expenses).toFixed(2)}</td></tr>)}</tbody></table>
        <p className="text-xs text-slate-500 p-3">A dash means “Not recorded.”</p></div>
    </div>
  )
}
