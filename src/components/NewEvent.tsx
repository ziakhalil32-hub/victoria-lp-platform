'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function NewEvent() {
  const router = useRouter()
  const make = async (name: string, event_type: string) => {
    const { data, error } = await createClient().from('events').insert({ name, event_type }).select('id').single()
    if (error || !data) { alert('Could not create: ' + (error?.message ?? 'unknown')); return }
    router.push('/events/' + data.id)
  }
  return <div className="flex gap-2 flex-wrap"><button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm" onClick={() => make('New event', 'other')}>+ Add event</button><button className="border bg-white rounded-lg px-4 py-2 text-sm" onClick={() => make('Educational workshop (date not set)', 'workshop')}>+ Add workshop</button></div>
}
