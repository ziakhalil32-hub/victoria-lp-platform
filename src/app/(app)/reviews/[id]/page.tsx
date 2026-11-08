import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReviewEditor from '@/components/ReviewEditor'
export const dynamic = 'force-dynamic'
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [r, products, customers] = await Promise.all([sb.from('reviews').select('*').eq('id', id).is('deleted_at', null).maybeSingle(), sb.from('products').select('id,name').is('deleted_at', null), sb.from('customers').select('id,first_name,last_name,email').is('deleted_at', null).order('first_name')])
  if (!r.data) notFound()
  return <div className="space-y-4"><Link href="/reviews" className="text-sm text-blue-600">← All reviews</Link><ReviewEditor review={r.data} products={products.data ?? []} customers={customers.data ?? []} /></div>
}
