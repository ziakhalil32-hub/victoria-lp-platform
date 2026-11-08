'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Row = Record<string, any>
const STATUS = [['not_started', 'Not started'], ['in_progress', 'In progress'], ['ready_for_review', 'Ready for review'], ['done', 'Done (live)']]
const SITES = ['Victoria LP website', 'ACC of Illinois website', 'Email capture form']
const cls = 'border rounded-lg p-2 bg-white text-sm'
export default function WebsiteItems({ items }: { items: Row[] }) {
  const a = useAutosave(); const [rows, setRows] = useState<Row[]>(items)
  items.forEach(i => a.register('website_items', i.id, i.version))
  const edit = (id: string, patch: Row, imm = false) => { setRows(x => x.map(r => r.id === id ? { ...r, ...patch } : r)); a.save('website_items', id, patch, imm) }
  function setStatus(i: Row, v: string) {
    if (v === 'done' && !confirm('Confirm this is actually live on the website? You checked the live page yourself. This app cannot change your website.')) return
    edit(i.id, { status: v, confirmed_at: v === 'done' ? new Date().toISOString() : null }, true)
  }
  async function add(site: string) {
    const item = prompt('What needs to be done?'); if (!item?.trim()) return
    a.setStatus('saving')
    const { data, error } = await a.sb.from('website_items').insert({ site, section: 'Custom', item: item.trim(), sort_order: 100 }).select().single()
    if (error || !data) { a.setStatus('failed'); a.setMsg('Could not add: ' + (error?.message ?? 'unknown')); return }
    a.register('website_items', data.id, data.version); setRows(x => [...x, data]); a.setStatus('saved')
  }
  async function archive(i: Row) {
    if (!confirm('Archive this item? It is hidden, not permanently erased.')) return
    const { error } = await a.sb.from('website_items').update({ deleted_at: new Date().toISOString() }).eq('id', i.id)
    if (error) { a.setStatus('failed'); a.setMsg(error.message); return }
    setRows(x => x.filter(r => r.id !== i.id))
  }
  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="font-semibold">Website and sign-up form tasks</h2><span className="text-sm text-slate-500">{statusLabel[a.status]}</span></div>
      <p className="text-xs text-slate-500">This list tracks work to be done. The app does not edit your websites, and an item is only “Done” after you confirm it is live.</p>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      {SITES.map(site => { const list = rows.filter(r => r.site === site).sort((x, y) => x.sort_order - y.sort_order); const done = list.filter(r => r.status === 'done').length
        return (
          <div key={site} className="bg-white border rounded-2xl p-4 space-y-2">
            <div className="flex justify-between"><b className="text-sm">{site}</b><span className="text-xs text-slate-500">{done} of {list.length} confirmed live</span></div>
            {list.map(i => (
              <div key={i.id} className="grid gap-2 md:grid-cols-[1fr_11rem_1fr_auto] items-center border-t pt-2">
                <div className="text-sm">{i.section && <span className="text-xs text-slate-500 block">{i.section}</span>}{i.item}</div>
                <select className={cls} value={i.status} onChange={e => setStatus(i, e.target.value)}>{STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <input className={cls} placeholder="Notes" value={i.notes ?? ''} onChange={e => edit(i.id, { notes: e.target.value })} />
                <button className="text-xs text-slate-400 hover:text-red-600" onClick={() => archive(i)}>Archive</button>
              </div>))}
            <button className="text-sm text-blue-600" onClick={() => add(site)}>+ Add item</button>
          </div>) })}
    </section>
  )
}
