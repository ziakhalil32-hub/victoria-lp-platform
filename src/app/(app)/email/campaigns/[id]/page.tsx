import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CampaignEditor from '@/components/CampaignEditor'
export const dynamic = 'force-dynamic'
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [c, lists, elig] = await Promise.all([
    sb.from('email_campaigns').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
    sb.from('email_lists').select('id,name,product_id').is('deleted_at', null),
    sb.from('v_eligible_subscribers').select('list_id'),
  ])
  if (!c.data) notFound()
  const counts: Record<string, number> = {}; (elig.data ?? []).forEach((s: any) => { counts[s.list_id] = (counts[s.list_id] ?? 0) + 1 })
  return <div className="space-y-4"><Link href="/email" className="text-sm text-blue-600">← Email Marketing</Link><CampaignEditor campaign={c.data} lists={lists.data ?? []} counts={counts} /></div>
}
