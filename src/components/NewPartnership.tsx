'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function NewPartnership() {
  const router = useRouter()
  return <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm whitespace-nowrap" onClick={async () => {
    const { data, error } = await createClient().from('partnerships').insert({ organization: 'New organization' }).select('id').single()
    if (error || !data) { alert('Could not create: ' + (error?.message ?? 'unknown')); return }
    router.push('/outreach/' + data.id)
  }}>+ Add organization</button>
}
