'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Task = {
  id: string; title: string; notes: string | null; due_date: string | null
  priority: string; status: string; recurrence: string | null; version: number
}
type Status = 'idle' | 'saving' | 'saved' | 'failed' | 'offline'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function nextDue(date: string, rec: string) {
  const d = new Date(date + 'T12:00:00')
  if (rec === 'weekly') d.setDate(d.getDate() + 7)
  else if (rec === 'monthly') d.setMonth(d.getMonth() + 1)
  else { do { d.setDate(d.getDate() + 1) } while (rec === 'weekdays' && [0, 6].includes(d.getDay())) }
  return d.toISOString().slice(0, 10)
}

export default function Tasks({ initial, today }: { initial: Task[]; today: string }) {
  const sb = useRef(createClient()).current
  const [tasks, setTasks] = useState<Task[]>(initial)
  const [status, setStatus] = useState<Status>('idle')
  const [msg, setMsg] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const versions = useRef<Record<string, number>>(Object.fromEntries(initial.map(t => [t.id, t.version])))
  const patches = useRef<Record<string, Record<string, unknown>>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pending = useRef(0)

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (pending.current > 0) { e.preventDefault(); e.returnValue = '' } }
    const off = () => setStatus('offline'); const on = () => pending.current === 0 && setStatus('idle')
    window.addEventListener('beforeunload', warn); window.addEventListener('offline', off); window.addEventListener('online', on)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [])

  async function flush(id: string) {
    const patch = patches.current[id]; delete patches.current[id]
    if (!patch) return
    for (let attempt = 0; attempt < 4; attempt++) {
      if (!navigator.onLine) { setStatus('offline'); await sleep(1500); continue }
      const { data, error } = await sb.from('tasks').update(patch).eq('id', id).eq('version', versions.current[id]).select('version').maybeSingle()
      if (!error && data) { versions.current[id] = data.version; pending.current--; if (pending.current === 0) setStatus('saved'); return }
      if (!error && !data) { pending.current--; setStatus('failed'); setMsg('This task was changed on another device. Refresh the page to see the latest version. Your edit was NOT saved.'); return }
      await sleep(500 * 2 ** attempt)
    }
    pending.current--; setStatus('failed'); setMsg('Could not save. Check your connection and try again.')
  }

  function change(id: string, patch: Record<string, unknown>, immediate: boolean) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } as Task : t))
    if (!patches.current[id]) pending.current++
    patches.current[id] = { ...patches.current[id], ...patch }
    setStatus('saving'); setMsg('')
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => flush(id), immediate ? 0 : 800)
  }

  async function toggle(t: Task) {
    const done = t.status !== 'done'
    change(t.id, { status: done ? 'done' : 'open', completed_at: done ? new Date().toISOString() : null }, true)
    if (done && t.recurrence) {
      const { data } = await sb.from('tasks').insert({ title: t.title, notes: t.notes, priority: t.priority, recurrence: t.recurrence, due_date: nextDue(t.due_date ?? today, t.recurrence) }).select().single()
      if (data) { versions.current[data.id] = data.version }
    }
  }

  async function add() {
    const title = newTitle.trim(); if (!title) return
    setStatus('saving'); setNewTitle('')
    const { data, error } = await sb.from('tasks').insert({ title, due_date: today }).select().single()
    if (error || !data) { setStatus('failed'); setMsg('Could not add the task: ' + (error?.message ?? 'unknown error')); setNewTitle(title); return }
    versions.current[data.id] = data.version; setTasks(ts => [...ts, data]); setStatus('saved')
  }

  async function remove(t: Task) {
    if (!confirm(`Remove "${t.title}"? (It is archived, not permanently erased.)`)) return
    const { error } = await sb.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', t.id)
    if (error) { setStatus('failed'); setMsg(error.message); return }
    setTasks(ts => ts.filter(x => x.id !== t.id)); setStatus('saved')
  }

  const open = tasks.filter(t => t.status !== 'done'); const done = tasks.filter(t => t.status === 'done')
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0
  const label = { idle: '', saving: 'Saving…', saved: 'Saved ✓', failed: 'Save Failed', offline: 'Offline — Changes Pending' }[status]
  const color = status === 'failed' ? 'text-red-600' : status === 'offline' ? 'text-amber-600' : 'text-slate-500'

  const row = (t: Task) => (
    <li key={t.id} className="flex flex-wrap items-center gap-2 bg-white rounded-xl border p-3">
      <input type="checkbox" className="h-5 w-5" checked={t.status === 'done'} onChange={() => toggle(t)} />
      <input className={`flex-1 min-w-[10rem] bg-transparent outline-none ${t.status === 'done' ? 'line-through text-slate-400' : ''}`}
        value={t.title} onChange={e => change(t.id, { title: e.target.value }, false)} />
      <input type="date" className="border rounded p-1 text-sm" value={t.due_date ?? ''} onChange={e => change(t.id, { due_date: e.target.value || null }, true)} />
      <select className="border rounded p-1 text-sm" value={t.priority} onChange={e => change(t.id, { priority: e.target.value }, true)}>
        {['low', 'normal', 'high', 'urgent'].map(p => <option key={p}>{p}</option>)}
      </select>
      <button className="text-slate-400 hover:text-red-600 text-sm" onClick={() => remove(t)}>Remove</button>
      {t.due_date && t.due_date < today && t.status !== 'done' && <span className="text-xs text-red-600 w-full">Overdue</span>}
    </li>
  )

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Tasks <span className="text-sm font-normal text-slate-500">({done.length} of {tasks.length} done · {pct}%)</span></h2>
        <span className={`text-sm ${color}`}>{label}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded"><div className="h-2 bg-blue-600 rounded" style={{ width: pct + '%' }} /></div>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <div className="flex gap-2">
        <input className="flex-1 border rounded-lg p-2 bg-white" placeholder="Add a task and press Enter" value={newTitle}
          onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="bg-blue-600 text-white rounded-lg px-4" onClick={add}>Add</button>
      </div>
      {open.length === 0 && <p className="text-sm text-slate-500">Nothing due. Add a task above.</p>}
      <ul className="space-y-2">{open.map(row)}</ul>
      {done.length > 0 && <><h3 className="text-sm font-medium text-slate-500 pt-2">Completed today</h3><ul className="space-y-2">{done.map(row)}</ul></>}
    </section>
  )
}
