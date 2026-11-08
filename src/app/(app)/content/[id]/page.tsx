import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContentEditor from '@/components/ContentEditor'
export const dynamic = 'force-dynamic'
export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const [c, products, versions, links] = await Promise.all([
    sb.from('content').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
    sb.from('products').select('id,name').is('deleted_at', null),
    sb.from('content_platform_versions').select('*').eq('content_id', id).is('deleted_at', null),
    sb.from('v_active_links').select('product_id,platform,url'),
  ])
  if (!c.data) notFound()
  return (
    <div className="space-y-4">
      <Link href="/content" className="text-sm text-blue-600">← All content</Link>
      <ContentEditor content={c.data} products={products.data ?? []} versions={versions.data ?? []} verifiedLinks={links.data ?? []} />
    </div>
  )
}
