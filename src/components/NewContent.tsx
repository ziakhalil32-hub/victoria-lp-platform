'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function NewContent() {
  const router = useRouter()
  return <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm whitespace-nowrap" onClick={async () => {
    const { data, error } = await createClient().from('content').insert({ title: 'Untitled content' }).select('id').single()
    if (error || !data) { alert('Could not create content: ' + (error?.message ?? 'unknown')); return }
    router.push('/content/' + data.id)
  }}>+ New content</button>
}
