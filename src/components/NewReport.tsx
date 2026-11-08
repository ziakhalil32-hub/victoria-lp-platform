'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateSections } from '@/lib/generateReport'
const monday = () => { const t = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); const d = new Date(t + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10) }
export default function NewReport() {
  const router = useRouter(); const sb = createClient()
  const [ws, setWs] = useState(monday()); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')
  async function go() {
    if (new Date(ws + 'T12:00:00Z').getUTCDay() !== 1) { setMsg('Pick a Monday. Reports cover Monday through Sunday.'); return }
    setBusy(true); setMsg('')
    try {
      const sections = await generateSections(sb, ws)
      const we = new Date(Date.parse(ws + 'T12:00:00Z') + 6 * 86400000).toISOString().slice(0, 10)
      const { data, error } = await sb.from('reports').insert({ week_start: ws, week_end: we, sections, generated_at: new Date().toISOString() }).select('id').single()
      if (error || !data) { setMsg(error?.code === '23505' ? 'A report for that week already exists. Open it from the list below.' : 'Could not save: ' + (error?.message ?? 'unknown')); setBusy(false); return }
      router.push('/reports/' + data.id)
    } catch (e: any) { setMsg('Could not generate: ' + e.message); setBusy(false) }
  }
  return (<div className="space-y-2"><div className="flex flex-wrap gap-2 items-center"><label className="text-sm text-slate-600">Week starting (Monday)</label><input type="date" className="border rounded-lg p-2 bg-white text-sm" value={ws} onChange={e => setWs(e.target.value)} />
    <button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" onClick={go}>{busy ? 'Generating…' : 'Generate report from my records'}</button></div>{msg && <p className="text-sm text-red-600">{msg}</p>}</div>)
}
