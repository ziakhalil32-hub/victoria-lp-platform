import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewProduct from '@/components/NewProduct'
export const dynamic = 'force-dynamic'
const money = (n: number | null) => (n == null ? 'Not set' : '$' + Number(n).toFixed(2))

export default async function Products() {
  const sb = await createClient()
  const { data, error } = await sb.from('products')
    .select('id,name,launch_date,presale_price,regular_price,marketing_status,archived,brands(name),product_links(verification_status,deleted_at)')
    .is('deleted_at', null).order('launch_date')
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Projects & Products</h1><p className="text-slate-500">Prices, dates, status, and purchase links for each product.</p></div>
        <NewProduct />
      </header>
      {error && <p className="text-red-600 text-sm">Could not load: {error.message}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {(data ?? []).map((p: any) => {
          const links = (p.product_links ?? []).filter((l: any) => !l.deleted_at)
          const ok = links.filter((l: any) => l.verification_status === 'verified').length
          return (
            <Link key={p.id} href={`/products/${p.id}`} className="bg-white rounded-2xl border p-4 hover:border-blue-400 block">
              <div className="flex justify-between"><b>{p.name}</b>{p.archived && <span className="text-xs text-slate-500">Archived</span>}</div>
              <div className="text-xs text-slate-500">{p.brands?.name ?? 'No brand'} · {p.marketing_status.replace(/_/g, ' ')}</div>
              <div className="text-sm mt-2">Launch: {p.launch_date ?? 'Not set'}</div>
              <div className="text-sm">Presale {money(p.presale_price)} · Regular {money(p.regular_price)}</div>
              <div className={`text-sm mt-1 ${ok ? 'text-green-700' : 'text-amber-600'}`}>{ok} of {links.length} purchase links verified</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
