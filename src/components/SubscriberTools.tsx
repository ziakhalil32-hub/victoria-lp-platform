'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseCsv } from '@/lib/parseCsv'
type L = { id: string; name: string }
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
const okEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
export default function SubscriberTools({ lists }: { lists: L[] }) {
  const router = useRouter(); const sb = createClient()
  const [mode, setMode] = useState<'' | 'add' | 'import'>(''); const [list, setList] = useState(lists[0]?.id ?? '')
  const [f, setF] = useState({ first: '', last: '', email: '', source: '' }); const [consent, setConsent] = useState(false)
  const [file, setFile] = useState<File | null>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const c = 'border rounded-lg p-2 bg-white text-sm w-full'
  const consentFields = (source: string) => ({ consent_status: consent ? 'consented' : 'unknown', consent_date: consent ? today() : null, consent_note: consent ? 'Confirmed by owner when added' : null, signup_source: source || null, signup_date: today() })
  async function suppressed() { const { data } = await sb.from('email_suppressions').select('email').is('deleted_at', null); return new Set((data ?? []).map((x: any) => x.email)) }
  async function add() {
    const email = f.email.trim().toLowerCase(); if (!okEmail(email)) { setMsg('Enter a valid email.'); return }
    setBusy(true); setMsg('')
    const sup = await suppressed()
    const { error } = await sb.from('subscribers').insert({ list_id: list, first_name: f.first || null, last_name: f.last || null, email, subscription_status: sup.has(email) ? 'suppressed' : 'subscribed', ...consentFields(f.source || 'Manual entry') })
    setBusy(false)
    if (error) { setMsg(error.code === '23505' ? 'That email is already on this audience.' : 'Could not save: ' + error.message); return }
    setF({ first: '', last: '', email: '', source: '' }); setMsg(sup.has(email) ? 'Added, but this email is on your suppression list, so it will not be eligible.' : 'Added.'); router.refresh()
  }
  async function importCsv() {
    if (!file) { setMsg('Choose a CSV file.'); return }
    setBusy(true); setMsg('')
    const rows = parseCsv(await file.text()); const sup = await suppressed()
    const seen = new Set<string>(); const good: any[] = []; let bad = 0
    for (const r of rows) {
      const email = (r.email ?? r.email_address ?? '').toLowerCase()
      if (!okEmail(email) || seen.has(email)) { bad++; continue }
      seen.add(email)
      good.push({ list_id: list, first_name: r.first_name || r.firstname || r.first || null, last_name: r.last_name || r.lastname || r.last || null, email, subscription_status: sup.has(email) ? 'suppressed' : 'subscribed', ...consentFields('CSV import') })
    }
    if (good.length === 0) { setBusy(false); setMsg('No valid rows found. The file needs a header row with an "email" column (and optionally first_name, last_name).'); return }
    let added = 0
    for (let i = 0; i < good.length; i += 200) {
      const { data, error } = await sb.from('subscribers').upsert(good.slice(i, i + 200), { onConflict: 'list_id,email', ignoreDuplicates: true }).select('id')
      if (error) { setBusy(false); setMsg(`Stopped after ${added} added: ${error.message}`); return }
      added += data?.length ?? 0
    }
    setBusy(false); setFile(null)
    setMsg(`Imported ${added} new. Skipped ${good.length - added} already on this audience and ${bad} invalid or repeated rows.${consent ? '' : ' They are marked consent unknown and are NOT eligible for marketing email until consent is confirmed.'}`); router.refresh()
  }
  if (!mode) return <div className="flex gap-2 flex-wrap"><button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm" onClick={() => setMode('add')}>+ Add subscriber</button><button className="border bg-white rounded-lg px-4 py-2 text-sm" onClick={() => setMode('import')}>Import CSV</button></div>
  return (
    <div className="bg-white border rounded-2xl p-4 space-y-3 w-full">
      <div className="flex gap-3 text-sm"><b>{mode === 'add' ? 'Add subscriber' : 'Import subscribers from CSV'}</b><button className="text-slate-500" onClick={() => { setMode(''); setMsg('') }}>Close</button></div>
      <select className={c} value={list} onChange={e => setList(e.target.value)}>{lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
      {mode === 'add' ? (
        <div className="grid gap-2 md:grid-cols-4"><input className={c} placeholder="First name" value={f.first} onChange={e => setF({ ...f, first: e.target.value })} /><input className={c} placeholder="Last name" value={f.last} onChange={e => setF({ ...f, last: e.target.value })} />
          <input className={c} type="email" placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /><input className={c} placeholder="Signup source" value={f.source} onChange={e => setF({ ...f, source: e.target.value })} /></div>
      ) : <input type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-sm" />}
      <label className="flex gap-2 text-sm items-start"><input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{mode === 'add' ? 'This person' : 'Everyone in this file'} agreed to receive marketing email about this audience’s topic. (Leave unchecked if unsure; they will be saved but not eligible to receive email.)</span></label>
      <p className="text-xs text-slate-500">Only add people with a real reason and permission to hear from you. Do not import unrelated contact lists (for example, daycare families or unrelated business contacts).</p>
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
      <button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" onClick={mode === 'add' ? add : importCsv}>{busy ? 'Working…' : mode === 'add' ? 'Add' : 'Import'}</button>
    </div>
  )
}
