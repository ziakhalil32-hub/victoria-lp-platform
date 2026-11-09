import type { SupabaseClient } from '@supabase/supabase-js'
export type Skipped = { row: number; reason: string }
export type Prepared = { valid: any[]; skipped: Skipped[]; notes: string[] }
export type Template = { header: string[]; example: string[] }
export const norm = (s?: string) => (s ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
export const okEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
export function parseDate(s?: string): string | null {
  const t = (s ?? '').trim(); if (!t) return null
  let y: number, m: number, d: number
  let x = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (x) { y = +x[1]; m = +x[2]; d = +x[3] } else { x = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!x) return null; m = +x[1]; d = +x[2]; y = +x[3] }
  const dt = new Date(Date.UTC(y, m - 1, d)); if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
export const money = (s?: string): number | null => { const t = (s ?? '').trim().replace(/[$,]/g, ''); if (t === '') return null; const n = Number(t); return Number.isFinite(n) ? n : NaN }
export async function fetchRows(sb: SupabaseClient, table: string, cols: string) {
  const out: any[] = []
  for (let p = 0; p < 100; p++) {
    const { data, error } = await sb.from(table).select(cols).is('deleted_at', null).order('id').range(p * 1000, p * 1000 + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? [])); if ((data ?? []).length < 1000) break
  }
  return out
}
