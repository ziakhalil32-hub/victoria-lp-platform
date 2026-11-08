'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed' | 'offline'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Shared autosave: text saves after 800 ms pause, other changes save immediately.
// "Saved" appears only after the database confirms. Version check prevents overwriting newer edits.
export function useAutosave() {
  const sb = useRef(createClient()).current
  const [status, setStatus] = useState<SaveState>('idle')
  const [msg, setMsg] = useState('')
  const versions = useRef<Record<string, number>>({})
  const patches = useRef<Record<string, Record<string, unknown>>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pending = useRef(0)

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (pending.current > 0) { e.preventDefault(); e.returnValue = '' } }
    const off = () => setStatus('offline'); const on = () => { if (pending.current === 0) setStatus('idle') }
    window.addEventListener('beforeunload', warn); window.addEventListener('offline', off); window.addEventListener('online', on)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [])

  const register = (table: string, id: string, version: number) => {
    const k = table + ':' + id; if (!(k in versions.current)) versions.current[k] = version
  }

  async function flush(table: string, id: string) {
    const k = table + ':' + id; const patch = patches.current[k]; delete patches.current[k]
    if (!patch) return
    for (let attempt = 0; attempt < 4; attempt++) {
      if (!navigator.onLine) { setStatus('offline'); await sleep(1500); continue }
      const { data, error } = await sb.from(table).update(patch).eq('id', id).eq('version', versions.current[k]).select('version').maybeSingle()
      if (!error && data) { versions.current[k] = data.version; pending.current--; if (pending.current === 0) setStatus('saved'); return }
      if (!error && !data) { pending.current--; setStatus('failed'); setMsg('This record was changed on another device. Refresh the page to see the latest version. Your last edit was NOT saved.'); return }
      if (error?.code === '23505') { pending.current--; setStatus('failed'); setMsg('That value already exists on another record (for example, a duplicate email). Change it and try again.'); return }
      await sleep(500 * 2 ** attempt)
    }
    pending.current--; setStatus('failed'); setMsg('Could not save. Check your connection and try again.')
  }

  const save = (table: string, id: string, patch: Record<string, unknown>, immediate: boolean) => {
    const k = table + ':' + id
    if (!patches.current[k]) pending.current++
    patches.current[k] = { ...patches.current[k], ...patch }
    setStatus('saving'); setMsg('')
    clearTimeout(timers.current[k])
    timers.current[k] = setTimeout(() => flush(table, id), immediate ? 0 : 800)
  }
  return { sb, status, msg, setStatus, setMsg, save, register }
}

export const statusLabel: Record<SaveState, string> = { idle: '', saving: 'Saving…', saved: 'Saved ✓', failed: 'Save Failed', offline: 'Offline — Changes Pending' }
