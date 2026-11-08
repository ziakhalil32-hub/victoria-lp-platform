import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProductEditor from '@/components/ProductEditor'
export const dynamic = 'force-dynamic'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [p, links, chapters] = await Promise.all([
    sb.from('products').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
    sb.from('product_links').select('*').eq('product_id', id).is('deleted_at', null).order('created_at'),
    sb.from('course_chapters').select('*').eq('product_id', id).is('deleted_at', null).order('chapter_number'),
  ])
  if (!p.data) notFound()
  return (
    <div className="space-y-4">
      <Link href="/products" className="text-sm text-blue-600">← All products</Link>
      <ProductEditor product={p.data} links={links.data ?? []} chapters={chapters.data ?? []} />
    </div>
  )
}
