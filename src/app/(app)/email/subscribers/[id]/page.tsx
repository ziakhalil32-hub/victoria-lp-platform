import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubscriberEditor from '@/components/SubscriberEditor'
export const dynamic = 'force-dynamic'
export default async function SubscriberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [s, lists] = await Promise.all([sb.from('subscribers').select('*').eq('id', id).is('deleted_at', null).maybeSingle(), sb.from('email_lists').select('id,name').is('deleted_at', null)])
  if (!s.data) notFound()
  return <div className="space-y-4"><Link href="/email/subscribers" className="text-sm text-blue-600">← All subscribers</Link><SubscriberEditor sub={s.data} lists={lists.data ?? []} /></div>
}
