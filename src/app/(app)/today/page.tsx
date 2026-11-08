import { createClient } from '@/lib/supabase/server'
import Tasks, { type Task } from '@/components/Tasks'
export const dynamic = 'force-dynamic'

const label: Record<string, string> = { requires_review: 'Requires review', not_started: 'Not started', in_progress: 'In progress', completed: 'Completed' }

export default async function Today() {
  const sb = await createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const [products, openTasks, doneTasks, milestones] = await Promise.all([
    sb.from('products').select('id,name,launch_date,presale_deadline,marketing_status').is('deleted_at', null).order('launch_date'),
    sb.from('tasks').select('*').is('deleted_at', null).neq('status', 'done').or(`due_date.lte.${today},due_date.is.null`).order('due_date'),
    sb.from('tasks').select('*').is('deleted_at', null).eq('status', 'done').gte('completed_at', today + 'T00:00:00-06:00'),
    sb.from('v_milestones').select('id,title,start_date,end_date,display_status,product_id').lte('start_date', today).neq('status', 'completed').order('end_date'),
  ])
  const days = (d: string) => Math.ceil((new Date(d + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000)
  const names = Object.fromEntries((products.data ?? []).map(p => [p.id, p.name]))
  const err = products.error || openTasks.error || milestones.error

  return (
    <div className="space-y-8">
      <header><h1 className="text-2xl font-semibold">Today</h1><p className="text-slate-500">{today} · what needs your attention</p></header>
      {err && <p className="text-red-600 text-sm">Could not load data: {err.message}</p>}
      <section className="grid gap-3 md:grid-cols-3">
        {(products.data ?? []).map(p => (
          <div key={p.id} className="bg-white rounded-2xl border p-4">
            <div className="font-medium">{p.name}</div>
            <div className="text-3xl font-semibold mt-1">{p.launch_date ? Math.max(days(p.launch_date), 0) : '—'}<span className="text-sm font-normal text-slate-500"> days to launch</span></div>
            <div className="text-xs text-slate-500 mt-1">Launch {p.launch_date ?? 'not set'} · {p.marketing_status.replace(/_/g, ' ')}</div>
            {p.presale_deadline && <div className="text-xs text-slate-500">Presale ends {p.presale_deadline}</div>}
          </div>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Campaign milestones needing attention</h2>
        {(milestones.data ?? []).length === 0 && <p className="text-sm text-slate-500">None right now.</p>}
        <ul className="space-y-2">
          {(milestones.data ?? []).map(m => (
            <li key={m.id} className="bg-white rounded-xl border p-3 flex justify-between gap-2 text-sm">
              <span>{names[m.product_id]}: <b>{m.title}</b> <span className="text-slate-500">({m.start_date} to {m.end_date})</span></span>
              <span className={m.display_status === 'requires_review' ? 'text-amber-600' : 'text-slate-500'}>{label[m.display_status]}</span>
            </li>
          ))}
        </ul>
      </section>
      <Tasks initial={[...(openTasks.data ?? []), ...(doneTasks.data ?? [])] as Task[]} today={today} />
    </div>
  )
}
