import { createClient } from '@/lib/supabase/server'
import { toCsv, csvResponse } from '@/lib/csv'
import { SECTIONS } from '@/lib/generateReport'
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data } = await sb.from('reports').select('week_start,week_end,sections').eq('id', id).is('deleted_at', null).maybeSingle()
  if (!data) return new Response('Not found', { status: 404 })
  const rows = SECTIONS.map(([k, label]) => ({ week: `${data.week_start} to ${data.week_end}`, section: label, content: (data.sections as any)?.[k] ?? '' }))
  return csvResponse(toCsv(rows, ['week', 'section', 'content']), `weekly-report-${data.week_start}.csv`)
}
