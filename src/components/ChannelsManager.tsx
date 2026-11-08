'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const VERIFY = ['not_checked', 'pending', 'verified', 'broken', 'unavailable']
const cls = 'w-full border rounded-lg p-2 bg-white text-sm'
const nice = (s: string) => s.replace(/_/g, ' ')
export default function ChannelsManager({ channels, products, brands, history }: { channels: Row[]; products: Row[]; brands: Row[]; history: Row[] }) {
  const a = useAutosave(); const [rows, setRows] = useState<Row[]>(channels)
  const [hist, setHist] = useState<Record<string, Row[]>>(() => history.reduce((m: Record<string, Row[]>, h) => { (m[h.channel_id] ??= []).push(h); return m }, {}))
  channels.forEach(c => a.register('channel_links', c.id, c.version))
  const edit = (id: string, patch: Row, imm = false) => { setRows(x => x.map(r => r.id === id ? { ...r, ...patch } : r)); a.save('channel_links', id, patch, imm) }
  async function setStatus(c: Row, v: string) {
    if (v === 'verified') {
      if (!confirm(`Confirm you checked ${c.name} and it is set up and working (links open, the right page or profile, and any checkout works where it applies)?`)) return
      const { error } = await a.sb.from('approvals').insert({ entity_table: 'channel_links', entity_id: c.id, action: 'mark_channel_verified', decision: 'approved' })
      if (error) { a.setStatus('failed'); a.setMsg('Could not record approval: ' + error.message); return }
    }
    const now = new Date().toISOString()
    const { error } = await a.sb.from('link_verifications').insert({ channel_id: c.id, status: v })
    if (error) { a.setStatus('failed'); a.setMsg('Could not log the check: ' + error.message); return }
    setHist(h => ({ ...h, [c.id]: [{ status: v, checked_at: now }, ...(h[c.id] ?? [])] }))
    edit(c.id, { verification_status: v, last_checked_at: now }, true)
  }
  const toggleProduct = (c: Row, pid: string) => { const cur: string[] = c.product_ids ?? []; edit(c.id, { product_ids: cur.includes(pid) ? cur.filter(x => x !== pid) : [...cur, pid] }, true) }
  async function add() {
    const name = prompt('Channel name?'); if (!name?.trim()) return
    a.setStatus('saving')
    const { data, error } = await a.sb.from('channel_links').insert({ name: name.trim() }).select().single()
    if (error || !data) { a.setStatus('failed'); a.setMsg('Could not add: ' + (error?.message ?? 'unknown')); return }
    a.register('channel_links', data.id, data.version); setRows(x => [...x, data]); a.setStatus('saved')
  }
  async function archive(c: Row) {
    if (!confirm(`Archive ${c.name}? It is hidden, not permanently erased.`)) return
    const { error } = await a.sb.from('channel_links').update({ deleted_at: new Date().toISOString() }).eq('id', c.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    setRows(x => x.filter(r => r.id !== c.id))
  }
  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center"><h2 className="font-semibold">Channels</h2><span className="text-sm text-slate-500">{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <p className="text-xs text-slate-500">“Verified” means you personally checked it. Nothing here is verified automatically, and unverified channels are never treated as active.</p>
      {rows.map(c => (
        <div key={c.id} className="bg-white border rounded-2xl p-4 space-y-2">
          <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_12rem]">
            <input className={cls + ' font-medium'} value={c.name} onChange={e => edit(c.id, { name: e.target.value })} />
            <input className={cls} placeholder="Website or profile URL" value={c.url ?? ''} onChange={e => edit(c.id, { url: e.target.value || null, ...(c.verification_status === 'verified' ? { verification_status: 'pending' } : {}) })} />
            <select className={cls} value={c.verification_status} onChange={e => setStatus(c, e.target.value)}>{VERIFY.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
          </div>
          <div className="grid gap-2 md:grid-cols-[12rem_1fr]">
            <select className={cls} value={c.brand_id ?? ''} onChange={e => edit(c.id, { brand_id: e.target.value || null }, true)}><option value="">No brand</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <div className="flex flex-wrap gap-3 items-center text-sm">{products.map(p => <label key={p.id} className="flex gap-1 items-center"><input type="checkbox" checked={(c.product_ids ?? []).includes(p.id)} onChange={() => toggleProduct(c, p.id)} />{p.name}</label>)}</div>
          </div>
          <input className={cls} placeholder="Notes" value={c.notes ?? ''} onChange={e => edit(c.id, { notes: e.target.value })} />
          <div className="flex justify-between text-xs text-slate-500"><span>{c.last_checked_at ? 'Last checked ' + c.last_checked_at.slice(0, 10) : 'Never checked'}</span><button className="hover:text-red-600" onClick={() => archive(c)}>Archive</button></div>
          {(hist[c.id] ?? []).length > 0 && <details className="text-xs text-slate-500"><summary className="cursor-pointer">Check history</summary><ul className="pt-1">{(hist[c.id] ?? []).slice(0, 8).map((h, i) => <li key={i}>{h.checked_at.slice(0, 10)} · {nice(h.status)}</li>)}</ul></details>}
        </div>))}
      <button className="text-sm text-blue-600" onClick={add}>+ Add channel</button>
    </section>
  )
}
