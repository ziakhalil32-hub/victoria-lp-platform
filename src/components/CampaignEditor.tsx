'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const STAGES = [['introduction', '1. Introduction'], ['what_is_inside', '2. What Is Inside?'], ['why_created', '3. Why I Created This'], ['final_opportunity', '4. Final Opportunity'], ['launch_day', '5. Launch Day']]
const STATUSES = ['draft', 'ready_for_review', 'approved', 'scheduled', 'sent', 'cancelled']
const cls = 'w-full border rounded-lg p-2 bg-white'
const nice = (s: string) => s.replace(/_/g, ' ')
const toLocal = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
export default function CampaignEditor({ campaign, lists, counts }: { campaign: Row; lists: Row[]; counts: Record<string, number> }) {
  const a = useAutosave(); const [c, setC] = useState<Row>(campaign)
  a.register('email_campaigns', c.id, campaign.version)
  const edit = (patch: Row, imm = false) => { setC(x => ({ ...x, ...patch })); a.save('email_campaigns', c.id, patch, imm) }
  const N = (label: string, k: string) => (<label className="block text-sm"><span className="text-slate-600">{label}</span><input type="number" min="0" className={cls} value={c[k] ?? ''} onChange={e => edit({ [k]: e.target.value === '' ? null : Math.floor(Number(e.target.value)) })} /></label>)
  async function status(s: string) {
    const ask: Record<string, string> = { approved: 'Approve this email for sending?', scheduled: 'Approve this email and confirm it is scheduled in your email tool?', sent: 'Confirm this email was ACTUALLY sent from your email tool?' }
    if (ask[s]) {
      if (!confirm(ask[s])) return
      if ((s === 'approved' || s === 'scheduled') && (!c.subject?.trim() || !c.body?.trim())) { alert('Add a subject line and email body first.'); return }
      const { error } = await a.sb.from('approvals').insert({ entity_table: 'email_campaigns', entity_id: c.id, action: 'email_' + s, decision: 'approved' })
      if (error) { a.setStatus('failed'); a.setMsg('Could not record approval: ' + error.message); return }
    }
    edit({ status: s, ...(s === 'sent' && !c.sent_at ? { sent_at: new Date().toISOString() } : {}) }, true)
  }
  const eligible = counts[c.list_id] ?? 0
  const canExport = ['approved', 'scheduled', 'sent'].includes(c.status)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start"><div><h1 className="text-2xl font-semibold">{c.name}</h1><p className="text-sm text-slate-500">Changes save automatically. Nothing is sent from this app.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <section className="bg-white rounded-2xl border p-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm"><span className="text-slate-600">Campaign name</span><input className={cls} value={c.name ?? ''} onChange={e => edit({ name: e.target.value })} /></label>
        <label className="block text-sm"><span className="text-slate-600">Audience</span><select className={cls} value={c.list_id ?? ''} onChange={e => edit({ list_id: e.target.value, product_id: lists.find(l => l.id === e.target.value)?.product_id ?? null }, true)}>{lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Stage</span><select className={cls} value={c.stage ?? ''} onChange={e => edit({ stage: e.target.value || null }, true)}><option value="">Not set</option>{STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Status</span><select className={cls} value={c.status} onChange={e => status(e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Scheduled for</span><input type="datetime-local" className={cls} value={toLocal(c.scheduled_for)} onChange={e => edit({ scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null }, true)} /></label>
        <div className="text-sm"><span className="text-slate-600">Actually sent</span><div className="p-2">{c.sent_at ? c.sent_at.slice(0, 10) : 'Not sent'}</div></div>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Subject line</span><input className={cls} value={c.subject ?? ''} onChange={e => edit({ subject: e.target.value })} /></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Email body</span><textarea className={cls} rows={14} value={c.body ?? ''} onChange={e => edit({ body: e.target.value })} /></label>
        <p className="text-xs text-slate-500 md:col-span-2">Every marketing email must include a working unsubscribe link and your mailing address. Do not make guarantees about credit scores, funding, or income.</p>
      </section>
      <section className="bg-white rounded-2xl border p-4 space-y-2">
        <h2 className="font-semibold">Recipients</h2>
        <p className="text-sm">{eligible} people in this audience are eligible (consented, subscribed, not suppressed).</p>
        {canExport ? <a href={`/email/campaigns/${c.id}/recipients`} className="text-sm text-blue-600">Download eligible recipients (CSV) for your email tool</a> : <p className="text-xs text-slate-500">The recipient list unlocks after you approve this campaign.</p>}
      </section>
      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Results</h2><p className="text-xs text-slate-500">Enter numbers from your email tool. Leave blank if not recorded.</p>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">{N('Recipients', 'recipients')}{N('Opens', 'opens')}{N('Clicks', 'clicks')}{N('Unsubscribes', 'unsubscribes')}{N('Purchases attributed', 'purchases_attributed')}</div>
      </section>
    </div>
  )
}
