'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type M = { id: string; title: string; start_date: string; end_date: string; display_status: string; version: number; product: string }
export default function MilestoneList({ initial }: { initial: M[] }) {
  const a = useAutosave(); const [items, setItems] = useState(initial)
  initial.forEach(m => a.register('campaign_milestones', m.id, m.version))
  function done(m: M) {
    if (!confirm(`Confirm "${m.title}" is actually complete?`)) return
    a.save('campaign_milestones', m.id, { status: 'completed', completed_at: new Date().toISOString() }, true)
    setItems(x => x.filter(i => i.id !== m.id))
  }
  return (
    <section className="space-y-2">
      <div className="flex justify-between"><h2 className="font-semibold">Campaign milestones needing attention</h2><span className="text-sm text-slate-500">{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      {items.length === 0 && <p className="text-sm text-slate-500">None right now.</p>}
      <ul className="space-y-2">{items.map(m => (
        <li key={m.id} className="bg-white rounded-xl border p-3 flex justify-between gap-2 text-sm items-center">
          <span>{m.product}: <b>{m.title}</b> <span className="text-slate-500">({m.start_date} to {m.end_date})</span></span>
          <span className="flex gap-3 items-center whitespace-nowrap"><span className={m.display_status === 'requires_review' ? 'text-amber-600' : 'text-slate-500'}>{m.display_status === 'requires_review' ? 'Requires review' : m.display_status.replace(/_/g, ' ')}</span>
            <button className="text-blue-600" onClick={() => done(m)}>Mark done</button></span>
        </li>))}</ul>
    </section>
  )
}
