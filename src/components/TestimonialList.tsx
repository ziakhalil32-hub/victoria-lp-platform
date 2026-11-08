'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const cls = 'w-full border rounded-lg p-2 bg-white text-sm'
const nice = (s: string) => s.replace(/_/g, ' ')
export default function TestimonialList({ rows, products }: { rows: Row[]; products: Row[] }) {
  const a = useAutosave(); const [items, setItems] = useState<Row[]>(rows)
  rows.forEach(r => a.register('testimonials', r.id, r.version))
  const edit = (id: string, patch: Row, imm = false) => { setItems(x => x.map(r => r.id === id ? { ...r, ...patch } : r)); a.save('testimonials', id, patch, imm) }
  async function add() {
    a.setStatus('saving')
    const { data, error } = await a.sb.from('testimonials').insert({ product_id: products[0]?.id ?? null }).select().single()
    if (error || !data) { a.setStatus('failed'); a.setMsg('Could not add: ' + (error?.message ?? 'unknown')); return }
    a.register('testimonials', data.id, data.version); setItems(x => [data, ...x]); a.setStatus('saved')
  }
  async function setPermission(r: Row, v: string) {
    if (v === 'granted' && !confirm('Confirm this person gave you permission (in writing or by message) to use their words as a testimonial?')) return
    edit(r.id, { permission_status: v, ...(v === 'granted' && !r.permission_date ? { permission_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) } : {}) }, true)
  }
  async function remove(r: Row) {
    if (!confirm('Archive this testimonial? It is hidden, not permanently erased.')) return
    const { error } = await a.sb.from('testimonials').update({ deleted_at: new Date().toISOString() }).eq('id', r.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    setItems(x => x.filter(y => y.id !== r.id))
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><p className="text-sm text-slate-600">Course and workshop testimonials are not Amazon reviews. Only use one publicly after permission is <b>granted</b>.</p><span className="text-sm text-slate-500">{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm" onClick={add}>+ Add testimonial</button>
      {items.length === 0 && <p className="text-sm text-slate-500">No testimonials yet. Nothing is invented here.</p>}
      {items.map(r => (
        <div key={r.id} className="bg-white border rounded-2xl p-4 grid gap-2 md:grid-cols-2">
          <input className={cls} placeholder="Person’s name" value={r.person_name ?? ''} onChange={e => edit(r.id, { person_name: e.target.value })} />
          <select className={cls} value={r.product_id ?? ''} onChange={e => edit(r.id, { product_id: e.target.value || null }, true)}><option value="">No product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input className={cls} placeholder="Source (email, survey, course evaluation…)" value={r.source ?? ''} onChange={e => edit(r.id, { source: e.target.value })} />
          <select className={cls} value={r.permission_status} onChange={e => setPermission(r, e.target.value)}>{['not_requested', 'requested', 'granted', 'declined'].map(s => <option key={s} value={s}>Permission: {nice(s)}</option>)}</select>
          <textarea className={cls + ' md:col-span-2'} rows={3} placeholder="Their words, exactly as given" value={r.testimonial_text ?? ''} onChange={e => edit(r.id, { testimonial_text: e.target.value })} />
          <input className={cls + ' md:col-span-2'} placeholder="Notes" value={r.notes ?? ''} onChange={e => edit(r.id, { notes: e.target.value })} />
          <div className="md:col-span-2 flex justify-between text-xs text-slate-500"><span>{r.permission_status === 'granted' ? 'OK to use publicly' + (r.permission_date ? ' (permission ' + r.permission_date + ')' : '') : 'Not cleared for public use'}</span><button className="hover:text-red-600" onClick={() => remove(r)}>Archive</button></div>
        </div>))}
    </div>
  )
}
