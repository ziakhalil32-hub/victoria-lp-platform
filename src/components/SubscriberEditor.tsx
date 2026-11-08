'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const cls = 'w-full border rounded-lg p-2 bg-white'
export default function SubscriberEditor({ sub, lists }: { sub: Row; lists: Row[] }) {
  const a = useAutosave(); const [s, setS] = useState<Row>(sub)
  a.register('subscribers', s.id, sub.version)
  const edit = (patch: Row, imm = false) => { setS(x => ({ ...x, ...patch })); a.save('subscribers', s.id, patch, imm) }
  const T = (label: string, k: string, type = 'text') => (<label className="block text-sm"><span className="text-slate-600">{label}</span><input type={type} className={cls} value={s[k] ?? ''} onChange={e => edit({ [k]: e.target.value === '' ? null : e.target.value }, type === 'date')} /></label>)
  async function suppress() {
    if (!confirm(`Add ${s.email} to your suppression list? They will never be eligible for marketing email.`)) return
    const { error } = await a.sb.from('email_suppressions').insert({ email: s.email, reason: 'Added from subscriber record' })
    if (error && error.code !== '23505') { a.setStatus('failed'); a.setMsg(error.message); return }
    edit({ subscription_status: 'suppressed' }, true)
  }
  async function archive() {
    if (!confirm('Archive this subscriber? It is hidden, not permanently erased.')) return
    const { error } = await a.sb.from('subscribers').update({ deleted_at: new Date().toISOString() }).eq('id', s.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    window.location.href = '/email/subscribers'
  }
  return (
    <section className="bg-white rounded-2xl border p-4 space-y-4">
      <div className="flex justify-between items-start"><div><h1 className="text-2xl font-semibold">{s.email}</h1><p className="text-sm text-slate-500">Changes save automatically.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {T('First name', 'first_name')}{T('Last name', 'last_name')}
        <label className="block text-sm"><span className="text-slate-600">Audience</span><select className={cls} value={s.list_id} onChange={e => edit({ list_id: e.target.value }, true)}>{lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        {T('Interest categories', 'interest_categories')}{T('Signup source', 'signup_source')}{T('Signup date', 'signup_date', 'date')}
        <label className="block text-sm"><span className="text-slate-600">Consent status</span><select className={cls} value={s.consent_status} onChange={e => edit({ consent_status: e.target.value, consent_date: e.target.value === 'consented' ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) : s.consent_date }, true)}>{['consented', 'unknown', 'withdrawn'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Subscription status</span><select className={cls} value={s.subscription_status} onChange={e => edit({ subscription_status: e.target.value }, true)}>{['subscribed', 'unsubscribed', 'bounced', 'suppressed'].map(x => <option key={x}>{x}</option>)}</select></label>
        {T('Consent date', 'consent_date', 'date')}{T('Last email sent', 'last_email_sent', 'date')}
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">How consent was given (note)</span><input className={cls} value={s.consent_note ?? ''} onChange={e => edit({ consent_note: e.target.value })} /></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Notes</span><textarea className={cls} rows={3} value={s.notes ?? ''} onChange={e => edit({ notes: e.target.value })} /></label>
      </div>
      <div className="flex gap-4 text-sm"><button className="text-blue-600" onClick={() => edit({ subscription_status: 'unsubscribed' }, true)}>Mark unsubscribed</button><button className="text-amber-700" onClick={suppress}>Add to suppression list</button><button className="text-slate-500 hover:text-red-600" onClick={archive}>Archive</button></div>
    </section>
  )
}
