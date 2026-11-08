'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
type S = { id: string; email: string; reason: string | null; created_at: string }
export default function SuppressionManager({ items }: { items: S[] }) {
  const router = useRouter(); const sb = createClient()
  const [email, setEmail] = useState(''); const [reason, setReason] = useState(''); const [msg, setMsg] = useState('')
  async function add() {
    const e = email.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setMsg('Enter a valid email.'); return }
    const { error } = await sb.from('email_suppressions').insert({ email: e, reason: reason || null })
    if (error) { setMsg(error.code === '23505' ? 'Already on the list.' : error.message); return }
    await sb.from('subscribers').update({ subscription_status: 'suppressed' }).eq('email', e).eq('subscription_status', 'subscribed')
    setEmail(''); setReason(''); setMsg('Added.'); router.refresh()
  }
  async function remove(s: S) {
    if (!confirm(`Remove ${s.email} from the suppression list? Only do this if they clearly asked to hear from you again. Their subscriber records stay suppressed until you change them yourself.`)) return
    const { error } = await sb.from('email_suppressions').update({ deleted_at: new Date().toISOString() }).eq('id', s.id)
    if (error) { setMsg(error.message); return }
    router.refresh()
  }
  const c = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><input className={c} placeholder="Email to never contact" value={email} onChange={e => setEmail(e.target.value)} /><input className={c} placeholder="Reason (unsubscribed, complaint…)" value={reason} onChange={e => setReason(e.target.value)} /><button className="bg-blue-600 text-white rounded-lg px-4 text-sm" onClick={add}>Add</button></div>
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
      {items.length === 0 ? <p className="text-sm text-slate-500">No one is suppressed yet.</p> : <ul className="bg-white border rounded-2xl divide-y text-sm">{items.map(s => <li key={s.id} className="p-3 flex justify-between gap-3"><span>{s.email} <span className="text-slate-500">{s.reason ?? ''}</span></span><span className="flex gap-3"><span className="text-slate-500">{s.created_at.slice(0, 10)}</span><button className="text-slate-400 hover:text-red-600" onClick={() => remove(s)}>Remove</button></span></li>)}</ul>}
    </div>
  )
}
