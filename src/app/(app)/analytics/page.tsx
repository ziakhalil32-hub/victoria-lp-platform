import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AnalyticsCharts from '@/components/AnalyticsCharts'
import { chicagoDay } from '@/lib/dates'
export const dynamic = 'force-dynamic'
const NR = 'Not recorded'
const money = (n: number | null) => (n == null ? NR : '$' + n.toFixed(2))
const num = (n: number | null) => (n == null ? NR : String(n))
const pct = (a: number, b: number) => (b > 0 ? (100 * a / b).toFixed(1) + '%' : NR)
const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'Email', 'Website', 'Amazon', 'Walmart']
const sumOrNull = (rows: any[], keys: string[]) => { const v = rows.flatMap(r => keys.map(k => r[k])).filter(x => x != null); return v.length ? v.reduce((s: number, x: any) => s + Number(x), 0) : null }

export default async function Analytics({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const from = /^\d{4}-\d{2}-\d{2}$/.test(f.from ?? '') ? f.from! : ''
  const to = /^\d{4}-\d{2}-\d{2}$/.test(f.to ?? '') ? f.to! : ''
  const plat = PLATFORMS.includes(f.platform ?? '') ? f.platform! : ''
  const sb = await createClient()
  const [products, payments, orders, customers, subs, content, expenses, reviews, events, partners] = await Promise.all([
    sb.from('products').select('id,name').is('deleted_at', null).order('launch_date'),
    sb.from('payments').select('amount,kind,paid_at,orders(product_id,platform)').is('deleted_at', null),
    sb.from('orders').select('product_id,customer_id,platform,order_date,payment_status,total_amount').is('deleted_at', null),
    sb.from('customers').select('id,product_id,source,created_at,lead_status,customer_status').is('deleted_at', null),
    sb.from('subscribers').select('signup_date,signup_source,subscription_status,email_lists(product_id)').is('deleted_at', null),
    sb.from('content').select('product_id,platform,published_at,views,reach,likes,comments,shares,saves,link_clicks,leads_generated,orders_generated').is('deleted_at', null).eq('status', 'published'),
    sb.from('expenses').select('product_id,platform,expense_date,category,amount,approval_status,attributed_customers,attributed_revenue,link_clicks,conversions').is('deleted_at', null),
    sb.from('reviews').select('product_id,review_received,feedback_date').is('deleted_at', null),
    sb.from('events').select('product_id,event_date,registration_count').is('deleted_at', null).neq('status', 'cancelled'),
    sb.from('partnerships').select('status').is('deleted_at', null),
  ])
  const err = [products, payments, orders, customers, subs, content, expenses, reviews, events, partners].find(r => r.error)?.error
  const inR = (d: string | null) => !!d && (!from || d >= from) && (!to || d <= to)
  const inRn = (d: string | null) => (!from && !to) ? true : inR(d)
  const pm = (s: string | null) => !plat || (s ?? '').toLowerCase().includes(plat.toLowerCase())
  const P: any[] = products.data ?? []
  const allOrders: any[] = orders.data ?? []
  const orderCount: Record<string, number> = {}; allOrders.filter(o => o.customer_id && o.payment_status !== 'cancelled').forEach(o => { orderCount[o.customer_id] = (orderCount[o.customer_id] ?? 0) + 1 })

  function calc(pid: string | null) {
    const own = (x: any) => pid === null || x.product_id === pid
    const pay = (payments.data ?? []).filter((p: any) => inR(p.paid_at) && (pid === null || p.orders?.product_id === pid) && pm(p.orders?.platform))
    const revenue = pay.reduce((s: number, p: any) => s + (p.kind === 'refund' ? -1 : 1) * Number(p.amount), 0)
    const O = allOrders.filter(o => inR(o.order_date) && own(o) && pm(o.platform) && o.payment_status !== 'cancelled')
    const paid = O.filter(o => o.payment_status === 'paid')
    const Call = (customers.data ?? []).filter((c: any) => own(c) && pm(c.source))
    const buyers = Call.filter((c: any) => c.customer_status !== 'prospect')
    const S = (subs.data ?? []).filter((s: any) => (pid === null || s.email_lists?.product_id === pid) && pm(s.signup_source))
    const Cn = (content.data ?? []).filter((c: any) => own(c) && pm(c.platform) && inR(c.published_at ? chicagoDay(c.published_at) : null))
    const ads = (expenses.data ?? []).filter((e: any) => e.approval_status === 'approved' && e.category === 'paid_advertising' && own(e) && pm(e.platform) && inR(e.expense_date))
    const spend = ads.reduce((s: number, e: any) => s + Number(e.amount), 0)
    const cust = sumOrNull(ads, ['attributed_customers']), arev = sumOrNull(ads, ['attributed_revenue']), clk = sumOrNull(ads, ['link_clicks']), conv = sumOrNull(ads, ['conversions'])
    const allSpend = (expenses.data ?? []).filter((e: any) => e.approval_status === 'approved' && own(e) && pm(e.platform) && inR(e.expense_date)).reduce((s: number, e: any) => s + Number(e.amount), 0)
    return {
      revenue, orders: O.length, aov: paid.length ? paid.reduce((s: number, o: any) => s + Number(o.total_amount), 0) / paid.length : null, paidOrders: paid.length,
      customers: buyers.length, newCustomers: buyers.filter((c: any) => inR(chicagoDay(c.created_at))).length,
      repeat: Call.filter((c: any) => c.customer_status === 'repeat_customer' || (orderCount[c.id] ?? 0) >= 2).length,
      contacts: Call.length, qualified: Call.filter((c: any) => c.lead_status === 'qualified').length,
      subsActive: S.filter((s: any) => s.subscription_status === 'subscribed').length, subsNew: S.filter((s: any) => inR(s.signup_date)).length,
      published: Cn.length, clicks: sumOrNull(Cn, ['link_clicks']), reach: sumOrNull(Cn, ['reach']), engagement: sumOrNull(Cn, ['likes', 'comments', 'shares', 'saves']),
      views: sumOrNull(Cn, ['views']), leadsC: sumOrNull(Cn, ['leads_generated']), ordersC: sumOrNull(Cn, ['orders_generated']),
      spend, allSpend, cac: spend > 0 && cust ? spend / cust : null, roas: spend > 0 && arev ? arev / spend : null, adConv: clk && clk > 0 && conv != null ? 100 * conv / clk : null,
      reviews: (reviews.data ?? []).filter((r: any) => r.review_received && own(r) && inRn(r.feedback_date)).length,
      eventRegs: sumOrNull((events.data ?? []).filter((e: any) => own(e) && inRn(e.event_date)), ['registration_count']),
    }
  }
  const rows = P.filter(p => !f.product || p.id === f.product)
  const T = calc(f.product && rows.length ? f.product : null)
  const partnersWon = (partners.data ?? []).filter((p: any) => p.status === 'partnership_confirmed').length
  const kpis: [string, string, string, string][] = [
    ['Collected revenue', money(T.revenue), 'Recorded payments minus refunds, by payment date. Unpaid orders are excluded.', '/sales'],
    ['Orders', String(T.orders), 'Non-cancelled orders by order date (' + T.paidOrders + ' fully paid).', '/sales'],
    ['Average order value', money(T.aov), 'Average total of fully paid orders.', '/sales'],
    ['Total customers', String(T.customers), 'Contacts whose status is not “prospect” (all time).', '/customers'],
    ['New customers', String(T.newCustomers), 'Customers added in the date range.', '/customers'],
    ['Repeat customers', String(T.repeat), 'Contacts marked “repeat customer,” or with two or more non-cancelled orders (all time).', '/customers'],
    ['Qualified leads', String(T.qualified), 'Contacts with lead status “qualified.”', '/customers?lead=qualified'],
    ['Lead-to-customer conversion', pct(T.customers, T.contacts), 'Customers ÷ all contacts × 100.', '/customers'],
    ['Email subscribers', String(T.subsActive), 'Subscribed (all time). New in range: ' + T.subsNew + '.', '/email/subscribers'],
    ['Email signup conversion', NR, 'Needs signup-form visitor counts, which are not tracked here.', '/email'],
    ['Website visits', NR, 'Website analytics are not connected to this app. Enter figures by hand in your weekly report.', '/reports'],
    ['Purchase link clicks', num(T.clicks), 'Sum of link clicks you entered on published content.', '/content'],
    ['Social media reach', num(T.reach), 'Sum of reach you entered on published content.', '/content'],
    ['Content views', num(T.views), 'Sum of views you entered. Views are not clicks, leads, or orders.', '/content'],
    ['Content engagement', num(T.engagement), 'Likes + comments + shares + saves you entered.', '/content'],
    ['Leads from content', num(T.leadsC), 'Sum of “leads generated” you entered on content.', '/content'],
    ['Orders from content', num(T.ordersC), 'Sum of “orders generated” you entered on content. Not the same as recorded orders.', '/content'],
    ['Advertising spend', money(T.spend), 'Approved paid-advertising expenses only. Proposed budgets are excluded.', '/expenses'],
    ['Customer acquisition cost', money(T.cac), 'Approved ad spend ÷ attributed new customers.', '/expenses'],
    ['Return on ad spend', T.roas == null ? NR : T.roas.toFixed(2) + '×', 'Attributed revenue ÷ approved ad spend.', '/expenses'],
    ['Ad conversion rate', T.adConv == null ? NR : T.adConv.toFixed(1) + '%', 'Conversions ÷ link clicks × 100, from ad expenses.', '/expenses'],
    ['Reviews received', String(T.reviews), 'Review records marked received' + (from || to ? ', by feedback date.' : '.'), '/reviews'],
    ['Event registrations', num(T.eventRegs), 'Sum of registrations you entered on events in range.', '/events'],
    ['Partnership conversions', String(partnersWon), 'Partnerships you marked confirmed (all products, all time).', '/outreach'],
  ]
  const platCount: Record<string, number> = {}
  allOrders.filter(o => inR(o.order_date) && (!f.product || o.product_id === f.product) && pm(o.platform) && o.payment_status !== 'cancelled').forEach(o => { const k = (o.platform || 'Not set').trim(); platCount[k] = (platCount[k] ?? 0) + 1 })
  const budget = rows.map(p => { const ex = (expenses.data ?? []).filter((e: any) => e.product_id === p.id && pm(e.platform) && inR(e.expense_date)); const sm = (st: string[]) => ex.filter((e: any) => st.includes(e.approval_status)).reduce((s: number, e: any) => s + Number(e.amount), 0); return { name: p.name.replace('Understanding Your Business', 'Understanding Biz').replace('The Credit Blueprint', 'Credit Blueprint'), proposed: sm(['proposed']), approved: sm(['approved']) } })
  const rowData = rows.map(p => ({ p, c: calc(p.id) }))
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">Analytics & Performance</h1><p className="text-slate-500">Every figure comes from records you entered. Open the linked page to see the records behind it.</p></header>
      <form className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-slate-500">From<input type="date" name="from" defaultValue={from} className={sel + ' block'} /></label>
        <label className="text-xs text-slate-500">To<input type="date" name="to" defaultValue={to} className={sel + ' block'} /></label>
        <select name="product" defaultValue={f.product ?? ''} className={sel}><option value="">All products</option>{P.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="platform" defaultValue={plat} className={sel}><option value="">All platforms</option>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select>
        <button className="bg-slate-800 text-white rounded-lg px-3 py-2 text-sm">Apply</button><Link href="/analytics" className="text-sm text-blue-600 py-2">Clear</Link>
      </form>
      <p className="text-xs text-slate-500">Showing {from || to ? `${from || 'start'} to ${to || 'today'}` : 'all time'}{f.product ? ' · one product' : ''}{plat ? ` · platform: ${plat}` : ''}. The platform filter matches the platform or source text you entered on each record. Reviews, events, and partnerships are not split by platform.</p>
      {err && <p className="text-red-600 text-sm">Could not load: {err.message}</p>}
      <AnalyticsCharts revenue={rowData.map(({ p, c }) => ({ name: p.name.replace('Understanding Your Business', 'Understanding Biz').replace('The Credit Blueprint', 'Credit Blueprint'), value: c.revenue }))} budget={budget} platforms={Object.entries(platCount).map(([name, value]) => ({ name, value }))} />
      <section className="overflow-x-auto bg-white rounded-2xl border"><div className="p-3 font-semibold text-sm">Campaign comparison</div><table className="w-full text-sm">
        <thead className="text-left text-slate-500"><tr>{['Product', 'Revenue', 'Orders', 'Avg order', 'Customers', 'Qualified leads', 'New subscribers', 'Published', 'Ad spend', 'Cost / customer', 'ROAS', 'Reviews', 'Event regs'].map(h => <th key={h} className="p-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rowData.map(({ p, c }) => <tr key={p.id} className="border-t"><td className="p-3 whitespace-nowrap">{p.name}</td><td className="p-3">{money(c.revenue)}</td><td className="p-3">{c.orders}</td><td className="p-3">{money(c.aov)}</td><td className="p-3">{c.customers}</td><td className="p-3">{c.qualified}</td><td className="p-3">{c.subsNew}</td><td className="p-3">{c.published}</td><td className="p-3">{money(c.spend)}</td><td className="p-3">{money(c.cac)}</td><td className="p-3">{c.roas == null ? NR : c.roas.toFixed(2) + '×'}</td><td className="p-3">{c.reviews}</td><td className="p-3">{num(c.eventRegs)}</td></tr>)}</tbody></table></section>
      <section className="overflow-x-auto bg-white rounded-2xl border"><div className="p-3 font-semibold text-sm">All key numbers and where they come from</div><table className="w-full text-sm">
        <thead className="text-left text-slate-500"><tr>{['Metric', 'Value', 'How it is calculated', 'Records'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{kpis.map(([l, v, how, href]) => <tr key={l} className="border-t"><td className="p-3 whitespace-nowrap">{l}</td><td className={`p-3 font-medium ${v === NR ? 'text-slate-400' : ''}`}>{v}</td><td className="p-3 text-slate-600">{how}</td><td className="p-3"><Link href={href} className="text-blue-600">View</Link></td></tr>)}</tbody></table></section>
    </div>
  )
}
