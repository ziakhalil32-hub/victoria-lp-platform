import SignOut from '@/components/SignOut'
const later = ['Analytics','Settings']
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <nav className="print:hidden md:w-60 bg-slate-900 text-slate-200 p-4 md:min-h-screen space-y-1">
        <div className="font-semibold text-white mb-4">Victoria LP</div>
        <a href="/dashboard" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Overview</a>
        <a href="/today" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Today & Tasks</a>
        <a href="/products" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Projects & Products</a>
        <a href="/calendar" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Marketing Calendar</a>
        <a href="/customers" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Customers & Leads</a>
        <a href="/sales" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Sales & Orders</a>
        <a href="/events" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Events & Workshops</a>
        <a href="/outreach" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Partnerships & Outreach</a>
        <a href="/reviews" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Reviews & Feedback</a>
        <a href="/expenses" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Advertising & Expenses</a>
        <a href="/email" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Email Marketing</a>
        <a href="/materials" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Marketing Materials</a>
        <a href="/reports" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Weekly Reports</a>
        <a href="/content" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Content Studio</a>
        <a href="/social" className="block rounded-lg hover:bg-slate-800 px-3 py-2 text-sm">Social Media</a>
        {later.map(n => <div key={n} className="px-3 py-2 text-sm text-slate-500" title="Coming in a later step">{n}</div>)}
        <div className="pt-4"><SignOut /></div>
      </nav>
      <main className="flex-1 p-4 md:p-8 max-w-5xl">{children}</main>
    </div>
  )
}
