'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const STATUS = ['identified','researching','ready_to_contact','contacted','responded','follow_up_required','meeting_scheduled','partnership_confirmed','declined','archived']
const TYPES = ['Entrepreneurship organization','Small business association','Community college','Adult education provider','Workforce development organization','Library','Business networking group','Financial literacy educator','Workshop organizer','Community organization','Other']
const cls = 'w-full border rounded-lg p-2 bg-white'
const nice = (s: string) => s.replace(/_/g, ' ')
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
export default function PartnershipEditor({ partnership, log }: { partnership: Row; log: Row[] }) {
  const a = useAutosave(); const [p, setP] = useState<Row>(partnership); const [items, setItems] = useState<Row[]>(log)
  const [n, setN] = useState({ date: today(), channel: 'email', summary: '' })
  a.register('partnerships', p.id, partnership.version)
  const edit = (patch: Row, imm = false) => { setP(x => ({ ...x, ...patch })); a.save('partnerships', p.id, patch, imm) }
  const T = (label: string, k: string, type = 'text') => (<label className="block text-sm"><span className="text-slate-600">{label}</span><input type={type} className={cls} value={p[k] ?? ''} onChange={e => edit({ [k]: e.target.value === '' ? null : e.target.value }, type === 'date')} /></label>)
  async function setStatus(s: string) {
    if (s === 'partnership_confirmed') {
      if (!confirm(`Confirm that ${p.organization} has actually agreed to partner with you? Sending a message does not make a partnership.`)) return
      const { error } = await a.sb.from('approvals').insert({ entity_table: 'partnerships', entity_id: p.id, action: 'confirm_partnership', decision: 'approved' })
      if (error) { a.setStatus('failed'); a.setMsg('Could not record approval: ' + error.message); return }
    }
    edit({ status: s }, true)
  }
  async function logOutreach() {
    if (!n.summary.trim()) { a.setStatus('failed'); a.setMsg('Write a short summary of what you sent or discussed.'); return }
    a.setStatus('saving')
    const { data, error } = await a.sb.from('outreach_interactions').insert({ partnership_id: p.id, interaction_date: n.date, channel: n.channel, summary: n.summary.trim() }).select().single()
    if (error || !data) { a.setStatus('failed'); a.setMsg('Could not log: ' + (error?.message ?? 'unknown')); return }
    setItems(x => [data, ...x]); setN({ ...n, summary: '' })
    const patch: Row = { last_contact_date: n.date }
    if (!p.first_contact_date) patch.first_contact_date = n.date
    if (['identified', 'researching', 'ready_to_contact'].includes(p.status)) patch.status = 'contacted'
    edit(patch, true)
  }
  async function removeLog(i: Row) {
    if (!confirm('Remove this log entry? It is archived, not permanently erased.')) return
    const { error } = await a.sb.from('outreach_interactions').update({ deleted_at: new Date().toISOString() }).eq('id', i.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    setItems(x => x.filter(y => y.id !== i.id))
  }
  async function archive() {
    if (!confirm('Archive this organization? It is hidden, not permanently erased.')) return
    const { error } = await a.sb.from('partnerships').update({ deleted_at: new Date().toISOString() }).eq('id', p.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    window.location.href = '/outreach'
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start"><div><h1 className="text-2xl font-semibold">{p.organization || 'Unnamed organization'}</h1><p className="text-sm text-slate-500">Changes save automatically.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <section className="bg-white rounded-2xl border p-4 grid gap-3 md:grid-cols-2">
        {T('Organization', 'organization')}{T('Contact person', 'contact_person')}{T('Email', 'email', 'email')}{T('Phone', 'phone')}{T('Website', 'website')}
        <label className="block text-sm"><span className="text-slate-600">Organization type</span><select className={cls} value={p.organization_type ?? ''} onChange={e => edit({ organization_type: e.target.value || null }, true)}><option value="">Not set</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
        {T('Interest area', 'interest_area')}
        <label className="block text-sm"><span className="text-slate-600">Outreach status</span><select className={cls} value={p.status} onChange={e => setStatus(e.target.value)}>{STATUS.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Proposed opportunity</span><textarea className={cls} rows={2} value={p.proposed_opportunity ?? ''} onChange={e => edit({ proposed_opportunity: e.target.value })} /></label>
        {T('First contact date', 'first_contact_date', 'date')}{T('Last contact date', 'last_contact_date', 'date')}{T('Next follow-up date', 'next_follow_up_date', 'date')}
        <label className="block text-sm"><span className="text-slate-600">Resulting sales ($, only what you can trace to this partner)</span><input type="number" min="0" step="0.01" className={cls} value={p.resulting_sales ?? ''} onChange={e => edit({ resulting_sales: e.target.value === '' ? null : Number(e.target.value) })} /></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Their response</span><textarea className={cls} rows={2} value={p.response ?? ''} onChange={e => edit({ response: e.target.value })} /></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Notes</span><textarea className={cls} rows={3} value={p.notes ?? ''} onChange={e => edit({ notes: e.target.value })} /></label>
      </section>
      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Outreach log</h2><p className="text-xs text-slate-500">Log each real contact. The first one moves an early-stage organization to “contacted.” It never sets “confirmed.” Sales entered here are not added to the Sales totals.</p>
        <div className="grid gap-2 md:grid-cols-[9rem_9rem_1fr_auto]"><input type="date" className={cls} value={n.date} onChange={e => setN({ ...n, date: e.target.value })} />
          <select className={cls} value={n.channel} onChange={e => setN({ ...n, channel: e.target.value })}>{['email','phone','in_person','social','other'].map(c => <option key={c} value={c}>{nice(c)}</option>)}</select>
          <input className={cls} placeholder="What did you send or discuss?" value={n.summary} onChange={e => setN({ ...n, summary: e.target.value })} /><button className="bg-blue-600 text-white rounded-lg px-4 text-sm" onClick={logOutreach}>Log outreach</button></div>
        {items.length === 0 && <p className="text-sm text-slate-500">No contact logged yet.</p>}
        <ul className="space-y-2">{items.map(i => <li key={i.id} className="border rounded-lg p-2 text-sm flex justify-between gap-3"><span><b>{i.interaction_date}</b> · {nice(i.channel)} · {i.summary}</span><button className="text-slate-400 hover:text-red-600" onClick={() => removeLog(i)}>Remove</button></li>)}</ul>
      </section>
      <button className="text-sm text-slate-500 hover:text-red-600" onClick={archive}>Archive this organization</button>
    </div>
  )
}
