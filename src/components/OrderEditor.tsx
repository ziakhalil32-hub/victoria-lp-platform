'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const PAY = ['pending','paid','partially_paid','refunded','cancelled']
const FUL = ['not_started','processing','delivered','access_provided','completed','issue_reported']
const cls = 'w-full border rounded-lg p-2 bg-white'
const nice = (s: string) => s.replace(/_/g, ' ')
export default function OrderEditor({ order, customers, products, payments }: { order: Row; customers: Row[]; products: Row[]; payments: Row[] }) {
  const a = useAutosave(); const [o, setO] = useState<Row>(order); const [ps, setPs] = useState<Row[]>(payments)
  const [np, setNp] = useState({ amount: '', kind: 'payment', paid_at: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }), reference: '' })
  a.register('orders', o.id, order.version)
  const edit = (patch: Row, imm = false) => { setO(x => ({ ...x, ...patch })); a.save('orders', o.id, patch, imm) }
  const total = Math.max(0, (Number(o.quantity) || 0) * (Number(o.unit_price) || 0) - (Number(o.discount) || 0))
  const net = (list: Row[]) => list.reduce((s, p) => s + (p.kind === 'refund' ? -1 : 1) * Number(p.amount), 0)

  function syncStatus(list: Row[]) {
    if (o.payment_status === 'cancelled') return
    const paid = list.filter(p => p.kind === 'payment').reduce((s, p) => s + Number(p.amount), 0), refunded = list.filter(p => p.kind === 'refund').reduce((s, p) => s + Number(p.amount), 0)
    const n = paid - refunded
    const status = paid > 0 && refunded >= paid ? 'refunded' : total > 0 && n >= total ? 'paid' : n > 0 ? 'partially_paid' : 'pending'
    if (status !== o.payment_status) edit({ payment_status: status }, true)
  }
  async function addPayment() {
    const amt = Number(np.amount); if (!(amt > 0)) { a.setStatus('failed'); a.setMsg('Enter an amount greater than zero.'); return }
    a.setStatus('saving')
    const { data, error } = await a.sb.from('payments').insert({ order_id: o.id, amount: amt, kind: np.kind, paid_at: np.paid_at, reference: np.reference || null }).select().single()
    if (error || !data) { a.setStatus('failed'); a.setMsg('Could not record payment: ' + (error?.message ?? 'unknown')); return }
    const list = [...ps, data]; setPs(list); setNp({ ...np, amount: '', reference: '' }); a.setStatus('saved'); syncStatus(list)
  }
  async function removePayment(p: Row) {
    if (!confirm('Remove this payment record? It is archived, not permanently erased.')) return
    const { error } = await a.sb.from('payments').update({ deleted_at: new Date().toISOString() }).eq('id', p.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    const list = ps.filter(x => x.id !== p.id); setPs(list); syncStatus(list)
  }
  const T = (label: string, k: string, type = 'text', imm = false) => (
    <label className="block text-sm"><span className="text-slate-600">{label}</span>
      <input type={type} step={type === 'number' ? '0.01' : undefined} className={cls} value={o[k] ?? ''} onChange={e => edit({ [k]: type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : (e.target.value === '' ? null : e.target.value) }, imm || type === 'date')} /></label>)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start"><div><h1 className="text-2xl font-semibold">Order {o.order_number}</h1><p className="text-sm text-slate-500">Changes save automatically.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <section className="bg-white rounded-2xl border p-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm"><span className="text-slate-600">Customer</span>
          <select className={cls} value={o.customer_id ?? ''} onChange={e => edit({ customer_id: e.target.value || null }, true)}><option value="">None</option>{customers.map(c => <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(' ')} {c.email ?? ''}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Product</span>
          <select className={cls} value={o.product_id} onChange={e => edit({ product_id: e.target.value }, true)}>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {T('Quantity', 'quantity', 'number')}{T('Unit price ($)', 'unit_price', 'number')}{T('Discount ($)', 'discount', 'number')}
        <div className="text-sm"><span className="text-slate-600">Order total</span><div className="p-2 text-lg font-semibold">${total.toFixed(2)}</div></div>
        {T('Order date', 'order_date', 'date')}{T('Purchase platform', 'platform')}{T('Payment method', 'payment_method')}{T('Transaction reference', 'transaction_ref')}
        <label className="block text-sm"><span className="text-slate-600">Payment status</span>
          <select className={cls} value={o.payment_status} onChange={e => edit({ payment_status: e.target.value }, true)}>{PAY.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Fulfillment status</span>
          <select className={cls} value={o.fulfillment_status} onChange={e => edit({ fulfillment_status: e.target.value }, true)}>{FUL.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Notes</span><textarea className={cls} rows={2} value={o.notes ?? ''} onChange={e => edit({ notes: e.target.value })} /></label>
      </section>
      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Payments <span className="text-sm font-normal text-slate-500">· Collected so far: ${net(ps).toFixed(2)} of ${total.toFixed(2)}</span></h2>
        <p className="text-xs text-slate-500">Only recorded payments count as revenue. Add a payment when money is actually received, and a refund if money is returned.</p>
        {ps.map(p => <div key={p.id} className="flex justify-between text-sm border rounded-lg p-2"><span>{p.paid_at} · {p.kind} {p.reference ? '· ' + p.reference : ''}</span><span>{p.kind === 'refund' ? '-' : ''}${Number(p.amount).toFixed(2)} <button className="text-slate-400 hover:text-red-600 ml-2" onClick={() => removePayment(p)}>Remove</button></span></div>)}
        <div className="grid gap-2 md:grid-cols-5">
          <input className={cls} type="number" step="0.01" min="0" placeholder="Amount $" value={np.amount} onChange={e => setNp({ ...np, amount: e.target.value })} />
          <select className={cls} value={np.kind} onChange={e => setNp({ ...np, kind: e.target.value })}><option value="payment">Payment</option><option value="refund">Refund</option></select>
          <input className={cls} type="date" value={np.paid_at} onChange={e => setNp({ ...np, paid_at: e.target.value })} />
          <input className={cls} placeholder="Reference" value={np.reference} onChange={e => setNp({ ...np, reference: e.target.value })} />
          <button className="bg-blue-600 text-white rounded-lg px-3" onClick={addPayment}>Record</button>
        </div>
      </section>
    </div>
  )
}
