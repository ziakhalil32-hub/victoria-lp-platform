'use client'
import { useState } from 'react'
import { useAutosave, statusLabel } from '@/lib/useAutosave'
type T = { id: string; label: string; target: number; period_days: number; version: number }
export default function TargetCard({ t, published, titles }: { t: T; published: number; titles: string[] }) {
  const a = useAutosave(); const [target, setTarget] = useState<number>(t.target)
  a.register('social_targets', t.id, t.version)
  const remaining = Math.max(0, target - published); const pct = target > 0 ? Math.min(100, Math.round(100 * published / target)) : 0
  return (
    <div className="bg-white border rounded-2xl p-4 space-y-2">
      <div className="flex justify-between gap-2"><b className="text-sm">{t.label}</b><span className="text-xs text-slate-500">{t.period_days === 7 ? 'per week' : `per ${t.period_days} days`}</span></div>
      <div className="h-2 bg-slate-200 rounded"><div className="h-2 bg-blue-600 rounded" style={{ width: pct + '%' }} /></div>
      <div className="text-sm">{published} published · {remaining} remaining · {pct}%</div>
      <label className="text-xs text-slate-500 flex items-center gap-2">Target <input type="number" min="0" className="border rounded p-1 w-16 bg-white text-slate-800" value={target} onChange={e => { const v = Math.max(0, Math.floor(Number(e.target.value) || 0)); setTarget(v); a.save('social_targets', t.id, { target: v }, false) }} /><span>{statusLabel[a.status]}</span></label>
      {a.msg && <p className="text-xs text-red-600">{a.msg}</p>}
      {titles.length > 0 && <ul className="text-xs text-slate-500 list-disc pl-4">{titles.slice(0, 5).map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </div>
  )
}
