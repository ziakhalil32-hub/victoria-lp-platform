'use client'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
type Pt = Record<string, any>
function Card({ title, data, keys, money }: { title: string; data: Pt[]; keys: { k: string; name: string; color: string }[]; money?: boolean }) {
  const empty = data.length === 0 || data.every(d => keys.every(x => !d[x.k]))
  return (
    <div className="bg-white rounded-2xl border p-4">
      <div className="font-medium text-sm mb-2">{title}</div>
      {empty ? <p className="text-sm text-slate-500 h-48 flex items-center">No data recorded for these filters.</p> : (
        <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={48} allowDecimals={false} />
          <Tooltip formatter={(v: any) => (money ? '$' + Number(v).toFixed(2) : v)} />{keys.length > 1 && <Legend />}
          {keys.map(x => <Bar key={x.k} dataKey={x.k} name={x.name} fill={x.color} radius={[4, 4, 0, 0]} />)}
        </BarChart></ResponsiveContainer></div>)}
    </div>
  )
}
export default function AnalyticsCharts({ revenue, budget, platforms }: { revenue: Pt[]; budget: Pt[]; platforms: Pt[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card title="Collected revenue by product" data={revenue} money keys={[{ k: 'value', name: 'Revenue', color: '#2563eb' }]} />
      <Card title="Budget vs actual (ad and other expenses)" data={budget} money keys={[{ k: 'proposed', name: 'Proposed (not approved)', color: '#94a3b8' }, { k: 'approved', name: 'Approved spend', color: '#2563eb' }]} />
      <Card title="Orders by platform" data={platforms} keys={[{ k: 'value', name: 'Orders', color: '#2563eb' }]} />
    </div>
  )
}
