'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const TYPES = ['workshop','book_signing','book_celebration','educational_session','webinar','live_discussion','networking','other']
const cls = 'w-full border rounded-lg p-2 bg-white'
const nice = (s: string) => s.replace(/_/g, ' ')
export default function EventEditor({ event, products }: { event: Row; products: Row[] }) {
  const a = useAutosave(); const [e, setE] = useState<Row>(event)
  a.register('events', e.id, event.version)
  const edit = (patch: Row, imm = false) => { setE(x => ({ ...x, ...patch })); a.save('events', e.id, patch, imm) }
  const T = (label: string, k: string, type = 'text') => (<label className="block text-sm"><span className="text-slate-600">{label}</span><input type={type} className={cls} value={e[k] ?? ''} onChange={ev => edit({ [k]: ev.target.value === '' ? null : ev.target.value }, type === 'date' || type === 'time')} /></label>)
  const N = (label: string, k: string, step = '1') => (<label className="block text-sm"><span className="text-slate-600">{label}</span><input type="number" min="0" step={step} className={cls} value={e[k] ?? ''} onChange={ev => edit({ [k]: ev.target.value === '' ? null : Number(ev.target.value) })} /></label>)
  const C = (label: string, k: string) => (<label className="flex gap-2 items-center text-sm"><input type="checkbox" className="h-5 w-5" checked={!!e[k]} onChange={ev => edit({ [k]: ev.target.checked }, true)} />{label}</label>)
  async function setStatus(s: string) {
    if (s === 'confirmed' && !confirm('Confirm this event is officially happening? Make sure the date, time, and place are final.')) return
    edit({ status: s }, true)
  }
  async function archive() {
    if (!confirm('Archive this event? It is hidden, not permanently erased.')) return
    const { error } = await a.sb.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', e.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    window.location.href = '/events'
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start"><div><h1 className="text-2xl font-semibold">{e.name || 'Untitled event'}</h1><p className="text-sm text-slate-500">Changes save automatically.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span></div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <section className="bg-white rounded-2xl border p-4 grid gap-3 md:grid-cols-2">
        {T('Event name', 'name')}
        <label className="block text-sm"><span className="text-slate-600">Product</span><select className={cls} value={e.product_id ?? ''} onChange={ev => edit({ product_id: ev.target.value || null }, true)}><option value="">None</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Type</span><select className={cls} value={e.event_type} onChange={ev => edit({ event_type: ev.target.value }, true)}>{TYPES.map(t => <option key={t} value={t}>{nice(t)}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Status</span><select className={cls} value={e.status} onChange={ev => setStatus(ev.target.value)}>{['planning','confirmed','completed','cancelled','postponed'].map(s => <option key={s}>{s}</option>)}</select></label>
        {T('Date', 'event_date', 'date')}{T('Start time', 'start_time', 'time')}{T('End time', 'end_time', 'time')}{T('Location', 'location')}
        <div className="md:col-span-2">{T('Online meeting link', 'meeting_link')}</div>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Description</span><textarea className={cls} rows={3} value={e.description ?? ''} onChange={ev => edit({ description: ev.target.value })} /></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Promotional content (post ideas, flyer notes, links)</span><textarea className={cls} rows={3} value={e.promotional_content ?? ''} onChange={ev => edit({ promotional_content: ev.target.value })} /></label>
      </section>
      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Numbers</h2><p className="text-xs text-slate-500">Enter only what you have actually recorded. Leave blank if not recorded. Event revenue here is a separate tally and is not added to the Sales totals, so record ticket or book sales in Sales & Orders too if you want them counted there.</p>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">{N('Ticket price ($)', 'ticket_price', '0.01')}{N('Capacity', 'capacity')}{N('Registrations', 'registration_count')}{N('Attendance', 'attendance')}{N('Event revenue ($)', 'revenue', '0.01')}{N('Event expenses ($)', 'expenses', '0.01')}</div>
      </section>
      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Event checklist</h2>
        <div className="grid gap-2 md:grid-cols-2">{C('Printed book display ready', 'printed_book_display')}{C('Purchase QR codes ready (only after links are verified)', 'purchase_qr_codes')}{C('Future-event signup form ready', 'signup_form')}{C('The Credit Blueprint promotion prepared', 'credit_blueprint_promotion')}</div>
        <div className="grid gap-3 md:grid-cols-2">{T('Photographer or content creator', 'photographer')}{T('Interview opportunities', 'interview_opportunities')}</div>
        <label className="block text-sm"><span className="text-slate-600">Notes</span><textarea className={cls} rows={3} value={e.notes ?? ''} onChange={ev => edit({ notes: ev.target.value })} /></label>
      </section>
      <button className="text-sm text-slate-500 hover:text-red-600" onClick={archive}>Archive this event</button>
    </div>
  )
}
