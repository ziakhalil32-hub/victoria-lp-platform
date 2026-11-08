import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TargetCard from '@/components/TargetCard'
import EngagementLog from '@/components/EngagementLog'
import { addDays, chicagoToday, chicagoDay, mondayOf, startOf, endOf } from '@/lib/dates'
export const dynamic = 'force-dynamic'
const PLATFORMS = ['Facebook', 'Instagram', 'TikTok']
export default async function Social({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const today = chicagoToday()
  const platform = PLATFORMS.find(p => p.toLowerCase() === (f.p ?? '').toLowerCase()) ?? 'Facebook'
  const ws = /^\d{4}-\d{2}-\d{2}$/.test(f.w ?? '') ? mondayOf(f.w!) : mondayOf(today)
  const we = addDays(ws, 6)
  const sb = await createClient()
  const [targets, pub, eng, pending, upcoming] = await Promise.all([
    sb.from('social_targets').select('*').eq('platform', platform).is('deleted_at', null).order('sort_order'),
    sb.from('content').select('id,title,content_type,published_at').eq('platform', platform).eq('status', 'published').is('deleted_at', null).gte('published_at', startOf(addDays(we, -13))).lte('published_at', endOf(we)),
    sb.from('social_engagement').select('*').eq('platform', platform).is('deleted_at', null).gte('log_date', ws).lte('log_date', we).order('log_date'),
    sb.from('social_engagement').select('questions_pending,follow_up_status').eq('platform', platform).is('deleted_at', null),
    sb.from('content').select('id,title,scheduled_for,status').eq('platform', platform).is('deleted_at', null).in('status', ['approved', 'scheduled']).gte('scheduled_for', startOf(today)).order('scheduled_for').limit(8),
  ])
  const err = [targets, pub, eng, pending, upcoming].find(r => r.error)?.error
  const P: any[] = pub.data ?? []; const E: any[] = eng.data ?? []
  const sum = (k: string) => E.reduce((s, r) => s + Number(r[k] ?? 0), 0)
  const openQ = (pending.data ?? []).filter((r: any) => r.follow_up_status === 'pending').length
  const loggedDays = new Set(E.map(r => r.log_date)).size
  const qs = (o: Record<string, string>) => '?' + new URLSearchParams({ p: platform, w: ws, ...o }).toString()
  const defaultDate = today >= ws && today <= we ? today : we
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">Social Media</h1><p className="text-slate-500">Planning and tracking only. Nothing is posted from this app. A post counts as published only after you mark it Published in the Content Studio.</p></header>
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">{PLATFORMS.map(p => <Link key={p} href={qs({ p })} className={`rounded-lg px-3 py-2 text-sm border ${p === platform ? 'bg-slate-900 text-white' : 'bg-white'}`}>{p}</Link>)}</div>
        <div className="flex items-center gap-2 text-sm"><Link href={qs({ w: addDays(ws, -7) })} className="border rounded-lg px-3 py-1 bg-white">←</Link><b>{ws} to {we}</b><Link href={qs({ w: addDays(ws, 7) })} className="border rounded-lg px-3 py-1 bg-white">→</Link></div>
      </div>
      {err && <p className="text-sm text-red-600">Could not load: {err.message}</p>}
      <section className="grid gap-3 md:grid-cols-3">
        {(targets.data ?? []).map((t: any) => {
          const from = addDays(we, -(t.period_days - 1))
          const rows = P.filter(c => t.content_types.includes(c.content_type) && chicagoDay(c.published_at) >= from)
          const count = t.distinct_days ? new Set(rows.map(c => chicagoDay(c.published_at))).size : rows.length
          return <TargetCard key={t.id} t={t} published={count} titles={rows.map(c => c.title)} />
        })}
      </section>
      <p className="text-xs text-slate-500">Counted by each content item’s main platform and content type in the Content Studio. Short-form videos count toward the platform you chose for that item. Targets are starting goals from the plan; change any number.</p>
      <section className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[['Comments handled', sum('comments')], ['Direct messages', sum('direct_messages')], ['Inquiries', sum('inquiries')], ['Days logged', `${loggedDays} of 7`], ['Follow-ups pending (all time)', openQ]].map(([l, v]) => <div key={l as string} className="bg-white border rounded-2xl p-3"><div className="text-xs text-slate-500">{l}</div><div className="text-xl font-semibold">{v}</div></div>)}
      </section>
      <EngagementLog key={platform + ws} platform={platform} rows={E} defaultDate={defaultDate} />
      <section className="bg-white border rounded-2xl p-4 space-y-1 text-sm"><b>Approved or scheduled, coming up</b>
        {(upcoming.data ?? []).length === 0 && <p className="text-slate-500">Nothing approved or scheduled for {platform}.</p>}
        {(upcoming.data ?? []).map((c: any) => <Link key={c.id} href={`/content/${c.id}`} className="block text-blue-600">{c.scheduled_for.slice(0, 10)} · {c.title}</Link>)}</section>
    </div>
  )
}
