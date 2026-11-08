import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewContent from '@/components/NewContent'
export const dynamic = 'force-dynamic'
const nice = (s: string | null) => (s ? s.replace(/_/g, ' ') : '')
const STATUSES = ['idea','planned','drafting','ready_for_review','pending_approval','approved','scheduled','published','needs_revision','archived']
const PLATFORMS = ['TikTok','Instagram','Facebook','Email','Website','Other']
const dash = (n: number | null) => (n == null ? '–' : n)

export default async function ContentList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  let q = sb.from('content').select('id,title,platform,status,purpose,scheduled_for,views,link_clicks,leads_generated,orders_generated,revenue_generated,products(name)').is('deleted_at', null).order('scheduled_for', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
  if (f.product) q = q.eq('product_id', f.product)
  if (f.platform) q = q.eq('platform', f.platform)
  if (f.status) q = q.eq('status', f.status)
  if (f.q) q = q.ilike('title', `%${f.q}%`)
  const [{ data, error }, products, all] = await Promise.all([
    q, sb.from('products').select('id,name').is('deleted_at', null),
    sb.from('content').select('purpose').is('deleted_at', null).neq('status', 'archived').not('purpose', 'is', null),
  ])
  const count = (p: string) => (all.data ?? []).filter((r: any) => r.purpose === p).length
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Content Studio</h1><p className="text-slate-500">Plan, write, and track every post, video, and email.</p></div>
        <NewContent />
      </header>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={f.q} placeholder="Search titles" className={sel} />
        <select name="product" defaultValue={f.product ?? ''} className={sel}><option value="">All products</option>{(products.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="platform" defaultValue={f.platform ?? ''} className={sel}><option value="">All platforms</option>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select>
        <select name="status" defaultValue={f.status ?? ''} className={sel}><option value="">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button>
      </form>
      <p className="text-xs text-slate-500">Mix guideline (every 5 posts: 3 educate/entertain, 1 trust, 1 promote). Your tagged content so far: {count('educate_entertain')} educate/entertain · {count('trust')} trust · {count('promote')} promote. This is guidance only.</p>
      {error && <p className="text-red-600 text-sm">Could not load: {error.message}</p>}
      {(data ?? []).length === 0 ? <p className="text-sm text-slate-500">No content yet. Click “+ New content” to start your first idea.</p> : (
        <div className="overflow-x-auto bg-white rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500"><tr>{['Title','Product','Platform','Status','Scheduled','Views','Clicks','Leads','Orders','Revenue'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="p-3"><Link href={`/content/${c.id}`} className="text-blue-600">{c.title}</Link></td>
                <td className="p-3">{c.products?.name ?? '–'}</td><td className="p-3">{c.platform ?? '–'}</td>
                <td className="p-3">{nice(c.status)}</td><td className="p-3">{c.scheduled_for ? c.scheduled_for.slice(0, 10) : '–'}</td>
                <td className="p-3">{dash(c.views)}</td><td className="p-3">{dash(c.link_clicks)}</td><td className="p-3">{dash(c.leads_generated)}</td>
                <td className="p-3">{dash(c.orders_generated)}</td><td className="p-3">{c.revenue_generated == null ? '–' : '$' + Number(c.revenue_generated).toFixed(2)}</td>
              </tr>))}</tbody>
          </table>
          <p className="text-xs text-slate-500 p-3">A dash means “Not recorded.” Views, clicks, leads, and orders are tracked separately.</p>
        </div>)}
    </div>
  )
}
