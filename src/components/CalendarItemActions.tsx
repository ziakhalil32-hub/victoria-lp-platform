'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addDays, startOf } from '@/lib/dates'
export type ItemAct = { table: 'tasks' | 'content'; id: string; version: number; status: string; date: string; scheduledFor?: string | null; recurrence?: string | null; notes?: string | null; priority?: string; title: string }
function nextDue(date: string, rec: string) {
  const d = new Date(date + 'T12:00:00Z')
  if (rec === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  else if (rec === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1)
  else { do { d.setUTCDate(d.getUTCDate() + 1) } while (rec === 'weekdays' && [0, 6].includes(d.getUTCDay())) }
  return d.toISOString().slice(0, 10)
}
export default function CalendarItemActions(p: ItemAct) {
  const router = useRouter(); const sb = useRef(createClient()).current; const version = useRef(p.version)
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [newDate, setNewDate] = useState(p.date)
  const isTask = p.table === 'tasks'; const done = isTask && p.status === 'done'
  const locked = done || (p.table === 'content' && ['published', 'archived'].includes(p.status))
  async function update(patch: Record<string, unknown>) {
    setBusy(true); setMsg('')
    const { data, error } = await sb.from(p.table).update(patch).eq('id', p.id).eq('version', version.current).select('version').maybeSingle()
    setBusy(false)
    if (error) { setMsg('Could not save: ' + error.message); return false }
    if (!data) { setMsg('This changed on another device. Refresh the page.'); return false }
    version.current = data.version; return true
  }
  async function toggle() {
    const nowDone = !done
    const ok = await update({ status: nowDone ? 'done' : 'open', completed_at: nowDone ? new Date().toISOString() : null })
    if (!ok) return
    if (nowDone && p.recurrence) {
      const { error } = await sb.from('tasks').insert({ title: p.title, notes: p.notes ?? null, priority: p.priority ?? 'normal', recurrence: p.recurrence, due_date: nextDue(p.date, p.recurrence) })
      if (error) { setMsg('Marked done, but the next repeat was not created: ' + error.message); router.refresh(); return }
    }
    router.refresh()
  }
  async function move() {
    if (!newDate || newDate === p.date) return
    let patch: Record<string, unknown>
    if (isTask) patch = { due_date: newDate }
    else {
      const hhmm = p.scheduledFor ? new Date(p.scheduledFor).toLocaleTimeString('en-GB', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '09:00'
      patch = { scheduled_for: new Date(`${newDate}T${hhmm}:00${startOf(newDate).slice(-6)}`).toISOString() }
    }
    if (await update(patch)) router.refresh()
  }
  void addDays
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-700">
      {isTask && <label className="flex items-center gap-1"><input type="checkbox" className="h-4 w-4" checked={done} disabled={busy} onChange={toggle} />done</label>}
      {!locked && <><input type="date" className="border rounded px-1 py-0.5 bg-white" value={newDate} onChange={e => setNewDate(e.target.value)} />{newDate !== p.date && newDate && <button disabled={busy} className="bg-slate-800 text-white rounded px-2 py-0.5 disabled:opacity-50" onClick={move}>{busy ? '…' : 'Move'}</button>}</>}
      {msg && <span className="text-red-600">{msg}</span>}
    </div>
  )
}
