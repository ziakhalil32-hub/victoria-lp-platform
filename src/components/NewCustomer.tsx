'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function NewCustomer() {
  const router = useRouter()
  return <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm whitespace-nowrap" onClick={async () => {
    const { data, error } = await createClient().from('customers').insert({ first_name: 'New', last_name: 'contact' }).select('id').single()
    if (error || !data) { alert('Could not create: ' + (error?.message ?? 'unknown')); return }
    router.push('/customers/' + data.id)
  }}>+ Add customer or lead</button>
}
