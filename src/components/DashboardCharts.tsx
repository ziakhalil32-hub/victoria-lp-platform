'use client'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
type D = { name: string; value: number }
function Card({ title, data, money, pct, hideIfZero = true }: { title: string; data: D[]; money?: boolean; pct?: boolean; hideIfZero?: boolean }) {
  const empty = data.length === 0 || (hideIfZero && data.every(d => d.value === 0))
  return (
    <div className="bg-white rounded-2xl border p-4">
      <div className="font-medium text-sm mb-2">{title}</div>
      {empty ? <p className="text-sm text-slate-500 h-48 flex items-center">No data recorded yet.</p> : (
        <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={44} domain={pct ? [0, 100] : undefined} allowDecimals={false} />
          <Tooltip formatter={(v: any) => (money ? '$' + Number(v).toFixed(2) : pct ? v + '%' : v)} /><Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div>)}
    </div>
  )
}
export default function DashboardCharts(p: { revenueByProduct: D[]; ordersByProduct: D[]; revenueByMonth: D[]; progress: D[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card title="Revenue by product (collected)" data={p.revenueByProduct} money />
      <Card title="Orders by product" data={p.ordersByProduct} />
      <Card title="Revenue by month (collected)" data={p.revenueByMonth} money />
      <Card title="Campaign progress (milestones confirmed done)" data={p.progress} pct hideIfZero={false} />
    </div>
  )
}
