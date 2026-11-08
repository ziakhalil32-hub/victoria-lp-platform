'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
const CATS = ['paid_advertising','content_production','design','printing','events','software','other']
export default function NewExpense({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter(); const sb = createClient()
  const [open, setOpen] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ expense_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }), product_id: '', category: 'paid_advertising', amount: '', platform: '', description: '' })
  const c = 'border rounded-lg p-2 bg-white text-sm w-full'
  async function save() {
    if (!(Number(f.amount) >= 0) || f.amount === '') { setErr('Enter the amount.'); return }
    setBusy(true); setErr('')
    const { data, error } = await sb.from('expenses').insert({ ...f, amount: Number(f.amount), product_id: f.product_id || null, platform: f.platform || null, description: f.description || null, approval_status: 'requires_approval' }).select('id').single()
    setBusy(false)
    if (error || !data) { setErr('Could not save: ' + (error?.message ?? 'unknown')); return }
    router.push('/expenses/' + data.id)
  }
  async function propose() {
    if (!confirm('Add the proposed $50 test budget ($30 Facebook/Instagram test + $20 reserve) for each product? These are PROPOSALS only. Nothing is approved or spent.')) return
    const { data: existing } = await sb.from('expenses').select('product_id').eq('approval_status', 'proposed').like('description', 'Proposed test budget%').is('deleted_at', null)
    const have = new Set((existing ?? []).map((e: any) => e.product_id))
    const rows = products.filter(p => !have.has(p.id)).flatMap(p => [
      { product_id: p.id, category: 'paid_advertising', amount: 30, platform: 'Facebook/Instagram', description: 'Proposed test budget: Facebook/Instagram test', approval_status: 'proposed' },
      { product_id: p.id, category: 'paid_advertising', amount: 20, platform: 'Facebook/Instagram', description: 'Proposed test budget reserve: best-performing follow-up creative or audience', approval_status: 'proposed' }])
    if (rows.length === 0) { alert('Proposed budgets already exist for every product.'); return }
    const { error } = await sb.from('expenses').insert(rows)
    if (error) { alert('Could not add: ' + error.message); return }
    router.refresh()
  }
  if (!open) return <div className="flex gap-2 flex-wrap"><button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm" onClick={() => setOpen(true)}>+ Add expense</button><button className="border bg-white rounded-lg px-4 py-2 text-sm" onClick={propose}>Add proposed $50 test budgets</button></div>
  return (
    <div className="bg-white border rounded-2xl p-4 space-y-2 w-full">
      <b className="text-sm">New expense (starts as “Requires approval”)</b>
      <div className="grid gap-2 md:grid-cols-3">
        <input type="date" className={c} value={f.expense_date} onChange={e => setF({ ...f, expense_date: e.target.value })} />
        <select className={c} value={f.product_id} onChange={e => setF({ ...f, product_id: e.target.value })}><option value="">No product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className={c} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS.map(x => <option key={x} value={x}>{x.replace(/_/g, ' ')}</option>)}</select>
        <input className={c} type="number" step="0.01" min="0" placeholder="Amount $" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
        <input className={c} placeholder="Platform (Facebook, Canva…)" value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })} />
        <input className={c} placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-3"><button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" onClick={save}>{busy ? 'Saving…' : 'Create expense'}</button><button className="text-sm text-slate-500" onClick={() => setOpen(false)}>Cancel</button></div>
    </div>
  )
}
