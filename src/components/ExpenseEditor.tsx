'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
import Attachments from '@/components/Attachments'
type Row = Record<string, any>
const CATS = ['paid_advertising','content_production','design','printing','events','software','other']
const cls = 'w-full border rounded-lg p-2 bg-white'
const nice = (s: string) => s.replace(/_/g, ' ')
export default function ExpenseEditor({ expense, products, attachments }: { expense: Row; products: Row[]; attachments: Row[] }) {
  const a = useAutosave(); const [e, setE] = useState<Row>(expense)
  a.register('expenses', e.id, expense.version)
  const edit = (patch: Row, imm = false) => { setE(x => ({ ...x, ...patch })); a.save('expenses', e.id, patch, imm) }
  const N = (label: string, k: string, step = '1') => (
    <label className="block text-sm"><span className="text-slate-600">{label}</span>
      <input type="number" min="0" step={step} className={cls} value={e[k] ?? ''} onChange={ev => edit({ [k]: ev.target.value === '' ? null : Number(ev.target.value) })} /></label>)
  async function setApproval(v: string) {
    if (v === 'approved') {
      if (!confirm(`Approve spending $${Number(e.amount).toFixed(2)} on this expense?`)) return
      const { error } = await a.sb.from('approvals').insert({ entity_table: 'expenses', entity_id: e.id, action: 'approve_expense', decision: 'approved' })
      if (error) { a.setStatus('failed'); a.setMsg('Could not record approval: ' + error.message); return }
    }
    edit({ approval_status: v }, true)
  }
  async function archive() {
    if (!confirm('Archive this expense? It is hidden, not permanently erased.')) return
    const { error } = await a.sb.from('expenses').update({ deleted_at: new Date().toISOString() }).eq('id', e.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    window.location.href = '/expenses'
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start"><div><h1 className="text-2xl font-semibold">Expense: ${Number(e.amount ?? 0).toFixed(2)}</h1><p className="text-sm text-slate-500">Changes save automatically.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <section className="bg-white rounded-2xl border p-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm"><span className="text-slate-600">Date</span><input type="date" className={cls} value={e.expense_date ?? ''} onChange={ev => edit({ expense_date: ev.target.value }, true)} /></label>
        <label className="block text-sm"><span className="text-slate-600">Product</span><select className={cls} value={e.product_id ?? ''} onChange={ev => edit({ product_id: ev.target.value || null }, true)}><option value="">None</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Category</span><select className={cls} value={e.category} onChange={ev => edit({ category: ev.target.value }, true)}>{CATS.map(c => <option key={c} value={c}>{nice(c)}</option>)}</select></label>
        {N('Amount ($)', 'amount', '0.01')}
        <label className="block text-sm"><span className="text-slate-600">Platform</span><input className={cls} value={e.platform ?? ''} onChange={ev => edit({ platform: ev.target.value })} /></label>
        <label className="block text-sm"><span className="text-slate-600">Payment method</span><input className={cls} value={e.payment_method ?? ''} onChange={ev => edit({ payment_method: ev.target.value })} /></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Description</span><textarea className={cls} rows={2} value={e.description ?? ''} onChange={ev => edit({ description: ev.target.value })} /></label>
        <label className="block text-sm"><span className="text-slate-600">Approval status</span><select className={cls} value={e.approval_status} onChange={ev => setApproval(ev.target.value)}>{['proposed','requires_approval','approved','rejected'].map(s => <option key={s} value={s}>{nice(s)}</option>)}</select></label>
        <div className="text-sm text-slate-500 self-end">Attach receipts in the Receipts section below.</div>
      </section>
      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Ad results (for paid advertising)</h2><p className="text-xs text-slate-500">Only enter numbers from your ad platform or sales records. Leave blank if not recorded.</p>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">{N('Attributed new customers', 'attributed_customers')}{N('Attributed revenue ($)', 'attributed_revenue', '0.01')}{N('Link clicks', 'link_clicks')}{N('Conversions', 'conversions')}</div>
      </section>
      <Attachments table="expenses" id={e.id} initial={attachments as any} title="Receipts" hint="Photos or PDFs of receipts and invoices for this expense." />
      <button className="text-sm text-slate-500 hover:text-red-600" onClick={archive}>Archive this expense</button>
    </div>
  )
}
