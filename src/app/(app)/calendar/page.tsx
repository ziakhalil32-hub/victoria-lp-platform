import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AddCalendarTask from '@/components/AddCalendarTask'
import CalendarItemActions, { type ItemAct } from '@/components/CalendarItemActions'
import { addDays } from '@/lib/dates'
export const dynamic = 'force-dynamic'

type Item = { date: string; kind: string; label: string; href: string; tone: string; product_id: string | null; sort: number; time?: string; act?: ItemAct }
const TZ = 'America/Chicago'
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const chicagoDate = (s: string) => new Date(s).toLocaleDateString('en-CA', { timeZone: TZ })
const KINDS = [['content', 'Content'], ['task', 'Tasks'], ['milestone', 'Milestones'], ['launch', 'Launches & deadlines'], ['event', 'Events']]
const tone = { content: 'bg-blue-100 text-blue-800', task: 'bg-slate-100 text-slate-700', overdue: 'bg-red-100 text-red-700', milestone: 'bg-amber-100 text-amber-800', review: 'bg-orange-200 text-orange-900', launch: 'bg-green-100 text-green-800' }
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { ...o, timeZone: 'UTC' })
const isDate = (s?: string) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '')

export default async function Calendar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
  const view: 'list' | 'week' | 'day' | 'month' = f.list ? 'list' : f.v === 'week' ? 'week' : f.v === 'day' ? 'day' : 'month'
  const d = isDate(f.d) ? f.d! : today
  const ym = view === 'week' || view === 'day' ? d.slice(0, 7) : /^\d{4}-\d{2}$/.test(f.m ?? '') ? f.m! : today.slice(0, 7)
  const [y, m] = ym.split('-').map(Number)
  const gridStart = Date.UTC(y, m - 1, 1 - new Date(Date.UTC(y, m - 1, 1)).getUTCDay())
  const gridEnd = gridStart + 41 * 86400000
  const from = iso(gridStart), to = iso(gridEnd)
  const sb = await createClient()
  const [content, tasks, ms, products, events] = await Promise.all([
    sb.from('content').select('id,title,platform,scheduled_for,status,product_id,version').is('deleted_at', null).neq('status', 'archived').gte('scheduled_for', from + 'T00:00:00-08:00').lte('scheduled_for', to + 'T23:59:59-04:00'),
    sb.from('tasks').select('id,title,status,due_date,product_id,version,recurrence,notes,priority').is('deleted_at', null).gte('due_date', from).lte('due_date', to),
    sb.from('v_milestones').select('id,title,start_date,end_date,display_status,product_id').lte('start_date', to).gte('end_date', from),
    sb.from('products').select('id,name,launch_date,presale_deadline').is('deleted_at', null),
    sb.from('events').select('id,name,event_date,status,product_id').is('deleted_at', null).neq('status', 'cancelled').gte('event_date', from).lte('event_date', to),
  ])
  const pname = Object.fromEntries((products.data ?? []).map((p: any) => [p.id, p.name]))
  const items: Item[] = []; const days: Record<string, Item[]> = {}
  const put = (it: Item) => { if (f.product && it.product_id !== f.product) return; if (f.type && f.type !== it.kind) return; (days[it.date] ??= []).push(it); items.push(it) }
  ;(content.data ?? []).forEach((c: any) => c.scheduled_for && put({ date: chicagoDate(c.scheduled_for), kind: 'content', sort: 0, label: `${c.platform ?? 'Post'}: ${c.title}${c.status === 'published' ? ' ✓' : ''}`, href: `/content/${c.id}`, tone: tone.content, product_id: c.product_id,
    time: new Date(c.scheduled_for).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }),
    act: { table: 'content', id: c.id, version: c.version, status: c.status, date: chicagoDate(c.scheduled_for), scheduledFor: c.scheduled_for, title: c.title } }))
  ;(tasks.data ?? []).forEach((t: any) => put({ date: t.due_date, kind: 'task', sort: 1, label: t.title + (t.status === 'done' ? ' ✓' : ''), href: '/today', tone: t.status !== 'done' && t.due_date < today ? tone.overdue : tone.task, product_id: t.product_id,
    act: { table: 'tasks', id: t.id, version: t.version, status: t.status, date: t.due_date, recurrence: t.recurrence, notes: t.notes, priority: t.priority, title: t.title } }))
  ;(events.data ?? []).forEach((e: any) => put({ date: e.event_date, kind: 'event', sort: 2, label: `Event: ${e.name}`, href: `/events/${e.id}`, tone: 'bg-purple-100 text-purple-800', product_id: e.product_id }))
  ;(products.data ?? []).forEach((p: any) => {
    if (p.launch_date) put({ date: p.launch_date, kind: 'launch', sort: 3, label: `Launch: ${p.name}`, href: `/products/${p.id}`, tone: tone.launch, product_id: p.id })
    if (p.presale_deadline) put({ date: p.presale_deadline, kind: 'launch', sort: 3, label: `Presale ends: ${p.name}`, href: `/products/${p.id}`, tone: tone.launch, product_id: p.id })
  })
  ;(ms.data ?? []).forEach((s: any) => {
    const t = s.display_status === 'requires_review' ? tone.review : tone.milestone
    const label = `${s.title}${s.display_status === 'requires_review' ? ' (review)' : ''}`
    if (view === 'list') { put({ date: s.start_date < from ? from : s.start_date, kind: 'milestone', sort: 4, label: `${label} · ${s.start_date} to ${s.end_date}`, href: `/products/${s.product_id}`, tone: t, product_id: s.product_id }); return }
    for (let dd = Date.parse(s.start_date); dd <= Date.parse(s.end_date); dd += 86400000) { const k = iso(dd); if (k >= from && k <= to) put({ date: k, kind: 'milestone', sort: 4, label, href: `/products/${s.product_id}`, tone: t, product_id: s.product_id }) }
  })
  const dayItems = (k: string) => (days[k] ?? []).slice().sort((a, b) => a.sort - b.sort)

  const base = { product: f.product, type: f.type }
  const href = (o: Record<string, string | undefined>) => '?' + Object.entries({ ...base, ...o }).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join('&')
  const shift = (n: number) => new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
  const anchor = view === 'week' || view === 'day' ? d : ym === today.slice(0, 7) ? today : ym + '-01'
  const wkStart = addDays(d, -new Date(d + 'T12:00:00Z').getUTCDay()); const wkDays = Array.from({ length: 7 }, (_, i) => addDays(wkStart, i))
  const nav = view === 'week' ? { prev: href({ v: 'week', d: addDays(d, -7) }), next: href({ v: 'week', d: addDays(d, 7) }), now: href({ v: 'week', d: today }), title: `${fmt(wkStart, { month: 'short', day: 'numeric' })} – ${fmt(wkDays[6], { month: 'short', day: 'numeric', year: 'numeric' })}` }
    : view === 'day' ? { prev: href({ v: 'day', d: addDays(d, -1) }), next: href({ v: 'day', d: addDays(d, 1) }), now: href({ v: 'day', d: today }), title: fmt(d, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) }
    : { prev: href({ m: shift(-1), list: view === 'list' ? '1' : undefined }), next: href({ m: shift(1), list: view === 'list' ? '1' : undefined }), now: href({ m: today.slice(0, 7), list: view === 'list' ? '1' : undefined }), title: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }
  const tabs: [string, string, string][] = [['month', 'Month', href({ m: anchor.slice(0, 7) })], ['week', 'Week', href({ v: 'week', d: anchor })], ['day', 'Day', href({ v: 'day', d: anchor })], ['list', 'List', href({ list: '1', m: anchor.slice(0, 7) })]]
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  const listItems = items.filter(i => i.date.slice(0, 7) === ym).sort((a, b) => a.date.localeCompare(b.date) || a.sort - b.sort)

  const card = (it: Item, n: number, showTime: boolean) => (
    <div key={n} className={`rounded-lg px-2 py-1.5 text-xs ${it.tone}`}>
      <Link href={it.href} className="font-medium break-words">{showTime && it.time ? it.time + ' · ' : ''}{it.label}</Link>
      {it.product_id && <div className="opacity-70">{pname[it.product_id]}</div>}
      {it.act && <CalendarItemActions {...it.act} />}
    </div>)

  return (
    <div className="space-y-5">
      <header><h1 className="text-2xl font-semibold">Marketing Calendar</h1><p className="text-slate-500">Everything scheduled in one place. Items that passed without being confirmed show as “review,” never as done.</p></header>
      <AddCalendarTask products={(products.data ?? []).map((p: any) => ({ id: p.id, name: p.name }))} defaultDate={view === 'day' ? d : today} />
      <div className="flex gap-2">{tabs.map(([v, l, h]) => <Link key={v} href={h} className={`rounded-lg px-3 py-1.5 text-sm border ${view === v ? 'bg-slate-900 text-white' : 'bg-white'}`}>{l}</Link>)}</div>
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Link href={nav.prev} className="border rounded-lg px-3 py-1 bg-white">←</Link>
          <b className="min-w-40 text-center">{nav.title}</b>
          <Link href={nav.next} className="border rounded-lg px-3 py-1 bg-white">→</Link>
          <Link href={nav.now} className="text-sm text-blue-600">Today</Link>
        </div>
        <form className="flex flex-wrap gap-2">
          {view === 'month' && <input type="hidden" name="m" value={ym} />}{view === 'list' && <><input type="hidden" name="m" value={ym} /><input type="hidden" name="list" value="1" /></>}{(view === 'week' || view === 'day') && <><input type="hidden" name="v" value={view} /><input type="hidden" name="d" value={d} /></>}
          <select name="product" defaultValue={f.product ?? ''} className={sel}><option value="">All products</option>{(products.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select name="type" defaultValue={f.type ?? ''} className={sel}><option value="">All types</option>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button>
        </form>
      </div>
      {(content.error || tasks.error || ms.error) && <p className="text-sm text-red-600">Could not load part of the calendar.</p>}

      {view === 'list' && (
        <ul className="space-y-2">{listItems.length === 0 && <p className="text-sm text-slate-500">Nothing scheduled this month.</p>}
          {listItems.map((i, n) => <li key={n} className="bg-white border rounded-xl p-3 flex gap-3 text-sm"><span className="w-24 text-slate-500">{i.date}</span><Link href={i.href} className="flex-1">{i.label}</Link><span className="text-slate-500">{i.product_id ? pname[i.product_id] : ''}</span></li>)}</ul>)}

      {view === 'month' && (
        <div className="overflow-x-auto"><div className="min-w-[44rem] grid grid-cols-7 gap-px bg-slate-200 border rounded-xl overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => <div key={x} className="bg-slate-100 p-2 text-xs font-medium text-slate-500">{x}</div>)}
          {Array.from({ length: 42 }, (_, i) => { const k = iso(gridStart + i * 86400000); const list = dayItems(k); const inMonth = k.slice(0, 7) === ym
            return <div key={k} className={`min-h-24 p-1 space-y-1 ${inMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'} ${k === today ? 'ring-2 ring-inset ring-blue-500' : ''}`}>
              <Link href={href({ v: 'day', d: k })} className="text-xs hover:text-blue-600">{Number(k.slice(8))}</Link>
              {list.slice(0, 4).map((it, n) => <Link key={n} href={it.href} title={it.label} className={`block truncate rounded px-1 text-[11px] ${it.tone}`}>{it.label}</Link>)}
              {list.length > 4 && <Link href={href({ v: 'day', d: k })} className="text-[11px] text-slate-500 block">+{list.length - 4} more (open day)</Link>}</div> })}
        </div></div>)}

      {view === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">{wkDays.map(k => { const list = dayItems(k)
          return <div key={k} className={`bg-white border rounded-xl p-2 space-y-2 min-h-32 ${k === today ? 'ring-2 ring-blue-500' : ''}`}>
            <Link href={href({ v: 'day', d: k })} className="block text-xs font-medium text-slate-600 hover:text-blue-600">{fmt(k, { weekday: 'short', month: 'short', day: 'numeric' })}</Link>
            {list.length === 0 && <p className="text-xs text-slate-400">Nothing scheduled</p>}
            {list.map((it, n) => card(it, n, true))}</div> })}</div>)}

      {view === 'day' && (
        <div className="space-y-2 max-w-2xl">{dayItems(d).length === 0 && <p className="text-sm text-slate-500">Nothing scheduled for this day.</p>}
          {dayItems(d).map((it, n) => card(it, n, true))}</div>)}

      <p className="text-xs text-slate-500">Blue: content · Gray: tasks · Red: overdue · Amber: campaign milestones · Orange: milestone needing review · Green: launches and deadlines · Purple: events. In Week and Day view, tick a task to mark it done, or pick a new date and click Move for a task or an unpublished post. Drag-and-drop is not available. Launch dates and milestones are changed on their own pages.</p>
    </div>
  )
}
