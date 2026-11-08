'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
import { generateSections, SECTIONS } from '@/lib/generateReport'
type Row = Record<string, any>
export default function ReportEditor({ report }: { report: Row }) {
  const a = useAutosave(); const [r, setR] = useState<Row>(report); const [sec, setSec] = useState<Record<string, string>>(report.sections ?? {})
  a.register('reports', r.id, report.version)
  const final = r.status === 'final'
  function edit(k: string, v: string) { const next = { ...sec, [k]: v }; setSec(next); a.save('reports', r.id, { sections: next }, false) }
  async function refresh() {
    if (!confirm('Rebuild every section from your records? This REPLACES your manual edits in this report.')) return
    a.setStatus('saving')
    try { const s = await generateSections(a.sb, r.week_start); setSec(s); a.save('reports', r.id, { sections: s, generated_at: new Date().toISOString() }, true) } catch (e: any) { a.setStatus('failed'); a.setMsg('Could not rebuild: ' + e.message) }
  }
  function setFinal(f: boolean) { if (f && !confirm('Mark this report as final?')) return; setR(x => ({ ...x, status: f ? 'final' : 'draft' })); a.save('reports', r.id, { status: f ? 'final' : 'draft' }, true) }
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start gap-3 flex-wrap"><div><h1 className="text-2xl font-semibold">Weekly Report</h1><p className="text-slate-600">{r.week_start} to {r.week_end} · {r.status}</p><p className="text-sm text-slate-500 print:hidden">Changes save automatically. “Not recorded” means that information is not tracked or has not been entered.</p></div>
        <span className={`text-sm print:hidden ${a.status === 'failed' ? 'text-red-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600 print:hidden">{a.msg}</p>}
      <div className="flex flex-wrap gap-4 text-sm print:hidden">
        <button className="text-blue-600" onClick={() => window.print()}>Print / Save as PDF</button>
        <a className="text-blue-600" href={`/reports/${r.id}/export`}>Download CSV (opens in Excel)</a>
        {!final && <button className="text-slate-600" onClick={refresh}>Rebuild from records</button>}
        <button className="text-slate-600" onClick={() => setFinal(!final)}>{final ? 'Reopen as draft' : 'Mark as final'}</button>
      </div>
      {SECTIONS.map(([k, label]) => (
        <section key={k} className="bg-white border rounded-2xl p-4 space-y-2 break-inside-avoid"><h2 className="font-semibold">{label}</h2>
          <textarea className="w-full border rounded-lg p-2 bg-white text-sm print:border-0" rows={Math.min(14, Math.max(3, (sec[k] ?? '').split('\n').length + 1))} value={sec[k] ?? ''} disabled={final} onChange={e => edit(k, e.target.value)} /></section>))}
    </div>
  )
}
