'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function NewReview({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter(); const [pid, setPid] = useState(products[0]?.id ?? ''); const [busy, setBusy] = useState(false)
  async function go() {
    if (!pid) return; setBusy(true)
    const { data, error } = await createClient().from('reviews').insert({ product_id: pid }).select('id').single()
    if (error || !data) { setBusy(false); alert('Could not create: ' + (error?.message ?? 'unknown')); return }
    router.push('/reviews/' + data.id)
  }
  return <div className="flex gap-2"><select className="border rounded-lg p-2 bg-white text-sm" value={pid} onChange={e => setPid(e.target.value)}>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" onClick={go}>+ Add review record</button></div>
}
