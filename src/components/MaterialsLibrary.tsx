'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
type P = { id: string; name: string; slug: string | null }
type A = { id: string; product_id: string; folder: string; name: string; description: string | null; storage_path: string; mime_type: string | null; size_bytes: number | null; created_at: string; version: number }
const MAX = 50 * 1024 * 1024
const BLOCKED = /\.(exe|bat|cmd|sh|js|mjs|html?|svg|php|jar|msi|scr|com)$/i
export const FOLDERS: Record<string, string[]> = {
  'turn-the-page': ['Original cover', 'Thanksgiving launch flyer', 'Product description', 'Sample activity pages', 'Author photographs', 'Promotional videos', 'Customer feedback', 'Purchase links'],
  'understanding-your-business': ['Original cover', 'Presale flyer', 'Book description', 'Table of contents', 'Sample pages', 'Workshop photographs and videos', 'Author biography', 'Purchase links'],
  'the-credit-blueprint': ['Original cover', 'Presale flyer', 'Course description', 'Six-chapter outline', 'Sample educational materials', 'Training videos', 'Enrollment links'],
}
const kb = (n: number | null) => (n == null ? '' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')
const safe = (n: string) => n.replace(/[^\w.\-]+/g, '_').slice(-80)

export default function MaterialsLibrary({ products, assets, productId, folder }: { products: P[]; assets: A[]; productId: string; folder: string }) {
  const router = useRouter(); const sb = useRef(createClient()).current
  const product = products.find(p => p.id === productId)
  const folders = [...(FOLDERS[product?.slug ?? ''] ?? []), 'Other']
  const [up, setUp] = useState({ folder: folder || folders[0], description: '' }); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const c = 'border rounded-lg p-2 bg-white text-sm'

  function check(f: File) {
    if (f.size > MAX) return 'That file is over 50 MB. Compress it or upload a smaller version.'
    if (BLOCKED.test(f.name)) return 'This file type is not allowed (programs, HTML, and SVG files are blocked for safety).'
    return ''
  }
  async function upload() {
    const f = fileRef.current?.files?.[0]; if (!f) { setMsg('Choose a file first.'); return }
    const bad = check(f); if (bad) { setMsg(bad); return }
    setBusy(true); setMsg('Uploading…')
    const path = `${productId}/${crypto.randomUUID()}-${safe(f.name)}`
    const { error: e1 } = await sb.storage.from('marketing-assets').upload(path, f, { contentType: f.type || undefined })
    if (e1) { setBusy(false); setMsg('Upload failed: ' + e1.message); return }
    const { error: e2 } = await sb.from('marketing_assets').insert({ product_id: productId, folder: up.folder, name: f.name, description: up.description || null, storage_path: path, mime_type: f.type || null, size_bytes: f.size })
    if (e2) { await sb.storage.from('marketing-assets').remove([path]); setBusy(false); setMsg('Could not save the file record: ' + e2.message); return }
    setBusy(false); setMsg('Uploaded and saved.'); if (fileRef.current) fileRef.current.value = ''; setUp({ ...up, description: '' }); router.refresh()
  }
  async function open(a: A, download: boolean) {
    const { data, error } = await sb.storage.from('marketing-assets').createSignedUrl(a.storage_path, 300, download ? { download: a.name } : undefined)
    if (error || !data) { setMsg('Could not open the file: ' + (error?.message ?? 'unknown')); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }
  async function rename(a: A) {
    const name = prompt('New file name:', a.name); if (!name || name === a.name) return
    const { error } = await sb.from('marketing_assets').update({ name: name.trim() }).eq('id', a.id).eq('version', a.version)
    if (error) { setMsg(error.message); return }
    router.refresh()
  }
  async function describe(a: A) {
    const d = prompt('Description:', a.description ?? ''); if (d === null) return
    const { error } = await sb.from('marketing_assets').update({ description: d || null }).eq('id', a.id).eq('version', a.version)
    if (error) { setMsg(error.message); return }
    router.refresh()
  }
  async function move(a: A, to: string) {
    const { error } = await sb.from('marketing_assets').update({ folder: to }).eq('id', a.id).eq('version', a.version)
    if (error) { setMsg(error.message); return }
    router.refresh()
  }
  async function replace(a: A, f: File | undefined) {
    if (!f) return
    const bad = check(f); if (bad) { setMsg(bad); return }
    setMsg('Replacing…')
    const path = `${a.product_id}/${crypto.randomUUID()}-${safe(f.name)}`
    const { error: e1 } = await sb.storage.from('marketing-assets').upload(path, f, { contentType: f.type || undefined })
    if (e1) { setMsg('Upload failed: ' + e1.message); return }
    const { error: e2 } = await sb.from('asset_versions').insert({ asset_id: a.id, name: a.name, storage_path: a.storage_path, mime_type: a.mime_type, size_bytes: a.size_bytes })
    if (e2) { await sb.storage.from('marketing-assets').remove([path]); setMsg('Could not keep the old version: ' + e2.message); return }
    const { error: e3 } = await sb.from('marketing_assets').update({ storage_path: path, name: f.name, mime_type: f.type || null, size_bytes: f.size }).eq('id', a.id).eq('version', a.version)
    if (e3) { setMsg('Could not save the replacement (it may have changed on another device). Refresh and try again.'); return }
    setMsg('Replaced. The previous version is kept in the history.'); router.refresh()
  }
  async function archive(a: A) {
    if (!confirm(`Archive "${a.name}"? It is hidden, and the file itself is kept in storage.`)) return
    const { error } = await sb.from('marketing_assets').update({ deleted_at: new Date().toISOString() }).eq('id', a.id)
    if (error) { setMsg(error.message); return }
    router.refresh()
  }
  const isImg = (a: A) => (a.mime_type ?? '').startsWith('image/')

  return (
    <div className="space-y-5">
      <div className="bg-white border rounded-2xl p-4 space-y-3">
        <b className="text-sm">Upload to {product?.name}</b>
        <div className="grid gap-2 md:grid-cols-[14rem_1fr_auto]">
          <select className={c} value={up.folder} onChange={e => setUp({ ...up, folder: e.target.value })}>{folders.map(f => <option key={f}>{f}</option>)}</select>
          <input className={c} placeholder="Description (optional)" value={up.description} onChange={e => setUp({ ...up, description: e.target.value })} />
          <button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" onClick={upload}>{busy ? 'Working…' : 'Upload'}</button>
        </div>
        <input ref={fileRef} type="file" className="text-sm" />
        <p className="text-xs text-slate-500">Up to 50 MB per file. Files are private and only open through short-lived links after you sign in.</p>
        {msg && <p className="text-sm text-slate-700">{msg}</p>}
      </div>
      {assets.length === 0 ? <p className="text-sm text-slate-500">No files here yet. Upload your first one above.</p> : (
        <ul className="grid gap-3 md:grid-cols-2">{assets.map(a => (
          <li key={a.id} className="bg-white border rounded-2xl p-4 space-y-2">
            <div className="flex justify-between gap-2"><b className="text-sm break-all">{a.name}</b><span className="text-xs text-slate-500 whitespace-nowrap">{kb(a.size_bytes)}</span></div>
            <div className="text-xs text-slate-500">{a.folder} · added {a.created_at.slice(0, 10)}{isImg(a) ? ' · image' : ''}</div>
            {a.description && <p className="text-sm">{a.description}</p>}
            <div className="flex flex-wrap gap-3 text-sm">
              <button className="text-blue-600" onClick={() => open(a, false)}>Preview</button><button className="text-blue-600" onClick={() => open(a, true)}>Download</button>
              <button className="text-slate-600" onClick={() => rename(a)}>Rename</button><button className="text-slate-600" onClick={() => describe(a)}>Description</button>
              <label className="text-slate-600 cursor-pointer">Replace<input type="file" className="hidden" onChange={e => { replace(a, e.target.files?.[0]); e.target.value = '' }} /></label>
              <button className="text-slate-400 hover:text-red-600" onClick={() => archive(a)}>Archive</button>
            </div>
            <select className="border rounded p-1 text-xs bg-white" value={a.folder} onChange={e => move(a, e.target.value)}>{[...new Set([...folders, a.folder])].map(f => <option key={f}>{f}</option>)}</select>
          </li>))}</ul>)}
    </div>
  )
}
