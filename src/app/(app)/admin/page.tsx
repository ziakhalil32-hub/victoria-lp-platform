import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/SettingsForm'
import { TABLES, isAdmin } from '@/lib/adminData'
export const dynamic = 'force-dynamic'
const COUNT = ['products','tasks','content','customers','orders','payments','expenses','subscribers','email_campaigns','marketing_assets','reports','events','partnerships','reviews']
const nameOf = (r: any) => { const d = r.new_data ?? r.old_data ?? {}; return d.title || d.name || d.order_number || d.organization || d.email || [d.first_name, d.last_name].filter(Boolean).join(' ') || '' }
export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !(await isAdmin(sb))) return <div className="space-y-2"><h1 className="text-2xl font-semibold">Settings & Administration</h1><p className="text-sm text-slate-600">Only the owner or an admin can open this page.</p></div>
  const t0 = Date.now()
  const ping = await sb.from('products').select('id', { count: 'exact', head: true })
  const ms = Date.now() - t0
  let log = sb.from('activity_logs').select('id,at,user_id,table_name,action,record_id,new_data,old_data').order('at', { ascending: false }).limit(100)
  if (f.table) log = log.eq('table_name', f.table)
  const [storage, counts, settings, logs, profiles, unverified] = await Promise.all([
    sb.storage.from('marketing-assets').list('', { limit: 1 }),
    Promise.all(COUNT.map(async t => { const r = await sb.from(t).select('id', { count: 'exact', head: true }).is('deleted_at', null); return [t, r.count, r.error?.message] as const })),
    sb.from('application_settings').select('id,version,value').eq('key', 'content_mix').maybeSingle(),
    log,
    sb.from('profiles').select('id,full_name,role,created_at').order('created_at'),
    sb.from('product_links').select('id', { count: 'exact', head: true }).is('deleted_at', null).neq('verification_status', 'verified'),
  ])
  const ok = (b: boolean) => <span className={b ? 'text-green-700' : 'text-red-600'}>{b ? 'Working' : 'Problem'}</span>
  const tableNames = [...new Set(TABLES)]
  const sel = 'border rounded-lg p-2 bg-white text-sm'
  return (
    <div className="space-y-8">
      <header><h1 className="text-2xl font-semibold">Settings & Administration</h1><p className="text-slate-500">Health check, settings, backups, change history, and users.</p></header>

      <section className="bg-white border rounded-2xl p-4 space-y-2 text-sm"><h2 className="font-semibold">System health</h2>
        <div>Signed in as <b>{user.email}</b></div>
        <div>Database connection: {ok(!ping.error)} {ping.error ? '– ' + ping.error.message : `(${ms} ms)`}</div>
        <div>File storage (marketing-assets bucket): {ok(!storage.error)} {storage.error ? '– ' + storage.error.message : ''}</div>
        <div>Purchase links not yet verified: <b>{unverified.count ?? '?'}</b></div>
        <div className="pt-2 grid gap-x-6 gap-y-1 grid-cols-2 md:grid-cols-4">{counts.map(([t, n, e]) => <div key={t} className="flex justify-between border-b py-1"><span className="text-slate-600">{t.replace(/_/g, ' ')}</span><b>{e ? 'error' : n}</b></div>)}</div>
        <p className="text-xs text-slate-500">Counts show active records only. Archived records are hidden, not erased.</p></section>

      <section className="space-y-2"><h2 className="font-semibold">Settings</h2>
        {settings.data ? <SettingsForm row={settings.data as any} /> : <p className="text-sm text-amber-700">Settings table not found. Run migration 012 in Supabase first.</p>}</section>

      <section className="bg-white border rounded-2xl p-4 space-y-3 text-sm"><h2 className="font-semibold">Backup and export</h2>
        <p className="text-slate-600">Download a complete copy of your records. Do this weekly and before big changes. Uploaded files are not inside it; they stay in Supabase Storage (see the backup guide).</p>
        <a href="/admin/backup" className="inline-block bg-blue-600 text-white rounded-lg px-4 py-2">Download full backup (JSON)</a>
        <details><summary className="cursor-pointer text-blue-600">Export one table as CSV (opens in Excel)</summary><div className="flex flex-wrap gap-2 pt-3">{tableNames.map(t => <a key={t} href={`/admin/export/${t}`} className="border rounded-lg px-2 py-1 text-xs bg-white">{t}</a>)}</div></details></section>

      <section className="bg-white border rounded-2xl p-4 space-y-2 text-sm"><h2 className="font-semibold">Users</h2>
        {(profiles.data ?? []).map((p: any) => <div key={p.id} className="flex justify-between border-b py-1"><span>{p.full_name || 'No name'} <span className="text-xs text-slate-400">{p.id.slice(0, 8)}{p.id === user.id ? ' (you)' : ''}</span></span><b>{p.role}</b></div>)}
        <p className="text-xs text-slate-500">New accounts are created in Supabase under Authentication → Users and start as read-only “viewer.” To give someone edit access, run this in the Supabase SQL Editor with their full id: <code>update profiles set role = &#39;editor&#39; where id = &#39;paste-id&#39;;</code></p></section>

      <section className="space-y-2"><div className="flex justify-between items-center flex-wrap gap-2"><h2 className="font-semibold">Change history (latest 100)</h2>
        <form className="flex gap-2"><select name="table" defaultValue={f.table ?? ''} className={sel}><option value="">All tables</option>{tableNames.filter(t => t !== 'activity_logs').map(t => <option key={t}>{t}</option>)}</select><button className="bg-slate-800 text-white rounded-lg px-3 text-sm">Filter</button>{f.table && <Link href="/admin" className="text-sm text-blue-600 py-2">Clear</Link>}</form></div>
        {logs.error && <p className="text-sm text-red-600">Could not load: {logs.error.message}</p>}
        <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr>{['When', 'Who', 'What', 'Record'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(logs.data ?? []).map((l: any) => { const arch = l.action === 'UPDATE' && l.new_data?.deleted_at && !l.old_data?.deleted_at
            return <tr key={l.id} className="border-t"><td className="p-3 whitespace-nowrap">{new Date(l.at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
              <td className="p-3">{l.user_id === user.id ? 'You' : l.user_id ? l.user_id.slice(0, 8) : 'System'}</td><td className="p-3">{arch ? 'Archived' : l.action === 'INSERT' ? 'Created' : l.action === 'DELETE' ? 'Deleted' : 'Updated'} in {l.table_name.replace(/_/g, ' ')}</td><td className="p-3 text-slate-600">{nameOf(l)}</td></tr> })}</tbody></table></div></section>
    </div>
  )
}
