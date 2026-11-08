import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExpenseEditor from '@/components/ExpenseEditor'
export const dynamic = 'force-dynamic'
export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [e, products, files] = await Promise.all([sb.from('expenses').select('*').eq('id', id).is('deleted_at', null).maybeSingle(), sb.from('products').select('id,name').is('deleted_at', null), sb.from('attachments').select('*').eq('entity_table', 'expenses').eq('entity_id', id).is('deleted_at', null).order('created_at', { ascending: false })])
  if (!e.data) notFound()
  return <div className="space-y-4"><Link href="/expenses" className="text-sm text-blue-600">← All expenses</Link><ExpenseEditor expense={e.data} products={products.data ?? []} attachments={files.data ?? []} /></div>
}
