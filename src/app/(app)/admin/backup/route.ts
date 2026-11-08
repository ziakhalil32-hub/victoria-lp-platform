import { createClient } from '@/lib/supabase/server'
import { TABLES, fetchAll, isAdmin } from '@/lib/adminData'
export async function GET() {
  const sb = await createClient()
  if (!(await isAdmin(sb))) return new Response('Not allowed', { status: 403 })
  try {
    const data: Record<string, any[]> = {}
    for (const t of TABLES) data[t] = await fetchAll(sb, t)
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    return new Response(JSON.stringify({ exported_at: new Date().toISOString(), note: 'Archived (hidden) records and uploaded files are not included.', tables: data }, null, 1), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="victoria-lp-backup-${day}.json"` } })
  } catch (e: any) { return new Response(e.message, { status: 500 }) }
}
