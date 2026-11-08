import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SuppressionManager from '@/components/SuppressionManager'
export const dynamic = 'force-dynamic'
export default async function Suppressions() {
  const sb = await createClient()
  const { data, error } = await sb.from('email_suppressions').select('id,email,reason,created_at').is('deleted_at', null).order('created_at', { ascending: false })
  return (
    <div className="space-y-6">
      <header><Link href="/email" className="text-sm text-blue-600">← Email Marketing</Link><h1 className="text-2xl font-semibold">Suppression list</h1><p className="text-slate-500">People who must never receive marketing email from you. Anyone who unsubscribes or complains belongs here.</p></header>
      {error && <p className="text-red-600 text-sm">Could not load: {error.message}</p>}
      <SuppressionManager items={(data ?? []) as any} />
    </div>
  )
}
