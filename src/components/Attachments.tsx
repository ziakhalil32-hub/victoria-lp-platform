'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
type A = { id: string; name: string; storage_path: string; mime_type: string | null; size_bytes: number | null; created_at: string }
const MAX = 50 * 1024 * 1024
const BLOCKED = /\.(exe|bat|cmd|sh|js|mjs|html?|svg|php|jar|msi|scr|com)$/i
const kb = (n: number | null) => (n == null ? '' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')
const safe = (n: string) => n.replace(/[^\w.\-]+/g, '_').slice(-80)
export default function Attachments({ table, id, initial, title, hint }: { table: 'content' | 'expenses' | 'tasks'; id: string; initial: A[]; title: string; hint: string }) {
  const sb = useRef(createClient()).current
  const [items, setItems] = useState<A[]>(initial); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  async function upload() {
    const files = Array.from(fileRef.current?.files ?? []); if (files.length === 0) { setMsg('Choose a file first.'); return }
    setBusy(true); let ok = 0; const problems: string[] = []
    for (const f of files) {
      if (f.size > MAX) { problems.push(`${f.name}: over 50 MB`); continue }
      if (BLOCKED.test(f.name)) { problems.push(`${f.name}: file type not allowed`); continue }
      setMsg(`Uploading ${f.name}…`)
      const path = `attachments/${table}/${id}/${crypto.randomUUID()}-${safe(f.name)}`
      const up = await sb.storage.from('marketing-assets').upload(path, f, { contentType: f.type || undefined })
      if (up.error) { problems.push(`${f.name}: ${up.error.message}`); continue }
      const { data, error } = await sb.from('attachments').insert({ entity_table: table, entity_id: id, name: f.name, storage_path: path, mime_type: f.type || null, size_bytes: f.size }).select().single()
      if (error || !data) { await sb.storage.from('marketing-assets').remove([path]); problems.push(`${f.name}: could not save record (${error?.message ?? 'unknown'})`); continue }
      setItems(x => [data as A, ...x]); ok++
    }
    setBusy(false); if (fileRef.current) fileRef.current.value = ''
    setMsg((ok ? `${ok} file(s) uploaded and saved. ` : '') + (problems.length ? 'Problems: ' + problems.join('; ') : ''))
  }
  async function open(a: A, download: boolean) {
    const { data, error } = await sb.storage.from('marketing-assets').createSignedUrl(a.storage_path, 300, download ? { download: a.name } : undefined)
    if (error || !data) { setMsg('Could not open the file: ' + (error?.message ?? 'unknown')); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }
  async function remove(a: A) {
    if (!confirm(`Remove "${a.name}" from this record? It is hidden, and the file itself is kept in storage.`)) return
    const { error } = await sb.from('attachments').update({ deleted_at: new Date().toISOString() }).eq('id', a.id)
    if (error) { setMsg(error.message); return }
    setItems(x => x.filter(y => y.id !== a.id))
  }
  return (
    <section className="bg-white rounded-2xl border p-4 space-y-3">
      <h2 className="font-semibold">{title}</h2><p className="text-xs text-slate-500">{hint} Up to 50 MB per file. Files are private and open only through short-lived links after you sign in.</p>
      <div className="flex flex-wrap gap-3 items-center"><input ref={fileRef} type="file" multiple className="text-sm" /><button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" onClick={upload}>{busy ? 'Working…' : 'Upload'}</button></div>
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
      {items.length === 0 ? <p className="text-sm text-slate-500">No files attached yet.</p> : <ul className="divide-y border rounded-xl text-sm">{items.map(a => (
        <li key={a.id} className="p-3 flex flex-wrap justify-between gap-2"><span className="break-all">{a.name} <span className="text-xs text-slate-500">{kb(a.size_bytes)} · {a.created_at.slice(0, 10)}</span></span>
          <span className="flex gap-3"><button className="text-blue-600" onClick={() => open(a, false)}>Preview</button><button className="text-blue-600" onClick={() => open(a, true)}>Download</button><button className="text-slate-400 hover:text-red-600" onClick={() => remove(a)}>Remove</button></span></li>))}</ul>}
    </section>
  )
}
