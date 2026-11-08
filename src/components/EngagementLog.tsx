'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const cls = 'border rounded p-1 bg-white text-sm w-full'
export default function EngagementLog({ platform, rows, defaultDate }: { platform: string; rows: Row[]; defaultDate: string }) {
  const router = useRouter(); const a = useAutosave(); const [items, setItems] = useState<Row[]>(rows)
  rows.forEach(r => a.register('social_engagement', r.id, r.version))
  const edit = (id: string, patch: Row, imm = false) => { setItems(x => x.map(r => r.id === id ? { ...r, ...patch } : r)); a.save('social_engagement', id, patch, imm) }
  async function add() {
    a.setStatus('saving')
    const { data, error } = await a.sb.from('social_engagement').insert({ platform, log_date: defaultDate }).select().single()
    if (error || !data) { a.setStatus('failed'); a.setMsg('Could not add: ' + (error?.message ?? 'unknown')); return }
    a.register('social_engagement', data.id, data.version); setItems(x => [...x, data]); a.setStatus('saved')
  }
  async function remove(r: Row) {
    if (!confirm('Remove this log row? It is archived, not permanently erased.')) return
    const { error } = await a.sb.from('social_engagement').update({ deleted_at: new Date().toISOString() }).eq('id', r.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    setItems(x => x.filter(y => y.id !== r.id)); router.refresh()
  }
  const N = (r: Row, k: string) => <input type="number" min="0" className={cls} value={r[k] ?? ''} onChange={e => edit(r.id, { [k]: e.target.value === '' ? null : Math.floor(Number(e.target.value)) })} />
  return (
    <section className="bg-white border rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center"><h2 className="font-semibold">Daily engagement log</h2><span className="text-sm text-slate-500">{statusLabel[a.status]}</span></div>
      <p className="text-xs text-slate-500">Record comments, direct messages, and inquiries you handled, and any questions still waiting on a reply. Leave blank if not recorded.</p>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      {items.length === 0 && <p className="text-sm text-slate-500">No log rows for this week.</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm min-w-[52rem]">
        <thead className="text-left text-slate-500"><tr>{['Date', 'Comments', 'DMs', 'Inquiries', 'Need reply', 'Follow-up', 'Notes', ''].map(h => <th key={h} className="p-1 font-medium">{h}</th>)}</tr></thead>
        <tbody>{items.map(r => <tr key={r.id} className="border-t"><td className="p-1"><input type="date" className={cls} value={r.log_date} onChange={e => edit(r.id, { log_date: e.target.value }, true)} /></td>
          <td className="p-1">{N(r, 'comments')}</td><td className="p-1">{N(r, 'direct_messages')}</td><td className="p-1">{N(r, 'inquiries')}</td><td className="p-1">{N(r, 'questions_pending')}</td>
          <td className="p-1"><select className={cls} value={r.follow_up_status} onChange={e => edit(r.id, { follow_up_status: e.target.value }, true)}><option value="none">none</option><option value="pending">pending</option><option value="done">done</option></select></td>
          <td className="p-1"><input className={cls} value={r.notes ?? ''} onChange={e => edit(r.id, { notes: e.target.value })} /></td>
          <td className="p-1"><button className="text-slate-400 hover:text-red-600" onClick={() => remove(r)}>Remove</button></td></tr>)}</tbody></table></div>
      <button className="text-sm text-blue-600" onClick={add}>+ Add a log row ({defaultDate})</button>
    </section>
  )
}
