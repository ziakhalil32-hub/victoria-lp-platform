// Small CSV parser (handles quoted cells). Returns rows as objects keyed by lowercase header.
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], cell = '', q = false
  const t = text.replace(/^﻿/, '')
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(c => c.trim())) rows.push(row); row = [] }
    else cell += ch
  }
  row.push(cell); if (row.some(c => c.trim())) rows.push(row)
  if (rows.length < 2) return []
  const head = rows[0].map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])))
}
