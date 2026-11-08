import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewReport from '@/components/NewReport'
export const dynamic = 'force-dynamic'
export default async function Reports() {
  const sb = await createClient()
  const { data, error } = await sb.from('reports').select('id,week_start,week_end,status,generated_at').is('deleted_at', null).order('week_start', { ascending: false })
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">Weekly Reports</h1><p className="text-slate-500">Prepared from your recorded data, then edited by you. Missing information is labeled, never invented.</p></header>
      <NewReport />
      <p className="text-xs text-slate-500">This app does not send reminders. Generate the report on Monday morning for the week that just ended.</p>
      {error && <p className="text-red-600 text-sm">Could not load: {error.message}</p>}
      {(data ?? []).length === 0 ? <p className="text-sm text-slate-500">No reports yet.</p> : <ul className="bg-white border rounded-2xl divide-y text-sm">{(data ?? []).map((r: any) => <li key={r.id} className="p-3 flex justify-between"><Link href={`/reports/${r.id}`} className="text-blue-600">Week of {r.week_start} to {r.week_end}</Link><span className={r.status === 'final' ? 'text-green-700' : 'text-amber-600'}>{r.status}</span></li>)}</ul>}
    </div>
  )
}
