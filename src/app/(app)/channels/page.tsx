import { createClient } from '@/lib/supabase/server'
import ChannelsManager from '@/components/ChannelsManager'
import WebsiteItems from '@/components/WebsiteItems'
export const dynamic = 'force-dynamic'
export default async function Channels() {
  const sb = await createClient()
  const [channels, products, brands, items, hist] = await Promise.all([
    sb.from('channel_links').select('*').is('deleted_at', null).order('sort_order').order('created_at'),
    sb.from('products').select('id,name').is('deleted_at', null).order('launch_date'),
    sb.from('brands').select('id,name').is('deleted_at', null).order('name'),
    sb.from('website_items').select('*').is('deleted_at', null).order('sort_order'),
    sb.from('link_verifications').select('channel_id,status,checked_at').order('checked_at', { ascending: false }).limit(300),
  ])
  const err = [channels, products, brands, items, hist].find(r => r.error)?.error
  const C = channels.data ?? []
  const verified = C.filter((c: any) => c.verification_status === 'verified').length
  return (
    <div className="space-y-8">
      <header><h1 className="text-2xl font-semibold">Marketing Channels</h1><p className="text-slate-500">Where you market, what is verified, and what website work is still open. {verified} of {C.length} channels verified.</p></header>
      {err && <p className="text-red-600 text-sm">Could not load: {err.message}{/relation/.test(err.message) ? ' (run migration 013 in Supabase first)' : ''}</p>}
      <ChannelsManager channels={C} products={products.data ?? []} brands={brands.data ?? []} history={hist.data ?? []} />
      <WebsiteItems items={items.data ?? []} />
    </div>
  )
}
