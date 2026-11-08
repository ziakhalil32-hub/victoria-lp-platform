export const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10)
export const chicagoToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
export const chicagoDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
export const mondayOf = (d: string) => { const x = new Date(d + 'T12:00:00Z'); return addDays(d, -((x.getUTCDay() + 6) % 7)) }
const offset = (d: string) => new Date(d + 'T12:00:00Z').toLocaleString('en-US', { timeZone: 'America/Chicago', timeZoneName: 'longOffset' }).match(/GMT([+-]\d\d:\d\d)/)?.[1] ?? '-06:00'
export const startOf = (d: string) => `${d}T00:00:00${offset(d)}`
export const endOf = (d: string) => `${d}T23:59:59${offset(d)}`
