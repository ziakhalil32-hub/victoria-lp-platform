'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type Mix = { educate_entertain: number; trust: number; promote: number }
export default function SettingsForm({ row }: { row: { id: string; version: number; value: Mix } }) {
  const a = useAutosave(); const [mix, setMix] = useState<Mix>({ ...{ educate_entertain: 3, trust: 1, promote: 1 }, ...row.value })
  a.register('application_settings', row.id, row.version)
  const set = (k: keyof Mix, v: string) => { const n = Math.max(0, Math.floor(Number(v) || 0)); const next = { ...mix, [k]: n }; setMix(next); a.save('application_settings', row.id, { value: next }, false) }
  const f = (k: keyof Mix, label: string) => <label className="block text-sm"><span className="text-slate-600">{label}</span><input type="number" min="0" className="w-full border rounded-lg p-2 bg-white" value={mix[k]} onChange={e => set(k, e.target.value)} /></label>
  return (
    <div className="bg-white border rounded-2xl p-4 space-y-3">
      <div className="flex justify-between"><h2 className="font-semibold">Content mix guideline</h2><span className="text-sm text-slate-500">{statusLabel[a.status]}</span></div>
      <p className="text-xs text-slate-500">Out of every group of posts: how many educate or entertain, how many build trust, how many promote a purchase. This is guidance shown in the Content Studio. It never blocks publishing.</p>
      {a.msg && <p className="text-sm text-red-600">{a.msg}</p>}
      <div className="grid gap-3 md:grid-cols-3">{f('educate_entertain', 'Educate / entertain / stories')}{f('trust', 'Build trust (experience or demo)')}{f('promote', 'Promote purchase or preorder')}</div>
    </div>
  )
}
