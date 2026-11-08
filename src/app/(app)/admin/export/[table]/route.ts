import { createClient } from '@/lib/supabase/server'
import { toCsv, csvResponse } from '@/lib/csv'
import { TABLES, fetchAll, isAdmin } from '@/lib/adminData'
export async function GET(_: Request, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params
  const sb = await createClient()
  if (!(await isAdmin(sb))) return new Response('Not allowed', { status: 403 })
  if (!TABLES.includes(table)) return new Response('Unknown table', { status: 404 })
  try {
    const rows = (await fetchAll(sb, table)).map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v !== null && typeof v === 'object' ? JSON.stringify(v) : v])))
    const cols = [...new Set(rows.flatMap(r => Object.keys(r)))]
    return csvResponse(toCsv(rows, cols), `${table}.csv`)
  } catch (e: any) { return new Response(e.message, { status: 500 }) }
}
