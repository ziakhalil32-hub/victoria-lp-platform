'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
type Opt = Record<string, any>
export default function NewOrder({ customers, products, presetCustomer }: { customers: Opt[]; products: Opt[]; presetCustomer?: string }) {
  const router = useRouter()
  const key = useRef(crypto.randomUUID()).current // prevents accidental duplicate orders if you click twice
  const [open, setOpen] = useState(!!presetCustomer)
  const [f, setF] = useState({ customer_id: presetCustomer ?? '', product_id: '', quantity: '1', unit_price: '', platform: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const c = 'border rounded-lg p-2 bg-white text-sm w-full'
  async function save() {
    if (!f.product_id) { setErr('Choose a product.'); return }
    if (f.unit_price === '' || Number(f.unit_price) < 0) { setErr('Enter the unit price actually charged.'); return }
    setBusy(true); setErr('')
    const d = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }).replace(/-/g, '')
    const { data, error } = await createClient().from('orders').insert({
      order_number: `VLP-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, idempotency_key: key,
      customer_id: f.customer_id || null, product_id: f.product_id, quantity: Number(f.quantity) || 1, unit_price: Number(f.unit_price), platform: f.platform || null,
    }).select('id').single()
    setBusy(false)
    if (error || !data) { setErr(error?.code === '23505' ? 'This order was already saved. Check the list below.' : 'Could not save: ' + (error?.message ?? 'unknown')); return }
    router.push('/sales/' + data.id)
  }
  if (!open) return <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm whitespace-nowrap" onClick={() => setOpen(true)}>+ Record order</button>
  return (
    <div className="bg-white border rounded-2xl p-4 space-y-2 w-full">
      <b className="text-sm">New order (starts as Pending until you record a payment)</b>
      <div className="grid gap-2 md:grid-cols-5">
        <select className={c} value={f.customer_id} onChange={e => setF({ ...f, customer_id: e.target.value })}><option value="">No customer</option>{customers.map(x => <option key={x.id} value={x.id}>{[x.first_name, x.last_name].filter(Boolean).join(' ')} {x.email ?? ''}</option>)}</select>
        <select className={c} value={f.product_id} onChange={e => { const p = products.find(x => x.id === e.target.value); setF({ ...f, product_id: e.target.value, unit_price: p?.regular_price != null ? String(p.regular_price) : f.unit_price }) }}><option value="">Product…</option>{products.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <input className={c} type="number" min="1" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} placeholder="Qty" />
        <input className={c} type="number" step="0.01" min="0" value={f.unit_price} onChange={e => setF({ ...f, unit_price: e.target.value })} placeholder="Unit price $" />
        <input className={c} value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })} placeholder="Platform (Amazon, website…)" />
      </div>
      <p className="text-xs text-slate-500">The price is prefilled from the regular price. Change it if the customer paid the presale or another price.</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-3"><button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" onClick={save}>{busy ? 'Saving…' : 'Create order'}</button><button className="text-sm text-slate-500" onClick={() => setOpen(false)}>Cancel</button></div>
    </div>
  )
}
