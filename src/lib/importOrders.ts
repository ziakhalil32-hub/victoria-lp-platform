import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchRows, money, norm, parseDate, today, type Prepared, type Template } from './importHelpers'
const FULFIL = ['not_started', 'processing', 'delivered', 'access_provided', 'completed', 'issue_reported']
export const ORDER_TEMPLATE: Template = {
  header: ['order_number', 'order_date', 'customer_email', 'product', 'quantity', 'unit_price', 'discount', 'platform', 'payment_method', 'payment_status', 'amount_paid', 'paid_date', 'fulfillment_status', 'transaction_ref', 'notes'],
  example: ['', '2026-11-26', 'jane@example.com', 'Turn the Page', '1', '10.00', '0', 'Amazon', '', 'paid', '', '2026-11-26', 'delivered', '', ''],
}
const pick = (r: Record<string, string>, ...k: string[]) => { for (const x of k) if ((r[x] ?? '').trim()) return r[x].trim(); return '' }

export async function prepareOrders(rows: Record<string, string>[], sb: SupabaseClient): Promise<Prepared> {
  const [prods, custs, orders] = await Promise.all([fetchRows(sb, 'products', 'id,name,slug'), fetchRows(sb, 'customers', 'id,email'), fetchRows(sb, 'orders', 'order_number,transaction_ref')])
  const prodMap = new Map<string, string>(); prods.forEach(p => { prodMap.set(String(p.name).toLowerCase(), p.id); if (p.slug) prodMap.set(String(p.slug).toLowerCase(), p.id) })
  const custMap = new Map<string, string>(); custs.forEach(c => { if (c.email) custMap.set(String(c.email).toLowerCase(), c.id) })
  const nums = new Set<string>(orders.map(o => o.order_number)); const txs = new Set<string>(orders.filter(o => o.transaction_ref).map(o => String(o.transaction_ref).toLowerCase()))
  const valid: any[] = []; const skipped: { row: number; reason: string }[] = []; const notes: string[] = []
  let noCust = 0, payRows = 0, payTotal = 0
  const day = today().replace(/-/g, '')
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], line = i + 2
    const pid = prodMap.get(pick(r, 'product', 'product_name').toLowerCase())
    if (!pid) { skipped.push({ row: line, reason: `product “${pick(r, 'product', 'product_name')}” not found` }); continue }
    const qtyRaw = pick(r, 'quantity', 'qty'); const qty = qtyRaw === '' ? 1 : Number(qtyRaw)
    if (!Number.isInteger(qty) || qty <= 0) { skipped.push({ row: line, reason: 'quantity must be a whole number above 0' }); continue }
    const unit = money(pick(r, 'unit_price', 'price'))
    if (unit == null || Number.isNaN(unit) || unit < 0) { skipped.push({ row: line, reason: 'missing or invalid unit_price' }); continue }
    const disc = money(r.discount) ?? 0
    if (Number.isNaN(disc) || disc < 0) { skipped.push({ row: line, reason: 'invalid discount' }); continue }
    const total = qty * unit - disc
    if (total < 0) { skipped.push({ row: line, reason: 'discount is larger than the order amount' }); continue }
    const dRaw = pick(r, 'order_date', 'date'); const od = dRaw ? parseDate(dRaw) : today()
    if (!od) { skipped.push({ row: line, reason: `invalid order_date “${dRaw}” (use YYYY-MM-DD or M/D/YYYY)` }); continue }
    const ps = norm(r.payment_status) || 'pending'
    if (ps === 'refunded') { skipped.push({ row: line, reason: 'refunded orders must be entered in the app (needs payment and refund amounts)' }); continue }
    if (!['pending', 'paid', 'partially_paid', 'cancelled'].includes(ps)) { skipped.push({ row: line, reason: `unknown payment_status “${r.payment_status}”` }); continue }
    const num = pick(r, 'order_number', 'order_no', 'order')
    const orderNumber = num || `VLP-${day}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    if (nums.has(orderNumber)) { skipped.push({ row: line, reason: `order number ${orderNumber} already exists or is repeated` }); continue }
    const tx = pick(r, 'transaction_ref', 'transaction').toLowerCase()
    if (tx && txs.has(tx)) { skipped.push({ row: line, reason: `transaction reference ${tx} already exists or is repeated` }); continue }
    let pay: { amount: number; paid_at: string } | null = null
    const paidAt = parseDate(r.paid_date) ?? od
    if (ps === 'paid' && total > 0) pay = { amount: total, paid_at: paidAt }
    if (ps === 'partially_paid') {
      const ap = money(r.amount_paid)
      if (ap == null || Number.isNaN(ap) || ap <= 0 || ap >= total) { skipped.push({ row: line, reason: 'partially_paid needs amount_paid above 0 and below the order total' }); continue }
      pay = { amount: ap, paid_at: paidAt }
    }
    const email = pick(r, 'customer_email', 'email').toLowerCase(); let cid: string | null = null
    if (email) { cid = custMap.get(email) ?? null; if (!cid) noCust++ }
    let ful = norm(r.fulfillment_status); if (!FULFIL.includes(ful)) ful = 'not_started'
    nums.add(orderNumber); if (tx) txs.add(tx)
    if (pay) { payRows++; payTotal += pay.amount }
    valid.push({ order: { order_number: orderNumber, idempotency_key: 'import:' + orderNumber, customer_id: cid, product_id: pid, quantity: qty, unit_price: unit, discount: disc, order_date: od,
      platform: pick(r, 'platform') || null, payment_method: pick(r, 'payment_method') || null, payment_status: ps, fulfillment_status: ful, transaction_ref: pick(r, 'transaction_ref', 'transaction') || null, notes: pick(r, 'notes') || null }, pay })
  }
  if (payRows) notes.push(`${payRows} row(s) are marked paid or partially paid. A payment record totaling $${payTotal.toFixed(2)} will be created for them, because revenue only counts recorded payments.`)
  if (noCust) notes.push(`${noCust} row(s) have a customer email with no matching customer. They will be imported without a customer link. Import customers first to avoid this.`)
  notes.push('Orders marked pending or cancelled create no payment and count as $0 collected revenue.')
  return { valid, skipped, notes }
}

export async function commitOrders(valid: any[], sb: SupabaseClient): Promise<{ added: number; error?: string }> {
  let added = 0
  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100)
    const { data, error } = await sb.from('orders').insert(batch.map(b => b.order)).select('id,order_number')
    if (error) return { added, error: error.message }
    const idByNum = new Map<string, string>((data ?? []).map((o: any) => [o.order_number, o.id]))
    const pays = batch.filter(b => b.pay).map(b => ({ order_id: idByNum.get(b.order.order_number), amount: b.pay.amount, kind: 'payment', paid_at: b.pay.paid_at, reference: b.order.transaction_ref }))
    added += data?.length ?? 0
    if (pays.length) {
      const pr = await sb.from('payments').insert(pays)
      if (pr.error) return { added, error: `Orders were saved but their payments were not (${pr.error.message}). Open the paid orders from this batch and record the payments by hand before importing more.` }
    }
  }
  return { added }
}
