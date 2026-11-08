import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportEditor from '@/components/ReportEditor'
export const dynamic = 'force-dynamic'
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data } = await sb.from('reports').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
  if (!data) notFound()
  return <div className="space-y-4"><Link href="/reports" className="text-sm text-blue-600 print:hidden">← All reports</Link><ReportEditor report={data} /></div>
}
