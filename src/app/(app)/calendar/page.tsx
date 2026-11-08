import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AddCalendarTask from '@/components/AddCalendarTask'
export const dynamic = 'force-dynamic'

type Item = { date: string; kind: string; label: string; href: string; tone: string; product_id: string | null }
const TZ = 'America/Chicago'
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const chicagoDate = (s: string) => new Date(s).toLocaleDateString('en-CA', { timeZone: TZ })
const KINDS = [['content', 'Content'], ['task', 'Tasks'], ['milestone', 'Milestones'], ['launch', 'Launches & deadlines']]
const tone = { content: 'bg-blue-100 text-blue-800', task: 'bg-slate-100 text-slate-700', overdue: 'bg-red-100 text-red-700', milestone: 'bg-amber-100 text-amber-800', review: 'bg-orange-200 text-orange-900', launch: 'bg-green-100 text-green-800' }

export default async function Calendar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
  const ym = /^\d{4}-\d{2}$/.test(f.m ?? '') ? f.m! : today.slice(0, 7)
  const [y, m] = ym.split('-').map(Number)
  const gridStart = Date.UTC(y, m - 1, 1 - new Date(Date.UTC(y, m - 1, 1)).getUTCDay())
  const gridEnd = gridStart + 41 * 86400000
  const from = iso(gridStart), to = iso(gridEnd)
  const sb = await createClient()
  const [content, tasks, ms, products] = await Promise.all([
    sb.from('content').select('id,title,platform,scheduled_for,status,product_id').is('deleted_at', null).neq('status', 'archived').gte('scheduled_for', from + 'T00:00:00-08:00').lte('scheduled_for', to + 'T23:59:59-04:00'),
    sb.from('tasks').select('id,title,status,due_date,product_id').is('deleted_at', null).gte('due_date', from).lte('due_date', to),
    sb.from('v_milestones').select('id,title,start_date,end_date,display_status,product_id').lte('start_date', to).gte('end_date', from),
    sb.from('products').select('id,name,launch_date,presale_deadline').is('deleted_at', null),
  ])
  const pname = Object.fromEntries((products.data ?? []).map((p: any) => [p.id, p.name]))
  const items: Item[] = []; const days: Record<string, Item[]> = {}
  const put = (it: Item) => { if (f.product && it.product_id !== f.product) return; if (f.type && f.type !== it.kind) return; (days[it.date] ??= []).push(it); items.push(it) }
  ;(content.data ?? []).forEach((c: any) => c.scheduled_for && put({ date: chicagoDate(c.scheduled_for), kind: 'content', label: `${c.platform ?? 'Post'}: ${c.title}`, href: `/content/${c.id}`, tone: tone.content, product_id: c.product_id }))
  ;(tasks.data ?? []).forEach((t: any) => put({ date: t.due_date, kind: 'task', label: t.title + (t.status === 'done' ? ' ✓' : ''), href: '/today', tone: t.status !== 'done' && t.due_date < today ? tone.overdue : tone.task, product_id: t.product_id }))
  ;(products.data ?? []).forEach((p: any) => {
    if (p.launch_date) put({ date: p.launch_date, kind: 'launch', label: `Launch: ${p.name}`, href: `/products/${p.id}`, tone: tone.launch, product_id: p.id })
    if (p.presale_deadline) put({ date: p.presale_deadline, kind: 'launch', label: `Presale ends: ${p.name}`, href: `/products/${p.id}`, tone: tone.launch, product_id: p.id })
  })
  ;(ms.data ?? []).forEach((s: any) => {
    const t = s.display_status === 'requires_review' ? tone.review : tone.milestone
    const label = `${s.title}${s.display_status === 'requires_review' ? ' (review)' : ''}`
    if (f.list) { put({ date: s.start_date < from ? from : s.start_date, kind: 'milestone', label: `${label} · ${s.start_date} to ${s.end_date}`, href: `/products/${s.product_id}`, tone: t, product_id: s.product_id }); return }
    for (let d = Date.parse(s.start_date); d <= Date.parse(s.end_date); d += 86400000) { const k = iso(d); if (k >= from && k <= to) put({ date: k, kind: 'milestone', label, href: `/products/${s.product_id}`, tone: t, product_id: s.product_id }) }
  })
  const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7) }
  const qs = (o: Record<string, string | undefined>) => '?' + Object.entries({ product: f.product, type: f.type, list: f.list, m: ym, ...o }).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
  const monthName = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  const listItems = items.filter(i => i.date.slice(0, 7) === ym || f.list).sort((a, b) => a.date.localeCompare(b.date)).filter(i => i.date.slice(0, 7) === ym)

  return (
    <div className="space-y-5">
      <header><h1 className="text-2xl font-semibold">Marketing Calendar</h1><p className="text-slate-500">Everything scheduled in one place. Items that passed without being confirmed show as “review,” never as done.</p></header>
      <AddCalendarTask products={(products.data ?? []).map((p: any) => ({ id: p.id, name: p.name }))} defaultDate={today} />
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Link href={qs({ m: shift(-1) })} className="border rounded-lg px-3 py-1 bg-white">←</Link>
          <b className="w-40 text-center">{monthName}</b>
          <Link href={qs({ m: shift(1) })} className="border rounded-lg px-3 py-1 bg-white">→</Link>
          <Link href={qs({ m: today.slice(0, 7) })} className="text-sm text-blue-600">Today</Link>
        </div>
        <form className="flex flex-wrap gap-2">
          <input type="hidden" name="m" value={ym} />{f.list && <input type="hidden" name="list" value="1" />}
          <select name="product" defaultValue={f.product ?? ''} className={sel}><option value="">All products</option>{(products.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select name="type" defaultValue={f.type ?? ''} className={sel}><option value="">All types</option>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button>
          <Link href={qs({ list: f.list ? undefined : '1' })} className="border rounded-lg px-3 py-2 bg-white text-sm">{f.list ? 'Month view' : 'List view'}</Link>
        </form>
      </div>
      {(content.error || tasks.error || ms.error) && <p className="text-sm text-red-600">Could not load part of the calendar.</p>}
      {f.list ? (
        <ul className="space-y-2">{listItems.length === 0 && <p className="text-sm text-slate-500">Nothing scheduled this month.</p>}
          {listItems.map((i, n) => <li key={n} className="bg-white border rounded-xl p-3 flex gap-3 text-sm"><span className="w-24 text-slate-500">{i.date}</span><Link href={i.href} className="flex-1">{i.label}</Link><span className="text-slate-500">{i.product_id ? pname[i.product_id] : ''}</span></li>)}</ul>
      ) : (
        <div className="overflow-x-auto"><div className="min-w-[44rem] grid grid-cols-7 gap-px bg-slate-200 border rounded-xl overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="bg-slate-100 p-2 text-xs font-medium text-slate-500">{d}</div>)}
          {Array.from({ length: 42 }, (_, i) => { const k = iso(gridStart + i * 86400000); const list = days[k] ?? []; const inMonth = k.slice(0, 7) === ym
            return <div key={k} className={`min-h-24 p-1 space-y-1 ${inMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'} ${k === today ? 'ring-2 ring-inset ring-blue-500' : ''}`}>
              <div className="text-xs">{Number(k.slice(8))}</div>
              {list.slice(0, 4).map((it, n) => <Link key={n} href={it.href} title={it.label} className={`block truncate rounded px-1 text-[11px] ${it.tone}`}>{it.label}</Link>)}
              {list.length > 4 && <div className="text-[11px] text-slate-500">+{list.length - 4} more (use List view)</div>}</div> })}
        </div></div>)}
      <p className="text-xs text-slate-500">Blue: content · Gray: tasks · Red: overdue · Amber: campaign milestones · Orange: milestone needing review · Green: launches and deadlines. To reschedule, open the item and change its date.</p>
    </div>
  )
}
