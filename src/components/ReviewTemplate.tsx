'use client'
import { useState } from 'react'
const TEXT = "Thank you for supporting my work! If you've had an opportunity to read or use the book, I would truly appreciate your honest review on Amazon. Your feedback helps other readers decide whether it's right for them. Thank you for being part of this journey."
export default function ReviewTemplate() {
  const [ok, setOk] = useState(false)
  return (
    <div className="bg-white border rounded-2xl p-4 space-y-2">
      <b className="text-sm">Neutral review-request template</b>
      <p className="text-sm whitespace-pre-wrap">{TEXT}</p>
      <button className="text-sm text-blue-600" onClick={async () => { try { await navigator.clipboard.writeText(TEXT); setOk(true); setTimeout(() => setOk(false), 2000) } catch { alert('Could not copy. Select the text and copy it by hand.') } }}>{ok ? 'Copied ✓' : 'Copy text'}</button>
      <p className="text-xs text-slate-500">Send it unchanged. Do not add an incentive, ask for a specific star rating, pressure anyone to change a review, or tie customer support to leaving one.</p>
    </div>
  )
}
