import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EventEditor from '@/components/EventEditor'
export const dynamic = 'force-dynamic'
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [e, products] = await Promise.all([sb.from('events').select('*').eq('id', id).is('deleted_at', null).maybeSingle(), sb.from('products').select('id,name').is('deleted_at', null)])
  if (!e.data) notFound()
  return <div className="space-y-4"><Link href="/events" className="text-sm text-blue-600">← All events</Link><EventEditor event={e.data} products={products.data ?? []} /></div>
}
