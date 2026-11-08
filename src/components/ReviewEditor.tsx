'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const cls = 'w-full border rounded-lg p-2 bg-white'
export default function ReviewEditor({ review, products, customers }: { review: Row; products: Row[]; customers: Row[] }) {
  const a = useAutosave(); const [r, setR] = useState<Row>(review)
  a.register('reviews', r.id, review.version)
  const edit = (patch: Row, imm = false) => { setR(x => ({ ...x, ...patch })); a.save('reviews', r.id, patch, imm) }
  const T = (label: string, k: string, type = 'text') => (<label className="block text-sm"><span className="text-slate-600">{label}</span><input type={type} className={cls} value={r[k] ?? ''} onChange={e => edit({ [k]: e.target.value === '' ? null : e.target.value }, type === 'date')} /></label>)
  const blocked = r.has_connection || r.eligibility === 'not_eligible'
  function markRequested() {
    if (blocked) return
    if (!confirm('Confirm you sent the neutral request: no incentive, no star rating requested?')) return
    edit({ request_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) }, true)
  }
  async function archive() {
    if (!confirm('Archive this record? It is hidden, not permanently erased.')) return
    const { error } = await a.sb.from('reviews').update({ deleted_at: new Date().toISOString() }).eq('id', r.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    window.location.href = '/reviews'
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start"><div><h1 className="text-2xl font-semibold">Review record</h1><p className="text-sm text-slate-500">Changes save automatically.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <section className="bg-white rounded-2xl border p-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm"><span className="text-slate-600">Product</span><select className={cls} value={r.product_id} onChange={e => edit({ product_id: e.target.value }, true)}>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Customer</span><select className={cls} value={r.customer_id ?? ''} onChange={e => edit({ customer_id: e.target.value || null }, true)}><option value="">None</option>{customers.map(c => <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(' ')} {c.email ?? ''}</option>)}</select></label>
        {T('Purchase date', 'purchase_date', 'date')}{T('Amazon listing URL', 'listing_url')}
        <label className="flex gap-2 items-start text-sm md:col-span-2"><input type="checkbox" className="h-5 w-5 mt-0.5" checked={r.has_connection} onChange={e => edit(e.target.checked ? { has_connection: true, request_date: null } : { has_connection: false }, true)} /><span>This person has a personal or financial connection to me (family, close friend, employee, business partner, or anyone paid). Do not ask them for a review.</span></label>
        <label className="block text-sm"><span className="text-slate-600">Review eligibility</span><select className={cls} value={r.eligibility} onChange={e => edit(e.target.value === 'not_eligible' ? { eligibility: e.target.value, request_date: null } : { eligibility: e.target.value }, true)}>{[['not_checked', 'Not checked'], ['eligible', 'Eligible'], ['not_eligible', 'Not eligible']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <div className="text-sm"><span className="text-slate-600">Review request sent</span>
          <div className="p-2 flex gap-3 items-center">{r.request_date ?? 'Not sent'}{!r.request_date && <button disabled={blocked} className="text-blue-600 disabled:text-slate-300" onClick={markRequested}>Mark request sent</button>}{r.request_date && <button className="text-slate-500" onClick={() => edit({ request_date: null }, true)}>Clear</button>}</div>
          {blocked && <p className="text-xs text-amber-700">Requests are blocked for this person.</p>}</div>
        <label className="flex gap-2 items-center text-sm"><input type="checkbox" className="h-5 w-5" checked={r.review_received} onChange={e => edit({ review_received: e.target.checked }, true)} />Review received (visible on Amazon)</label>
        <label className="block text-sm"><span className="text-slate-600">Rating (only if publicly visible)</span><select className={cls} value={r.rating ?? ''} onChange={e => edit({ rating: e.target.value === '' ? null : Number(e.target.value) }, true)}><option value="">Not recorded</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}</select></label>
        {T('Feedback date', 'feedback_date', 'date')}
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Feedback text (copied from the public review)</span><textarea className={cls} rows={4} value={r.feedback_text ?? ''} onChange={e => edit({ feedback_text: e.target.value })} /></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Improvement notes (what you will learn from this)</span><textarea className={cls} rows={3} value={r.improvement_notes ?? ''} onChange={e => edit({ improvement_notes: e.target.value })} /></label>
      </section>
      <button className="text-sm text-slate-500 hover:text-red-600" onClick={archive}>Archive this record</button>
    </div>
  )
}
