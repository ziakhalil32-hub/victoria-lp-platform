import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
// Remove characters that have special meaning in search filters.
const clean = (raw?: string) => (raw ?? '').replace(/[,()%_\\*"'`;]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
type Hit = { href: string; label: string; sub?: string }
type Group = { title: string; hits: Hit[]; error?: string }

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const q = clean(f.q)
  if (q.length < 2) return (
    <div className="space-y-3"><h1 className="text-2xl font-semibold">Search</h1><p className="text-slate-500">Type at least 2 letters in the search box on the left.</p></div>)
  const sb = await createClient()
  const like = (cols: string[]) => cols.map(c => `${c}.ilike.%${q}%`).join(',')
  const run = async (title: string, table: string, select: string, cols: string[], map: (r: any) => Hit): Promise<Group> => {
    const { data, error } = await sb.from(table).select(select).is('deleted_at', null).or(like(cols)).limit(8)
    return { title, hits: ((data ?? []) as any[]).map(map), error: error?.message }
  }
  const name = (r: any) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'Unnamed'
  const groups = await Promise.all([
    run('Products', 'products', 'id,name,marketing_status', ['name', 'description', 'notes'], r => ({ href: `/products/${r.id}`, label: r.name, sub: String(r.marketing_status).replace(/_/g, ' ') })),
    run('Campaigns', 'campaigns', 'id,name,product_id,theme', ['name', 'theme'], r => ({ href: `/products/${r.product_id}`, label: r.name, sub: r.theme ?? '' })),
    run('Customers & leads', 'customers', 'id,first_name,last_name,email,organization', ['first_name', 'last_name', 'email', 'organization', 'phone', 'notes'], r => ({ href: `/customers/${r.id}`, label: name(r), sub: [r.email, r.organization].filter(Boolean).join(' · ') })),
    run('Content', 'content', 'id,title,platform,status', ['title', 'topic', 'hook', 'script', 'caption'], r => ({ href: `/content/${r.id}`, label: r.title, sub: [r.platform, String(r.status).replace(/_/g, ' ')].filter(Boolean).join(' · ') })),
    run('Tasks', 'tasks', 'id,title,due_date,status', ['title', 'notes'], r => ({ href: '/today', label: r.title, sub: [r.status, r.due_date ? 'due ' + r.due_date : ''].filter(Boolean).join(' · ') })),
    run('Events', 'events', 'id,name,event_date', ['name', 'description', 'location'], r => ({ href: `/events/${r.id}`, label: r.name, sub: r.event_date ?? 'Date not set' })),
    run('Marketing files', 'marketing_assets', 'id,name,folder,product_id', ['name', 'description'], r => ({ href: `/materials?product=${r.product_id}&q=${encodeURIComponent(r.name)}`, label: r.name, sub: r.folder })),
    run('Partnerships & outreach', 'partnerships', 'id,organization,contact_person,status', ['organization', 'contact_person', 'email', 'notes'], r => ({ href: `/outreach/${r.id}`, label: r.organization, sub: [r.contact_person, String(r.status).replace(/_/g, ' ')].filter(Boolean).join(' · ') })),
    run('Orders', 'orders', 'id,order_number,order_date', ['order_number', 'transaction_ref', 'notes'], r => ({ href: `/sales/${r.id}`, label: r.order_number, sub: r.order_date })),
    run('Email subscribers', 'subscribers', 'id,first_name,last_name,email', ['email', 'first_name', 'last_name'], r => ({ href: `/email/subscribers/${r.id}`, label: name(r), sub: r.email })),
  ])
  const total = groups.reduce((s, g) => s + g.hits.length, 0)
  const errors = groups.filter(g => g.error)
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">Search results</h1><p className="text-slate-500">“{q}” · {total} match{total === 1 ? '' : 'es'} (up to 8 shown per area)</p></header>
      {errors.length > 0 && <p className="text-sm text-red-600">Some areas could not be searched: {errors.map(e => e.title).join(', ')}. {errors[0].error}</p>}
      {total === 0 && errors.length === 0 && <p className="text-sm text-slate-500">Nothing found. Try a different word or part of a name.</p>}
      {groups.filter(g => g.hits.length > 0).map(g => (
        <section key={g.title} className="space-y-2"><h2 className="font-semibold text-sm text-slate-600">{g.title} ({g.hits.length})</h2>
          <ul className="bg-white border rounded-2xl divide-y text-sm">{g.hits.map((h, i) => <li key={i}><Link href={h.href} className="flex justify-between gap-3 p-3 hover:bg-slate-50"><span className="text-blue-600">{h.label}</span><span className="text-slate-500 text-right">{h.sub}</span></Link></li>)}</ul></section>))}
    </div>
  )
}
