'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function NewCampaign({ listId, productId }: { listId: string; productId: string | null }) {
  const router = useRouter()
  return <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm whitespace-nowrap" onClick={async () => {
    const { data, error } = await createClient().from('email_campaigns').insert({ name: 'New email campaign', list_id: listId, product_id: productId }).select('id').single()
    if (error || !data) { alert('Could not create: ' + (error?.message ?? 'unknown')); return }
    router.push('/email/campaigns/' + data.id)
  }}>+ New campaign</button>
}
