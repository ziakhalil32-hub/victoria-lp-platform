import type { SupabaseClient } from '@supabase/supabase-js'
export const SECTIONS: [string, string][] = [
  ['content', '1. Content Published'], ['audience', '2. Audience Growth'], ['website', '3. Website Performance'],
  ['sales', '4. Sales Performance'], ['amazon', '5. Amazon Performance'], ['expenses', '6. Marketing Expenses'],
  ['best', '7. Best-Performing Content'], ['problems', '8. Problems'], ['next', "9. Next Week's Priorities"],
]
const money = (n: number) => '$' + n.toFixed(2)
const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10)
function offset(d: string) { const m = new Date(d + 'T12:00:00Z').toLocaleString('en-US', { timeZone: 'America/Chicago', timeZoneName: 'longOffset' }).match(/GMT([+-]\d\d:\d\d)/); return m?.[1] ?? '-06:00' }
const start = (d: string) => `${d}T00:00:00${offset(d)}`
const end = (d: string) => `${d}T23:59:59${offset(d)}`
const PR: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

export async function generateSections(sb: SupabaseClient, ws: string): Promise<Record<string, string>> {
  const we = addDays(ws, 6), nextEnd = addDays(we, 7), today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const [pub, subs, newCust, pays, ords, exps, best, overdue, ms, links, revise, nextTasks, products] = await Promise.all([
    sb.from('content').select('title,platform,products(name)').is('deleted_at', null).eq('status', 'published').gte('published_at', start(ws)).lte('published_at', end(we)),
    sb.from('subscribers').select('list_id,consent_status,email_lists(name)').is('deleted_at', null).gte('signup_date', ws).lte('signup_date', we),
    sb.from('customers').select('id').is('deleted_at', null).gte('created_at', start(ws)).lte('created_at', end(we)),
    sb.from('payments').select('amount,kind,orders(products(name))').is('deleted_at', null).gte('paid_at', ws).lte('paid_at', we),
    sb.from('orders').select('platform,payment_status').is('deleted_at', null).gte('order_date', ws).lte('order_date', we),
    sb.from('expenses').select('amount,approval_status').is('deleted_at', null).gte('expense_date', ws).lte('expense_date', we),
    sb.from('content').select('title,platform,views,link_clicks,leads_generated,orders_generated').is('deleted_at', null).eq('status', 'published').lte('published_at', end(we)),
    sb.from('tasks').select('title,due_date').is('deleted_at', null).neq('status', 'done').lt('due_date', we).order('due_date').limit(50),
    sb.from('v_milestones').select('title,display_status').eq('display_status', 'requires_review'),
    sb.from('product_links').select('platform,url,verification_status,products(name)').is('deleted_at', null).neq('verification_status', 'verified'),
    sb.from('content').select('id').is('deleted_at', null).eq('status', 'needs_revision'),
    sb.from('tasks').select('title,due_date,priority').is('deleted_at', null).neq('status', 'done').lte('due_date', nextEnd),
    sb.from('products').select('name,launch_date,presale_deadline').is('deleted_at', null),
  ])
  const firstErr = [pub, subs, newCust, pays, ords, exps, best, overdue, ms, links, revise, nextTasks, products].find(r => r.error)
  if (firstErr?.error) throw new Error(firstErr.error.message)
  const list = (a: string[]) => a.map(x => '• ' + x).join('\n')
  const out: Record<string, string> = {}

  const P: any[] = pub.data ?? []
  out.content = P.length ? `${P.length} item(s) recorded as published:\n` + list(P.map(c => `${c.title}${c.platform ? ' (' + c.platform + ')' : ''}${c.products?.name ? ' - ' + c.products.name : ''}`)) : 'No content recorded as published this week.'

  const S: any[] = subs.data ?? []; const by: Record<string, number> = {}; S.forEach(s => { const n = s.email_lists?.name ?? 'Unknown'; by[n] = (by[n] ?? 0) + 1 })
  out.audience = `Email subscribers added: ${S.length} (${S.filter(s => s.consent_status === 'consented').length} with confirmed consent).` + (S.length ? '\n' + list(Object.entries(by).map(([k, v]) => `${k}: ${v}`)) : '') + `\nNew customers/leads added: ${(newCust.data ?? []).length}.\nSocial media follower growth: Not recorded (not tracked in this app).`
  out.website = 'Not recorded. Website visits and purchase-link clicks are not connected to this app. Add numbers here by hand if you have them.'

  const PY: any[] = pays.data ?? []; const net = PY.reduce((s, p) => s + (p.kind === 'refund' ? -1 : 1) * Number(p.amount), 0)
  const perP: Record<string, number> = {}; PY.forEach(p => { const n = p.orders?.products?.name ?? 'Unknown'; perP[n] = (perP[n] ?? 0) + (p.kind === 'refund' ? -1 : 1) * Number(p.amount) })
  const O: any[] = ords.data ?? []
  out.sales = `Collected revenue (recorded payments minus refunds): ${money(net)}.\nOrders created: ${O.length} (${O.filter(o => ['pending', 'partially_paid'].includes(o.payment_status)).length} not fully paid yet).` + (PY.length ? '\n' + list(Object.entries(perP).map(([k, v]) => `${k}: ${money(v)}`)) : '')
  const az = O.filter(o => /amazon/i.test(o.platform ?? ''))
  out.amazon = `Orders recorded with platform Amazon: ${az.length}.\nSales rank, ratings, and reviews: Not recorded (the reviews module is not built yet). Enter them here by hand from your Amazon dashboard.`

  const E: any[] = exps.data ?? []; const appr = E.filter(e => e.approval_status === 'approved').reduce((s, e) => s + Number(e.amount), 0)
  const pend = E.filter(e => ['proposed', 'requires_approval'].includes(e.approval_status))
  out.expenses = E.length ? `Approved spending: ${money(appr)}.\n${pend.length} expense(s) dated this week still need your approval (${money(pend.reduce((s, e) => s + Number(e.amount), 0))}, not counted as spent).` : 'No expenses recorded this week.'

  const B: any[] = (best.data ?? []).filter(c => c.views != null || c.link_clicks != null || c.leads_generated != null || c.orders_generated != null)
    .sort((a, b) => (b.orders_generated ?? 0) - (a.orders_generated ?? 0) || (b.leads_generated ?? 0) - (a.leads_generated ?? 0) || (b.link_clicks ?? 0) - (a.link_clicks ?? 0) || (b.views ?? 0) - (a.views ?? 0)).slice(0, 3)
  const v = (n: number | null) => (n == null ? 'not recorded' : n)
  out.best = B.length ? 'Ranked by orders, then leads, then clicks, then views (published content with recorded results):\n' + list(B.map(c => `${c.title}${c.platform ? ' (' + c.platform + ')' : ''}: orders ${v(c.orders_generated)}, leads ${v(c.leads_generated)}, clicks ${v(c.link_clicks)}, views ${v(c.views)}`)) : 'No results recorded yet for published content.'

  const OD: any[] = overdue.data ?? []; const probs: string[] = []
  if (OD.length) probs.push(`${OD.length} overdue task(s), including: ${OD.slice(0, 5).map(t => t.title).join('; ')}`)
  const MS: any[] = ms.data ?? []; if (MS.length) probs.push(`${MS.length} campaign milestone(s) past their dates without confirmation (requires review).`)
  const LK: any[] = links.data ?? []; if (LK.length) probs.push(`${LK.length} purchase link(s) are not verified yet.`)
  const RV: any[] = revise.data ?? []; if (RV.length) probs.push(`${RV.length} content item(s) marked Needs Revision.`)
  out.problems = probs.length ? list(probs) + '\nAdd anything else that needs Victoria’s attention.' : 'No problems detected from records. Add anything else that needs Victoria’s attention.'

  const NT: any[] = (nextTasks.data ?? []).sort((a, b) => (PR[a.priority] ?? 2) - (PR[b.priority] ?? 2) || (a.due_date ?? '').localeCompare(b.due_date ?? '')).slice(0, 5)
  const soon: string[] = []; ;(products.data ?? []).forEach((p: any) => { if (p.launch_date && p.launch_date > we && p.launch_date <= addDays(we, 21)) soon.push(`Launch: ${p.name} on ${p.launch_date}`); if (p.presale_deadline && p.presale_deadline > we && p.presale_deadline <= addDays(we, 21)) soon.push(`Presale ends: ${p.name} on ${p.presale_deadline}`) })
  out.next = (NT.length ? 'Top 5 open tasks by priority:\n' + list(NT.map((t, i) => `${t.title} (${t.priority}, due ${t.due_date ?? 'no date'})`)) : 'No open tasks are due next week.') + (soon.length ? '\nComing up within 3 weeks:\n' + list(soon) : '')
  void today
  return out
}
