'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function NewProduct() {
  const router = useRouter()
  return <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm whitespace-nowrap" onClick={async () => {
    const { data, error } = await createClient().from('products').insert({ name: 'New product' }).select('id').single()
    if (error || !data) { alert('Could not create product: ' + (error?.message ?? 'unknown')); return }
    router.push('/products/' + data.id)
  }}>+ Add product</button>
}
