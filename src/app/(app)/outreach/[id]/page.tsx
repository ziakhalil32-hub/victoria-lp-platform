import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PartnershipEditor from '@/components/PartnershipEditor'
export const dynamic = 'force-dynamic'
export default async function PartnershipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [p, log] = await Promise.all([sb.from('partnerships').select('*').eq('id', id).is('deleted_at', null).maybeSingle(), sb.from('outreach_interactions').select('*').eq('partnership_id', id).is('deleted_at', null).order('interaction_date', { ascending: false }).order('created_at', { ascending: false })])
  if (!p.data) notFound()
  return <div className="space-y-4"><Link href="/outreach" className="text-sm text-blue-600">← All organizations</Link><PartnershipEditor partnership={p.data} log={log.data ?? []} /></div>
}
