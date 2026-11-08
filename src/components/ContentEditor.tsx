'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
import Attachments from '@/components/Attachments'

type Row = Record<string, any>
const STATUSES = ['idea','planned','drafting','ready_for_review','pending_approval','approved','scheduled','published','needs_revision','archived']
const PLATFORMS = ['TikTok','Instagram','Facebook','Email','Website','Other']
const TYPES = ['Short-form video','TikTok video','Instagram Reel','Instagram Story','Instagram carousel','Facebook post','Facebook Reel','Educational post','Promotional flyer','Email content','Live session topic','Website content','Event announcement']
const PURPOSES = [['educate_entertain','Educate / entertain / story'],['trust','Build trust (experience or demo)'],['promote','Promote purchase or preorder']]
const METRICS = [['views','Views'],['reach','Reach'],['likes','Likes'],['comments','Comments'],['shares','Shares'],['saves','Saves'],['link_clicks','Link clicks'],['leads_generated','Leads generated'],['orders_generated','Orders generated']]
const cls = 'w-full border rounded-lg p-2 bg-white'
const nice = (s: string) => s.replace(/_/g, ' ')
const toLocal = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }

export default function ContentEditor({ content, products, versions, verifiedLinks, attachments }: { content: Row; products: Row[]; versions: Row[]; verifiedLinks: Row[]; attachments: Row[] }) {
  const router = useRouter()
  const a = useAutosave()
  const [c, setC] = useState<Row>(content)
  const [vs, setVs] = useState<Record<string, Row>>(Object.fromEntries(versions.map(v => [v.platform, v])))
  const creating = useRef<Record<string, boolean>>({}); const latest = useRef<Record<string, Row>>({})
  a.register('content', c.id, content.version); versions.forEach(v => a.register('content_platform_versions', v.id, v.version))

  const edit = (patch: Row, imm = false) => { setC(x => ({ ...x, ...patch })); a.save('content', c.id, patch, imm) }
  const int = (v: string) => (v === '' ? null : Math.max(0, Math.floor(Number(v))))

  function editVersion(platform: string, patch: Row) {
    const existing = vs[platform]
    if (existing) { setVs(x => ({ ...x, [platform]: { ...existing, ...patch } })); a.save('content_platform_versions', existing.id, patch, false); return }
    setVs(x => ({ ...x, [platform]: { platform, ...patch } }))
    latest.current[platform] = { ...latest.current[platform], ...patch }
    if (creating.current[platform]) return
    creating.current[platform] = true; a.setStatus('saving')
    a.sb.from('content_platform_versions').insert({ content_id: c.id, platform, ...latest.current[platform] }).select().single().then(({ data, error }) => {
      creating.current[platform] = false
      if (error || !data) { a.setStatus('failed'); a.setMsg('Could not save the ' + platform + ' version: ' + (error?.message ?? 'unknown')); return }
      a.register('content_platform_versions', data.id, data.version); setVs(x => ({ ...x, [platform]: data })); a.setStatus('saved')
    })
  }

  async function changeStatus(s: string) {
    const needs: Record<string, string> = { approved: 'Do you approve this content?', scheduled: 'Do you approve this content for scheduling? (Nothing is posted automatically; you still publish it yourself.)', published: 'Confirm this content was actually published?' }
    if (needs[s]) {
      if (!confirm(needs[s])) return
      const { error } = await a.sb.from('approvals').insert({ entity_table: 'content', entity_id: c.id, action: 'content_' + s, decision: 'approved' })
      if (error) { a.setStatus('failed'); a.setMsg('Could not record approval: ' + error.message); return }
    }
    edit({ status: s, ...(s === 'published' && !c.published_at ? { published_at: new Date().toISOString() } : {}) }, true)
  }

  async function duplicate() {
    const { id, created_at, updated_at, created_by, updated_by, version, deleted_at, published_at, ...rest } = c
    const { data, error } = await a.sb.from('content').insert({ ...rest, title: c.title + ' (copy)', status: 'idea', scheduled_for: null }).select('id').single()
    if (error || !data) { alert('Could not duplicate: ' + (error?.message ?? 'unknown')); return }
    router.push('/content/' + data.id)
  }

  const mine = verifiedLinks.filter(l => l.product_id === c.product_id)
  const T = (label: string, k: string, rows = 0) => (
    <label className="block text-sm"><span className="text-slate-600">{label}</span>
      {rows ? <textarea className={cls} rows={rows} value={c[k] ?? ''} onChange={e => edit({ [k]: e.target.value })} /> : <input className={cls} value={c[k] ?? ''} onChange={e => edit({ [k]: e.target.value })} />}</label>)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">{c.title || 'Untitled content'}</h1><p className="text-sm text-slate-500">Changes save automatically.</p></div>
        <span className={`text-sm ${a.status === 'failed' ? 'text-red-600' : a.status === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>{statusLabel[a.status]}</span>
      </div>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}

      <section className="bg-white rounded-2xl border p-4 grid gap-3 md:grid-cols-2">
        {T('Title', 'title')}
        <label className="block text-sm"><span className="text-slate-600">Product</span>
          <select className={cls} value={c.product_id ?? ''} onChange={e => edit({ product_id: e.target.value || null }, true)}><option value="">None</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Main platform</span>
          <select className={cls} value={c.platform ?? ''} onChange={e => edit({ platform: e.target.value || null }, true)}><option value="">Not set</option>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Content type</span>
          <select className={cls} value={c.content_type ?? ''} onChange={e => edit({ content_type: e.target.value || null }, true)}><option value="">Not set</option>{TYPES.map(p => <option key={p}>{p}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Status</span>
          <select className={cls} value={c.status} onChange={e => changeStatus(e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{nice(s)}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Purpose (for the 3 / 1 / 1 guideline)</span>
          <select className={cls} value={c.purpose ?? ''} onChange={e => edit({ purpose: e.target.value || null }, true)}><option value="">Not tagged</option>{PURPOSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600">Scheduled for</span>
          <input type="datetime-local" className={cls} value={toLocal(c.scheduled_for)} onChange={e => edit({ scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null }, true)} /></label>
        <div className="text-sm"><span className="text-slate-600">Actually published</span><div className="p-2">{c.published_at ? c.published_at.slice(0, 10) : 'Not published'}</div></div>
        {T('Topic', 'topic')}
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Original script and caption</h2>
        {T('Opening hook', 'hook', 2)}{T('Main script', 'script', 8)}{T('Original caption', 'caption', 4)}{T('Hashtags', 'hashtags')}{T('Call to action', 'call_to_action')}
        <div className="grid gap-2 md:grid-cols-[1fr_16rem]">
          {T('Purchase or enrollment link', 'link_url')}
          <label className="block text-sm"><span className="text-slate-600">Pick a verified link</span>
            <select className={cls} value="" onChange={e => e.target.value && edit({ link_url: e.target.value }, true)}>
              <option value="">{mine.length ? 'Choose…' : 'No verified links for this product'}</option>{mine.map(l => <option key={l.url} value={l.url}>{l.platform}</option>)}</select></label>
        </div>
        {c.link_url && !verifiedLinks.some(l => l.url === c.link_url) && <p className="text-xs text-amber-600">This link is not a verified purchase link yet. Check it before you publish.</p>}
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-4">
        <div><h2 className="font-semibold">Platform versions</h2><p className="text-xs text-slate-500">Each platform has its own caption. Your original caption above is never overwritten.</p></div>
        {['facebook', 'instagram', 'tiktok'].map(pl => (
          <div key={pl} className="space-y-2">
            <div className="flex justify-between text-sm"><b className="capitalize">{pl}</b>
              <button className="text-blue-600" onClick={() => { if (!vs[pl]?.caption || confirm('Replace this ' + pl + ' caption with the original?')) editVersion(pl, { caption: c.caption ?? '', hashtags: c.hashtags ?? '' }) }}>Start from original</button></div>
            <textarea className={cls} rows={3} placeholder={pl + ' caption'} value={vs[pl]?.caption ?? ''} onChange={e => editVersion(pl, { caption: e.target.value })} />
            <input className={cls} placeholder={pl + ' hashtags'} value={vs[pl]?.hashtags ?? ''} onChange={e => editVersion(pl, { hashtags: e.target.value })} />
          </div>))}
      </section>

      <Attachments table="content" id={c.id} initial={attachments as any} title="Media attachments" hint="Images, videos, PDFs, flyers, and other campaign materials for this post." />

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Results</h2><p className="text-xs text-slate-500">Leave blank if not recorded. Only enter numbers you have actually seen.</p>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {METRICS.map(([k, l]) => <label key={k} className="block text-sm"><span className="text-slate-600">{l}</span>
            <input type="number" min="0" className={cls} value={c[k] ?? ''} onChange={e => edit({ [k]: int(e.target.value) })} /></label>)}
          <label className="block text-sm"><span className="text-slate-600">Revenue ($)</span>
            <input type="number" min="0" step="0.01" className={cls} value={c.revenue_generated ?? ''} onChange={e => edit({ revenue_generated: e.target.value === '' ? null : Number(e.target.value) })} /></label>
        </div>
        {T('Notes', 'notes', 2)}
      </section>
      <button className="text-sm text-blue-600" onClick={duplicate}>Duplicate this content</button>
    </div>
  )
}
