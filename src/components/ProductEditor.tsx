'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAutosave, statusLabel } from '@/lib/useAutosave'

type Row = Record<string, any>
const STATUSES = ['planning', 'preparation', 'presale', 'ready_for_launch', 'launched', 'active_sales', 'completed', 'on_hold']
const VERIFY = ['not_checked', 'pending', 'verified', 'broken', 'unavailable']
const cls = 'w-full border rounded-lg p-2 bg-white'
const nice = (s: string) => s.replace(/_/g, ' ')

export default function ProductEditor({ product, links, chapters }: { product: Row; links: Row[]; chapters: Row[] }) {
  const router = useRouter()
  const a = useAutosave()
  const [p, setP] = useState<Row>(product)
  const [ls, setLs] = useState<Row[]>(links)
  const [chs, setChs] = useState<Row[]>(chapters)
  const [unlocked, setUnlocked] = useState(false)
  a.register('products', p.id, product.version); links.forEach(l => a.register('product_links', l.id, l.version)); chapters.forEach(c => a.register('course_chapters', c.id, c.version))

  const editP = (patch: Row, imm = false) => { setP(x => ({ ...x, ...patch })); a.save('products', p.id, patch, imm) }
  const editL = (id: string, patch: Row, imm = false) => { setLs(x => x.map(l => l.id === id ? { ...l, ...patch } : l)); a.save('product_links', id, patch, imm) }
  const editC = (id: string, patch: Row, imm = false) => { setChs(x => x.map(c => c.id === id ? { ...c, ...patch } : c)); a.save('course_chapters', id, patch, imm) }
  const num = (v: string) => (v === '' ? null : Number(v))

  async function unlock() {
    if (!confirm('Prices and dates are official. Do you approve changing them for this product?')) return
    const { error } = await a.sb.from('approvals').insert({ entity_table: 'products', entity_id: p.id, action: 'change_price_or_dates', decision: 'approved' })
    if (error) { a.setStatus('failed'); a.setMsg('Could not record approval: ' + error.message); return }
    setUnlocked(true)
  }

  async function verify(l: Row, value: string) {
    if (value === 'verified') {
      if (!l.url) { alert('Add the link URL first.'); return }
      if (!confirm(`Confirm you opened this ${l.platform} link and it works (and checkout works where it applies)?`)) return
      const { error } = await a.sb.from('approvals').insert({ entity_table: 'product_links', entity_id: l.id, action: 'mark_link_verified', decision: 'approved' })
      if (error) { a.setStatus('failed'); a.setMsg('Could not record approval: ' + error.message); return }
      editL(l.id, { verification_status: 'verified', last_verified_at: new Date().toISOString() }, true)
    } else editL(l.id, { verification_status: value }, true)
  }

  async function duplicate() {
    const { id, created_at, updated_at, created_by, updated_by, version, deleted_at, slug, ...rest } = p
    const { data, error } = await a.sb.from('products').insert({ ...rest, name: p.name + ' (copy)', approval_status: 'requires_approval' }).select('id').single()
    if (error || !data) { alert('Could not duplicate: ' + (error?.message ?? 'unknown')); return }
    router.push('/products/' + data.id)
  }

  async function addLink() {
    const platform = prompt('Platform name (for example Amazon, Walmart, Website, Enrollment)?'); if (!platform) return
    const { data, error } = await a.sb.from('product_links').insert({ product_id: p.id, platform }).select().single()
    if (error || !data) { alert('Could not add link: ' + (error?.message ?? 'unknown')); return }
    a.register('product_links', data.id, data.version); setLs(x => [...x, data])
  }

  const T = (label: string, k: string, extra: Row = {}) => (
    <label className="block text-sm"><span className="text-slate-600">{label}</span>
      <input className={cls} value={p[k] ?? ''} onChange={e => editP({ [k]: e.target.value })} {...extra} /></label>)
  const lockedProps = { disabled: !unlocked }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">{p.name || 'Untitled product'}</h1>
          <p className="text-sm text-slate-500">Changes save automatically.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span>
      </div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}

      <section className="bg-white rounded-2xl border p-4 grid gap-3 md:grid-cols-2">
        {T('Product name', 'name')}{T('Category', 'category')}
        {T('Format (confirm the real format)', 'format')}{T('Availability', 'availability')}
        {T('Fulfillment method', 'fulfillment_method')}
        <label className="block text-sm"><span className="text-slate-600">Marketing status</span>
          <select className={cls} value={p.marketing_status} onChange={e => editP({ marketing_status: e.target.value }, true)}>{STATUSES.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Description</span>
          <textarea className={cls} rows={3} value={p.description ?? ''} onChange={e => editP({ description: e.target.value })} /></label>
        <label className="block text-sm md:col-span-2"><span className="text-slate-600">Notes</span>
          <textarea className={cls} rows={2} value={p.notes ?? ''} onChange={e => editP({ notes: e.target.value })} /></label>
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="flex justify-between items-center"><h2 className="font-semibold">Official prices and dates</h2>
          {!unlocked && <button className="text-sm text-blue-600" onClick={unlock}>Unlock to edit (needs your approval)</button>}</div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm"><span className="text-slate-600">Launch date</span><input type="date" className={cls} {...lockedProps} value={p.launch_date ?? ''} onChange={e => editP({ launch_date: e.target.value || null }, true)} /></label>
          <label className="block text-sm"><span className="text-slate-600">Presale start</span><input type="date" className={cls} {...lockedProps} value={p.presale_start ?? ''} onChange={e => editP({ presale_start: e.target.value || null }, true)} /></label>
          <label className="block text-sm"><span className="text-slate-600">Presale deadline</span><input type="date" className={cls} {...lockedProps} value={p.presale_deadline ?? ''} onChange={e => editP({ presale_deadline: e.target.value || null }, true)} /></label>
          <label className="block text-sm"><span className="text-slate-600">Presale price ($)</span><input type="number" step="0.01" className={cls} {...lockedProps} value={p.presale_price ?? ''} onChange={e => editP({ presale_price: num(e.target.value) })} /></label>
          <label className="block text-sm"><span className="text-slate-600">Regular price ($)</span><input type="number" step="0.01" className={cls} {...lockedProps} value={p.regular_price ?? ''} onChange={e => editP({ regular_price: num(e.target.value) })} /></label>
        </div>
        <p className="text-xs text-slate-500">Presale deadlines are proposed until you confirm them.</p>
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="flex justify-between items-center"><h2 className="font-semibold">Purchase links and verification</h2><button className="text-sm text-blue-600" onClick={addLink}>+ Add link</button></div>
        <p className="text-xs text-slate-500">Only Verified links count as active purchase destinations. Nothing is verified automatically.</p>
        {ls.map(l => (
          <div key={l.id} className="border rounded-xl p-3 grid gap-2 md:grid-cols-[8rem_1fr_9rem]">
            <div className="text-sm font-medium self-center">{l.platform}</div>
            <input className={cls} placeholder="https://…" value={l.url ?? ''} onChange={e => editL(l.id, { url: e.target.value, ...(l.verification_status === 'verified' ? { verification_status: 'pending', last_verified_at: null } : {}) })} />
            <select className={cls} value={l.verification_status} onChange={e => verify(l, e.target.value)}>{VERIFY.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
            <div className="md:col-span-3 flex gap-2 items-center">
              <input className={cls} placeholder="Notes" value={l.notes ?? ''} onChange={e => editL(l.id, { notes: e.target.value })} />
              <span className="text-xs text-slate-500 whitespace-nowrap">{l.last_verified_at ? 'Verified ' + l.last_verified_at.slice(0, 10) : 'Never verified'}</span>
            </div>
          </div>))}
      </section>

      {chs.length > 0 && (
        <section className="bg-white rounded-2xl border p-4 space-y-3">
          <h2 className="font-semibold">Course chapters</h2>
          <p className="text-xs text-slate-500">Do not promise specific credit score increases, removal of accurate information, or funding approval.</p>
          {chs.map(c => (
            <details key={c.id} className="border rounded-xl p-3">
              <summary className="cursor-pointer text-sm font-medium">Chapter {c.chapter_number}: {c.title} <span className="text-slate-500 font-normal">({nice(c.completion_status)})</span></summary>
              <div className="grid gap-2 mt-3">
                <input className={cls} value={c.title} onChange={e => editC(c.id, { title: e.target.value })} />
                <textarea className={cls} rows={2} placeholder="Description" value={c.description ?? ''} onChange={e => editC(c.id, { description: e.target.value })} />
                <textarea className={cls} rows={5} placeholder="Lesson content" value={c.lesson_content ?? ''} onChange={e => editC(c.id, { lesson_content: e.target.value })} />
                <input className={cls} placeholder="Video link" value={c.video_url ?? ''} onChange={e => editC(c.id, { video_url: e.target.value })} />
                <select className={cls} value={c.completion_status} onChange={e => editC(c.id, { completion_status: e.target.value }, true)}>
                  {['not_started', 'in_progress', 'completed'].map(s => <option key={s} value={s}>{nice(s)}</option>)}</select>
                <textarea className={cls} rows={2} placeholder="Notes" value={c.notes ?? ''} onChange={e => editC(c.id, { notes: e.target.value })} />
              </div>
            </details>))}
        </section>)}

      <section className="flex gap-4 text-sm">
        <button className="text-blue-600" onClick={duplicate}>Duplicate product</button>
        <button className="text-slate-600" onClick={() => editP({ archived: !p.archived }, true)}>{p.archived ? 'Unarchive' : 'Archive'} product</button>
      </section>
    </div>
  )
}
