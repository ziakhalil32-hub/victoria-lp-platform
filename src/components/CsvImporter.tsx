'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseCsv } from '@/lib/parseCsv'
import type { Prepared, Template } from '@/lib/importHelpers'
import type { SupabaseClient } from '@supabase/supabase-js'
export default function CsvImporter({ title, template, filename, note, prepare, commit }: {
  title: string; template: Template; filename: string; note: string
  prepare: (rows: Record<string, string>[], sb: SupabaseClient) => Promise<Prepared>
  commit: (valid: any[], sb: SupabaseClient) => Promise<{ added: number; error?: string }>
}) {
  const router = useRouter(); const sb = useRef(createClient()).current; const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false); const [prep, setPrep] = useState<Prepared | null>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  function downloadTemplate() {
    const q = (s: string) => '"' + s.replace(/"/g, '""') + '"'
    const blob = new Blob(['﻿' + [template.header.join(','), template.example.map(q).join(',')].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href)
  }
  async function check() {
    const f = fileRef.current?.files?.[0]; if (!f) { setMsg('Choose a CSV file first.'); return }
    if (f.size > 3 * 1024 * 1024) { setMsg('That file is over 3 MB. Split it into smaller files.'); return }
    setBusy(true); setMsg(''); setPrep(null)
    try {
      const rows = parseCsv(await f.text())
      if (rows.length === 0) { setMsg('No data rows found. The first row must be column headers, followed by at least one row of data.'); setBusy(false); return }
      if (rows.length > 5000) { setMsg('That file has more than 5,000 rows. Split it into smaller files.'); setBusy(false); return }
      setPrep(await prepare(rows, sb))
    } catch (e: any) { setMsg('Could not read the file: ' + e.message) }
    setBusy(false)
  }
  async function run() {
    if (!prep || prep.valid.length === 0) return
    if (!confirm(`Import ${prep.valid.length} row(s) now?`)) return
    setBusy(true); setMsg('Importing…')
    const r = await commit(prep.valid, sb); setBusy(false)
    if (r.error) { setMsg(`${r.added} row(s) were saved before an error stopped the import: ${r.error} Running the same file again will skip rows already saved.`); router.refresh(); return }
    setMsg(`Done. ${r.added} row(s) imported and saved.`); setPrep(null); if (fileRef.current) fileRef.current.value = ''; router.refresh()
  }
  if (!open) return <button className="border bg-white rounded-lg px-4 py-2 text-sm" onClick={() => setOpen(true)}>Import CSV</button>
  return (
    <div className="bg-white border rounded-2xl p-4 space-y-3 w-full">
      <div className="flex gap-4 text-sm"><b>{title}</b><button className="text-slate-500" onClick={() => { setOpen(false); setPrep(null); setMsg('') }}>Close</button></div>
      <p className="text-xs text-slate-500">{note}</p>
      <button className="text-sm text-blue-600" onClick={downloadTemplate}>Download a template file</button>
      <div className="flex flex-wrap gap-3 items-center"><input ref={fileRef} type="file" accept=".csv,text/csv" className="text-sm" onChange={() => { setPrep(null); setMsg('') }} /><button disabled={busy} className="bg-slate-800 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" onClick={check}>{busy && !prep ? 'Checking…' : 'Check file'}</button></div>
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
      {prep && (<div className="space-y-2 text-sm">
        <p><b>{prep.valid.length}</b> row(s) ready to import · <b>{prep.skipped.length}</b> skipped. Nothing is saved until you click Import.</p>
        {prep.notes.map((n, i) => <p key={i} className="text-amber-700">{n}</p>)}
        {prep.skipped.length > 0 && <details><summary className="cursor-pointer text-slate-600">Why rows were skipped (row 1 is the first data row under your headers, not counting blank lines)</summary><ul className="pt-1 list-disc pl-5 text-slate-600">{prep.skipped.slice(0, 25).map((s, i) => <li key={i}>Row {s.row}: {s.reason}</li>)}{prep.skipped.length > 25 && <li>…and {prep.skipped.length - 25} more</li>}</ul></details>}
        <button disabled={busy || prep.valid.length === 0} className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50" onClick={run}>{busy ? 'Importing…' : `Import ${prep.valid.length} row(s)`}</button></div>)}
    </div>
  )
}
