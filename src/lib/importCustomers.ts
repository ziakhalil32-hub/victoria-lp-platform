import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchRows, norm, okEmail, type Prepared, type Template } from './importHelpers'
const LEAD = ['new', 'contacted', 'interested', 'qualified', 'follow_up_required', 'converted', 'not_interested', 'archived']
const CUST = ['prospect', 'customer', 'repeat_customer', 'event_attendee', 'course_student']
export const CUSTOMER_TEMPLATE: Template = {
  header: ['first_name', 'last_name', 'email', 'phone', 'organization', 'interest', 'product', 'source', 'lead_status', 'customer_status', 'notes'],
  example: ['Jane', 'Doe', 'jane@example.com', '', 'Example LLC', 'Self-care', 'Turn the Page', 'Workshop', 'interested', 'prospect', ''],
}
const pick = (r: Record<string, string>, ...k: string[]) => { for (const x of k) if ((r[x] ?? '').trim()) return r[x].trim(); return '' }
const nameKey = (f: string, l: string) => `name:${f.toLowerCase()}|${l.toLowerCase()}`

export async function prepareCustomers(rows: Record<string, string>[], sb: SupabaseClient): Promise<Prepared> {
  const [existing, prods] = await Promise.all([fetchRows(sb, 'customers', 'id,email,first_name,last_name'), fetchRows(sb, 'products', 'id,name,slug')])
  const have = new Set<string>(); existing.forEach(c => { if (c.email) have.add(String(c.email).toLowerCase()); else have.add(nameKey(c.first_name ?? '', c.last_name ?? '')) })
  const prodMap = new Map<string, string>(); prods.forEach(p => { prodMap.set(String(p.name).toLowerCase(), p.id); if (p.slug) prodMap.set(String(p.slug).toLowerCase(), p.id) })
  const valid: any[] = []; const skipped: { row: number; reason: string }[] = []; const notes: string[] = []
  let badLead = 0, badCust = 0, noProd = 0
  rows.forEach((r, i) => {
    const line = i + 2
    const first = pick(r, 'first_name', 'firstname', 'first'), last = pick(r, 'last_name', 'lastname', 'last')
    const email = pick(r, 'email', 'email_address').toLowerCase()
    if (!email && !first && !last) return void skipped.push({ row: line, reason: 'no name or email' })
    if (email && !okEmail(email)) return void skipped.push({ row: line, reason: `invalid email "${email}"` })
    const key = email || nameKey(first, last)
    if (have.has(key)) return void skipped.push({ row: line, reason: 'already exists or repeated in this file' })
    have.add(key)
    let lead = norm(r.lead_status), cust = norm(r.customer_status)
    if (lead && !LEAD.includes(lead)) { badLead++; lead = '' }
    if (cust && !CUST.includes(cust)) { badCust++; cust = '' }
    const pname = pick(r, 'product').toLowerCase(); let pid: string | null = null
    if (pname) { pid = prodMap.get(pname) ?? null; if (!pid) noProd++ }
    valid.push({ first_name: first || null, last_name: last || null, email: email || null, phone: pick(r, 'phone', 'phone_number') || null, organization: pick(r, 'organization', 'company', 'org') || null,
      interest: pick(r, 'interest') || null, product_id: pid, source: pick(r, 'source', 'lead_source') || 'CSV import', lead_status: lead || 'new', customer_status: cust || 'prospect', notes: pick(r, 'notes') || null })
  })
  if (badLead) notes.push(`${badLead} row(s) had an unrecognized lead status and will use “new.”`)
  if (badCust) notes.push(`${badCust} row(s) had an unrecognized customer status and will use “prospect.”`)
  if (noProd) notes.push(`${noProd} row(s) named a product that does not exist; they will be imported without a product.`)
  if (valid.some(v => !v.email)) notes.push('Rows without an email are matched by name only, so re-importing them is safe but different people with the same name would be treated as one.')
  notes.push('Imported contacts are NOT added to any email audience. Email consent is handled separately in Email Marketing.')
  return { valid, skipped, notes }
}

export async function commitCustomers(valid: any[], sb: SupabaseClient): Promise<{ added: number; error?: string }> {
  let added = 0
  for (let i = 0; i < valid.length; i += 200) {
    const { data, error } = await sb.from('customers').insert(valid.slice(i, i + 200)).select('id')
    if (error) return { added, error: error.message }
    added += data?.length ?? 0
  }
  return { added }
}
