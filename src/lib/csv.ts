// Builds a CSV; cells starting with = + - @ are prefixed to prevent spreadsheet formula injection.
export function toCsv(rows: Record<string, any>[], cols: string[]) {
  const cell = (v: any) => { let s = v == null ? '' : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"' }
  return [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\r\n')
}
export const csvResponse = (csv: string, name: string) =>
  new Response('\ufeff' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"` } })
