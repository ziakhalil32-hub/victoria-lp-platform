'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const LEAD = ['new','contacted','interested','qualified','follow_up_required','converted','not_interested','archived']
const CUST = ['prospect','customer','repeat_customer','event_attendee','course_student']
const cls = 'w-full border rounded-lg p-2 bg-white'
const nice = (s: string) => s.replace(/_/g, ' ')
export default function CustomerEditor({ customer, products }: { customer: Row; products: Row[] }) {
  const a = useAutosave(); const [c, setC] = useState<Row>(customer)
  a.register('customers', c.id, customer.version)
  const edit = (patch: Row, imm = false) => { setC(x => ({ ...x, ...patch })); a.save('customers', c.id, patch, imm) }
  const T = (label: string, k: string, type = 'text') => (
    <label className="block text-sm"><span className="text-slate-600">{label}</span>
      <input type={type} className={cls} value={c[k] ?? ''} onChange={e => edit({ [k]: e.target.value === '' ? null : e.target.value }, type === 'date')} /></label>)
  const S = (label: string, k: string, opts: string[]) => (
    <label className="block text-sm"><span className="text-slate-600">{label}</span>
      <select className={cls} value={c[k] ?? ''} onChange={e => edit({ [k]: e.target.value }, true)}>{opts.map(o => <option key={o} value={o}>{nice(o)}</option>)}</select></label>)
  async function archive() {
    if (!confirm('Archive this contact? It is hidden, not permanently erased.')) return
    const { error } = await a.sb.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', c.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    window.location.href = '/customers'
  }
  return (
    <section className="bg-white rounded-2xl border p-4 space-y-4">
      <div className="flex justify-between items-start"><div><h1 className="text-2xl font-semibold">{[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed'}</h1><p className="text-sm text-slate-500">Changes save automatically.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {T('First name', 'first_name')}{T('Last name', 'last_name')}{T('Email', 'email', 'email')}{T('Phone', 'phone')}{T('Organization', 'organization')}{T('Interest', 'interest')}{T('Lead source', 'source')}
        <label className="block text-sm"><span className="text-slate-600">Associated product</span>
          <select className={cls} value={c.product_id ?? ''} onChange={e => edit({ product_id: e.target.value || null }, true)}><option value="">None</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {S('Lead status', 'lead_status', LEAD)}{S('Customer status', 'customer_status', CUST)}{T('Last contact date', 'last_contact_date', 'date')}{T('Next follow-up date', 'next_follow_up_date', 'date')}
      </div>
      <label className="block text-sm"><span className="text-slate-600">Notes and communication history (add dated entries)</span>
        <textarea className={cls} rows={6} value={c.notes ?? ''} onChange={e => edit({ notes: e.target.value })} /></label>
      <button className="text-sm text-slate-500 hover:text-red-600" onClick={archive}>Archive this contact</button>
    </section>
  )
}
