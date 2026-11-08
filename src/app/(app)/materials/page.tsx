import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MaterialsLibrary, { FOLDERS } from '@/components/MaterialsLibrary'
export const dynamic = 'force-dynamic'
export default async function Materials({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  const products = await sb.from('products').select('id,name,slug').is('deleted_at', null).order('launch_date')
  const P = (products.data ?? []) as { id: string; name: string; slug: string | null }[]
  const pid = P.find(p => p.id === f.product)?.id ?? P[0]?.id ?? ''
  let q = sb.from('marketing_assets').select('*').eq('product_id', pid).is('deleted_at', null).order('created_at', { ascending: false })
  if (f.folder) q = q.eq('folder', f.folder)
  if (f.q) q = q.or(`name.ilike.%${f.q}%,description.ilike.%${f.q}%`)
  const [{ data, error }, counts] = await Promise.all([q, sb.from('marketing_assets').select('product_id').is('deleted_at', null)])
  const slug = P.find(p => p.id === pid)?.slug ?? ''
  const folders = [...(FOLDERS[slug] ?? []), 'Other']
  const n = (id: string) => (counts.data ?? []).filter((x: any) => x.product_id === id).length
  return (
    <div className="space-y-5">
      <header><h1 className="text-2xl font-semibold">Marketing Materials</h1><p className="text-slate-500">One separate folder per product. Covers, flyers, photos, videos, and documents.</p></header>
      {(products.error || error) && <p className="text-red-600 text-sm">Could not load: {(products.error ?? error)?.message}</p>}
      <div className="flex flex-wrap gap-2">{P.map(p => <Link key={p.id} href={`/materials?product=${p.id}`} className={`rounded-lg px-3 py-2 text-sm border ${p.id === pid ? 'bg-slate-900 text-white' : 'bg-white'}`}>{p.name} ({n(p.id)})</Link>)}</div>
      <form className="flex flex-wrap gap-2"><input type="hidden" name="product" value={pid} />
        <input name="q" defaultValue={f.q} placeholder="Search files" className="border rounded-lg p-2 bg-white text-sm" />
        <select name="folder" defaultValue={f.folder ?? ''} className="border rounded-lg p-2 bg-white text-sm"><option value="">All folders</option>{folders.map(x => <option key={x}>{x}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button></form>
      {pid && <MaterialsLibrary key={pid} products={P} assets={(data ?? []) as any} productId={pid} folder={f.folder ?? ''} />}
    </div>
  )
}
