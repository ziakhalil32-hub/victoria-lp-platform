import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardCharts from '@/components/DashboardCharts'
export const dynamic = 'force-dynamic'
const money = (n: number) => '$' + n.toFixed(2)
const short = (s: string) => s.replace('Understanding Your Business', 'Understanding Biz').replace('The Credit Blueprint', 'Credit Blueprint')
const label: Record<string, string> = { tasks: 'task', content: 'content', customers: 'customer', orders: 'order', payments: 'payment', products: 'product', product_links: 'purchase link', campaign_milestones: 'milestone', expenses: 'expense', course_chapters: 'chapter', content_platform_versions: 'platform caption' }
const nameOf = (r: any) => { const d = r.new_data ?? r.old_data ?? {}; return d.title || d.name || d.order_number || [d.first_name, d.last_name].filter(Boolean).join(' ') || d.platform || d.amount || '' }

export default async function Dashboard() {
  const sb = await createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const in7 = new Date(Date.parse(today) + 7 * 86400000).toISOString().slice(0, 10)
  const in30 = new Date(Date.parse(today) + 30 * 86400000).toISOString().slice(0, 10)
  const [products, rev, payments, customers, expenses, content, tasks, ms, upcoming, logs] = await Promise.all([
    sb.from('products').select('id,name,launch_date,presale_deadline,presale_price,regular_price,marketing_status').is('deleted_at', null).order('launch_date'),
    sb.from('v_revenue_by_product').select('*'),
    sb.from('payments').select('amount,kind,paid_at').is('deleted_at', null),
    sb.from('customers').select('id,lead_status,customer_status,next_follow_up_date,first_name,last_name').is('deleted_at', null),
    sb.from('expenses').select('amount,approval_status').is('deleted_at', null),
    sb.from('content').select('product_id,status').is('deleted_at', null),
    sb.from('tasks').select('id,title,status,due_date,product_id').is('deleted_at', null).neq('status', 'done'),
    sb.from('v_milestones').select('product_id,status'),
    sb.from('content').select('id,title,platform,scheduled_for').is('deleted_at', null).in('status', ['approved', 'scheduled']).gte('scheduled_for', today + 'T00:00:00-06:00').lte('scheduled_for', in7 + 'T23:59:59-06:00').order('scheduled_for'),
    sb.from('activity_logs').select('table_name,action,at,record_id,new_data,old_data').order('at', { ascending: false }).limit(80),
  ])
  const errors = [products, rev, payments, customers, expenses, content, tasks, ms, logs].map(r => r.error).filter(Boolean)
  const P = products.data ?? []; const R: any[] = rev.data ?? []
  const totalRev = R.reduce((s, r) => s + Number(r.collected_revenue), 0)
  const totalOrders = R.reduce((s, r) => s + Number(r.orders), 0)
  const C = customers.data ?? []
  const buyers = C.filter((c: any) => c.customer_status !== 'prospect').length
  const qualified = C.filter((c: any) => c.lead_status === 'qualified').length
  const spend = (expenses.data ?? []).filter((e: any) => e.approval_status === 'approved').reduce((s: number, e: any) => s + Number(e.amount), 0)
  const byMonth: Record<string, number> = {}
  ;(payments.data ?? []).forEach((p: any) => { const k = p.paid_at.slice(0, 7); byMonth[k] = (byMonth[k] ?? 0) + (p.kind === 'refund' ? -1 : 1) * Number(p.amount) })
  const msAll = ms.data ?? []
  const progress = (id: string) => { const m = msAll.filter((x: any) => x.product_id === id); return m.length ? Math.round(100 * m.filter((x: any) => x.status === 'completed').length / m.length) : 0 }
  const allMs = msAll.length ? Math.round(100 * msAll.filter((x: any) => x.status === 'completed').length / msAll.length) : 0
  const days = (d: string) => Math.ceil((Date.parse(d + 'T12:00:00') - Date.parse(today + 'T12:00:00')) / 86400000)
  const dueTasks = (tasks.data ?? []).filter((t: any) => t.due_date && t.due_date <= today)
  const followUps = C.filter((c: any) => c.next_follow_up_date && c.next_follow_up_date <= today)
  const deadlines = P.flatMap((p: any) => [p.launch_date && { d: p.launch_date, t: 'Launch: ' + p.name }, p.presale_deadline && { d: p.presale_deadline, t: 'Presale ends: ' + p.name }]).filter(Boolean).filter((x: any) => x.d >= today && x.d <= in30).sort((a: any, b: any) => a.d.localeCompare(b.d))
  const seen = new Set<string>(); const recent = (logs.data ?? []).filter((l: any) => { const k = l.table_name + l.record_id; if (seen.has(k) || !label[l.table_name]) return false; seen.add(k); return true }).slice(0, 12)
  const kpi = (t: string, v: string, note?: string) => <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">{t}</div><div className="text-2xl font-semibold">{v}</div>{note && <div className="text-xs text-slate-500">{note}</div>}</div>

  return (
    <div className="space-y-8">
      <header><h1 className="text-2xl font-semibold">Overview</h1><p className="text-slate-500">Every number here is calculated from records you entered.</p></header>
      {errors.length > 0 && <p className="text-sm text-red-600">Some data could not be loaded: {(errors[0] as any).message}</p>}
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {kpi('Collected revenue', money(totalRev), 'Recorded payments minus refunds')}{kpi('Orders', String(totalOrders))}
        {kpi('Customers', String(buyers), `${C.length} total contacts`)}{kpi('Qualified leads', String(qualified))}
        {kpi('Marketing expenses', spend > 0 ? money(spend) : 'Not recorded', 'Approved expenses only')}{kpi('Email subscribers', 'Not tracked yet', 'Email module comes later')}
        {kpi('Customer acquisition cost', 'Not recorded', 'Needs approved ad spend and attributed customers')}{kpi('Campaign progress', allMs + '%', 'Milestones you confirmed done')}
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        {P.map((p: any) => { const r = R.find(x => x.product_id === p.id); const pub = (content.data ?? []).filter((c: any) => c.product_id === p.id && c.status === 'published').length; const left = (tasks.data ?? []).filter((t: any) => t.product_id === p.id).length
          return <Link key={p.id} href={`/products/${p.id}`} className="bg-white border rounded-2xl p-4 hover:border-blue-400 block space-y-1">
            <b>{p.name}</b><div className="text-3xl font-semibold">{p.launch_date ? Math.max(days(p.launch_date), 0) : '–'}<span className="text-sm font-normal text-slate-500"> days to launch</span></div>
            <div className="text-xs text-slate-500">{p.marketing_status.replace(/_/g, ' ')} · launch {p.launch_date ?? 'not set'}{p.presale_deadline ? ` · presale ends ${p.presale_deadline}` : ''}</div>
            <div className="text-sm">Price: {p.presale_price != null && p.presale_deadline && p.presale_deadline >= today ? `${money(Number(p.presale_price))} presale` : p.regular_price != null ? money(Number(p.regular_price)) : 'Not set'}</div>
            <div className="text-sm">{r?.orders ?? 0} orders · {money(Number(r?.collected_revenue ?? 0))} · {pub} published · {left} tasks open</div>
            <div className="text-xs text-slate-500">Email signups: not tracked yet · Campaign {progress(p.id)}% done</div></Link> })}
      </section>
      <DashboardCharts revenueByProduct={R.map(r => ({ name: short(r.name), value: Number(r.collected_revenue) }))} ordersByProduct={R.map(r => ({ name: short(r.name), value: Number(r.orders) }))}
        revenueByMonth={Object.keys(byMonth).sort().map(k => ({ name: k, value: byMonth[k] }))} progress={P.map((p: any) => ({ name: short(p.name), value: progress(p.id) }))} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Today’s priorities</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-white border rounded-2xl p-4 text-sm space-y-1"><b>Tasks due or overdue ({dueTasks.length})</b>{dueTasks.length === 0 && <p className="text-slate-500">None.</p>}
            {dueTasks.slice(0, 6).map((t: any) => <div key={t.id} className={t.due_date < today ? 'text-red-600' : ''}>{t.title}{t.due_date < today ? ' (overdue)' : ''}</div>)}{dueTasks.length > 6 && <Link href="/today" className="text-blue-600">See all on Today</Link>}</div>
          <div className="bg-white border rounded-2xl p-4 text-sm space-y-1"><b>Customer follow-ups ({followUps.length})</b>{followUps.length === 0 && <p className="text-slate-500">None.</p>}
            {followUps.slice(0, 6).map((c: any) => <Link key={c.id} href={`/customers/${c.id}`} className="block text-blue-600">{[c.first_name, c.last_name].filter(Boolean).join(' ')} · {c.next_follow_up_date}</Link>)}</div>
          <div className="bg-white border rounded-2xl p-4 text-sm space-y-1"><b>Upcoming posts, next 7 days ({(upcoming.data ?? []).length})</b>{(upcoming.data ?? []).length === 0 && <p className="text-slate-500">None approved or scheduled.</p>}
            {(upcoming.data ?? []).map((c: any) => <Link key={c.id} href={`/content/${c.id}`} className="block text-blue-600">{c.scheduled_for.slice(0, 10)} · {c.platform ?? ''} {c.title}</Link>)}</div>
          <div className="bg-white border rounded-2xl p-4 text-sm space-y-1"><b>Deadlines, next 30 days</b>{deadlines.length === 0 && <p className="text-slate-500">None.</p>}
            {deadlines.map((x: any, i: number) => <div key={i}>{x.d} · {x.t}</div>)}</div>
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {recent.length === 0 && <p className="text-sm text-slate-500">Nothing yet.</p>}
        <ul className="bg-white border rounded-2xl divide-y text-sm">{recent.map((l: any, i: number) => {
          const archived = l.action === 'UPDATE' && l.new_data?.deleted_at; const verb = archived ? 'Archived' : l.action === 'INSERT' ? 'Created' : l.action === 'DELETE' ? 'Deleted' : 'Updated'
          return <li key={i} className="p-3 flex justify-between gap-3"><span>{verb} {label[l.table_name]} <b>{nameOf(l)}</b></span><span className="text-slate-500 whitespace-nowrap">{new Date(l.at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></li> })}</ul>
      </section>
    </div>
  )
}
