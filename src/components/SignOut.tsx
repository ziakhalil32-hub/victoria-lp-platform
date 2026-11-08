'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function SignOut() {
  const router = useRouter()
  return <button className="text-sm text-slate-300 hover:text-white" onClick={async () => { await createClient().auth.signOut(); router.push('/login'); router.refresh() }}>Sign out</button>
}
