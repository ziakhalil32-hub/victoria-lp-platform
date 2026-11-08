'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function AddCalendarTask({ products, defaultDate }: { products: { id: string; name: string }[]; defaultDate: string }) {
  const router = useRouter()
  const [title, setTitle] = useState(''); const [date, setDate] = useState(defaultDate); const [product, setProduct] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function add() {
    if (!title.trim() || !date) { setErr('Enter a task title and a date.'); return }
    setBusy(true); setErr('')
    const { error } = await createClient().from('tasks').insert({ title: title.trim(), due_date: date, product_id: product || null })
    setBusy(false)
    if (error) { setErr('Could not save: ' + error.message); return }
    setTitle(''); router.refresh()
  }
  const c = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <input className={c + ' flex-1 min-w-[10rem]'} placeholder="Add a dated task" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <input type="date" className={c} value={date} onChange={e => setDate(e.target.value)} />
        <select className={c} value={product} onChange={e => setProduct(e.target.value)}><option value="">No product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 text-sm disabled:opacity-50" onClick={add}>{busy ? 'Saving…' : 'Add'}</button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  )
}
