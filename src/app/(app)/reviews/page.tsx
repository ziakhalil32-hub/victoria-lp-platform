import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewReview from '@/components/NewReview'
import ReviewTemplate from '@/components/ReviewTemplate'
import TestimonialList from '@/components/TestimonialList'
export const dynamic = 'force-dynamic'
const nice = (s: string) => s.replace(/_/g, ' ')
export default async function Reviews({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const tab = f.tab === 'testimonials' ? 'testimonials' : 'amazon'
  const sb = await createClient()
  const [products, reviews, tests] = await Promise.all([
    sb.from('products').select('id,name').is('deleted_at', null).order('launch_date'),
    sb.from('reviews').select('id,purchase_date,eligibility,request_date,review_received,rating,feedback_date,has_connection,products(name),customers(first_name,last_name)').is('deleted_at', null).order('created_at', { ascending: false }),
    sb.from('testimonials').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
  ])
  const err = [products, reviews, tests].find(r => r.error)?.error
  const R: any[] = reviews.data ?? []
  const received = R.filter(r => r.review_received).length, requested = R.filter(r => r.request_date).length
  const rated = R.filter(r => r.review_received && r.rating != null)
  const tabCls = (t: string) => `rounded-lg px-3 py-2 text-sm border ${tab === t ? 'bg-slate-900 text-white' : 'bg-white'}`
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">Amazon Reviews & Feedback</h1><p className="text-slate-500">Honest customer feedback only. Amazon reviews and course testimonials are kept in separate tabs.</p></header>
      <div className="flex gap-2"><Link href="/reviews" className={tabCls('amazon')}>Amazon reviews</Link><Link href="/reviews?tab=testimonials" className={tabCls('testimonials')}>Course testimonials</Link></div>
      {err && <p className="text-red-600 text-sm">Could not load: {err.message}</p>}
      {tab === 'amazon' ? (<>
        <section className="grid gap-3 grid-cols-2 md:grid-cols-4">{[['Review records', R.length], ['Requests sent', requested], ['Reviews received', received], ['Average rating', rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1) + ' (' + rated.length + ' rated)' : 'Not recorded']].map(([l, v]) => <div key={l as string} className="bg-white border rounded-2xl p-3"><div className="text-xs text-slate-500">{l}</div><div className="text-xl font-semibold">{v}</div></div>)}</section>
        <ReviewTemplate />
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm space-y-1"><b>Compliance rules</b>
          <ul className="list-disc pl-5"><li>Never offer anything in exchange for a review.</li><li>Never ask for a specific star rating.</li><li>Never pressure anyone to change a negative review.</li><li>Never make customer support depend on a review.</li><li>Do not ask people with a personal or financial connection to you. Flag them on their record and requests are blocked.</li></ul></div>
        <NewReview products={(products.data ?? []) as any} />
        {R.length === 0 ? <p className="text-sm text-slate-500">No review records yet. Nothing is invented. Add one when a customer buys.</p> : (
          <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-sm">
            <thead className="text-left text-slate-500"><tr>{['Product', 'Customer', 'Purchased', 'Eligibility', 'Request sent', 'Review received', 'Rating'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{R.map(r => <tr key={r.id} className="border-t hover:bg-slate-50"><td className="p-3"><Link href={`/reviews/${r.id}`} className="text-blue-600">{r.products?.name}</Link></td>
              <td className="p-3">{[r.customers?.first_name, r.customers?.last_name].filter(Boolean).join(' ') || '–'}</td><td className="p-3">{r.purchase_date ?? '–'}</td><td className="p-3">{r.has_connection ? 'connection: do not ask' : nice(r.eligibility)}</td>
              <td className="p-3">{r.request_date ?? '–'}</td><td className="p-3">{r.review_received ? 'Yes' + (r.feedback_date ? ' (' + r.feedback_date + ')' : '') : 'No'}</td><td className="p-3">{r.rating ?? 'Not recorded'}</td></tr>)}</tbody></table></div>)}
      </>) : <TestimonialList rows={tests.data ?? []} products={products.data ?? []} />}
    </div>
  )
}
