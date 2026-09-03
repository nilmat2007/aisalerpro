import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
  
  // Tools stats
  const { count: totalTools } = await supabase.from('tools').select('*', { count: 'exact', head: true })
  const { count: activeTools } = await supabase.from('tools').select('*', { count: 'exact', head: true }).eq('is_active', true)
  
  // Members stats
  const { count: totalMembers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  
  // License keys stats
  const { count: totalKeys } = await supabase.from('license_keys').select('*', { count: 'exact', head: true })
  const { count: activatedKeys } = await supabase.from('license_keys').select('*', { count: 'exact', head: true }).eq('status', 'activated')
  const { count: availableKeys } = await supabase.from('license_keys').select('*', { count: 'exact', head: true }).eq('status', 'available')

  // Orders & Revenue
  const { data: approvedOrders } = await supabase
    .from('orders')
    .select('amount, created_at, tools(name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  const { count: pendingOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')

  // Calculate revenue
  const totalRevenue = approvedOrders?.reduce((sum: number, o: any) => sum + (o.amount || 0), 0) || 0
  
  // This month revenue
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthRevenue = approvedOrders
    ?.filter((o: any) => o.created_at >= firstDayOfMonth)
    .reduce((sum: number, o: any) => sum + (o.amount || 0), 0) || 0

  // Today revenue
  const todayStr = new Date().toISOString().split('T')[0]
  const todayRevenue = approvedOrders
    ?.filter((o: any) => o.created_at?.startsWith(todayStr))
    .reduce((sum: number, o: any) => sum + (o.amount || 0), 0) || 0

  // Revenue by tool
  const revenueByTool: Record<string, number> = {}
  approvedOrders?.forEach((o: any) => {
    const toolName = o.tools?.name || 'ไม่ระบุ'
    revenueByTool[toolName] = (revenueByTool[toolName] || 0) + (o.amount || 0)
  })
  const sortedToolRevenue = Object.entries(revenueByTool).sort((a, b) => b[1] - a[1])

  // Recent orders (last 5)
  const recentOrders = approvedOrders?.slice(0, 5) || []

  // Monthly breakdown (last 6 months)
  const monthlyRevenue: { month: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthName = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
    const amount = approvedOrders
      ?.filter((o: any) => o.created_at?.startsWith(monthKey))
      .reduce((sum: number, o: any) => sum + (o.amount || 0), 0) || 0
    monthlyRevenue.push({ month: monthName, amount })
  }
  const maxMonthly = Math.max(...monthlyRevenue.map(m => m.amount), 1)

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">📊 Dashboard</h1>
      
      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-500/30 p-5 rounded-xl">
          <div className="text-green-400 text-sm mb-1">💰 รายได้ทั้งหมด</div>
          <div className="text-3xl font-bold text-white">{totalRevenue.toLocaleString()} <span className="text-lg text-green-400">฿</span></div>
          <div className="text-xs text-green-400/60 mt-1">{approvedOrders?.length || 0} ออเดอร์ที่อนุมัติ</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 border border-cyan-500/30 p-5 rounded-xl">
          <div className="text-cyan-400 text-sm mb-1">📅 เดือนนี้</div>
          <div className="text-3xl font-bold text-white">{thisMonthRevenue.toLocaleString()} <span className="text-lg text-cyan-400">฿</span></div>
          <div className="text-xs text-cyan-400/60 mt-1">{now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 border border-amber-500/30 p-5 rounded-xl">
          <div className="text-amber-400 text-sm mb-1">🔥 วันนี้</div>
          <div className="text-3xl font-bold text-white">{todayRevenue.toLocaleString()} <span className="text-lg text-amber-400">฿</span></div>
          <div className="text-xs text-amber-400/60 mt-1">{now.toLocaleDateString('th-TH', { weekday: 'long' })}</div>
        </div>
        <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-500/30 p-5 rounded-xl">
          <div className="text-red-400 text-sm mb-1">⏳ รอตรวจสอบ</div>
          <div className="text-3xl font-bold text-white">{pendingOrders || 0}</div>
          <div className="text-xs text-red-400/60 mt-1">
            {(pendingOrders || 0) > 0 ? (
              <a href="/admin/orders" className="text-red-400 hover:underline">→ ไปตรวจสอบ</a>
            ) : 'ไม่มี'}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 text-sm mb-1">🛠️ เครื่องมือ</div>
          <div className="text-2xl font-bold text-white">{activeTools || 0} <span className="text-sm text-slate-500">/ {totalTools || 0}</span></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 text-sm mb-1">👥 สมาชิก</div>
          <div className="text-2xl font-bold text-cyan-400">{totalMembers || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 text-sm mb-1">🔑 License Keys</div>
          <div className="text-2xl font-bold text-amber-400">{activatedKeys || 0} <span className="text-sm text-slate-500">/ {totalKeys || 0}</span></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 text-sm mb-1">🎟️ Keys ว่าง</div>
          <div className="text-2xl font-bold text-green-400">{availableKeys || 0}</div>
        </div>
      </div>

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">📈 รายได้ 6 เดือนล่าสุด</h2>
          <div className="flex items-end gap-2 h-40">
            {monthlyRevenue.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="text-xs text-slate-400 mb-1">{m.amount > 0 ? `${(m.amount / 1000).toFixed(1)}k` : '0'}</div>
                <div 
                  className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md transition-all min-h-[4px]"
                  style={{ height: `${Math.max((m.amount / maxMonthly) * 120, 4)}px` }}
                />
                <div className="text-xs text-slate-500 mt-1">{m.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Tool */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">🏆 รายได้แยกตาม Tool</h2>
          {sortedToolRevenue.length === 0 ? (
            <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-3">
              {sortedToolRevenue.map(([name, amount], i) => {
                const maxToolRevenue = sortedToolRevenue[0]?.[1] || 1
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '} {name}</span>
                      <span className="text-amber-400 font-mono">{amount.toLocaleString()} ฿</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full transition-all"
                        style={{ width: `${(amount / maxToolRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">🧾 ออเดอร์ล่าสุด</h2>
          <a href="/admin/orders" className="text-cyan-400 text-sm hover:underline">ดูทั้งหมด →</a>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-slate-500 text-sm">ยังไม่มีออเดอร์</p>
        ) : (
          <table className="w-full text-sm text-slate-300">
            <thead className="text-slate-500 border-b border-slate-800">
              <tr>
                <th className="text-left py-2">วันที่</th>
                <th className="text-left py-2">เครื่องมือ</th>
                <th className="text-right py-2">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o: any, i: number) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td className="py-2 text-slate-400">{new Date(o.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                  <td className="py-2">{o.tools?.name || '-'}</td>
                  <td className="py-2 text-right font-mono text-green-400">+{(o.amount || 0).toLocaleString()} ฿</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <a href="/admin/tools" className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-xl text-center transition-colors">
          <div className="text-2xl mb-1">🛠️</div>
          <div className="text-sm text-slate-300">จัดการเครื่องมือ</div>
        </a>
        <a href="/admin/orders" className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl text-center transition-colors">
          <div className="text-2xl mb-1">🧾</div>
          <div className="text-sm text-slate-300">คำสั่งซื้อ</div>
        </a>
        <a href="/admin/licenses" className="bg-slate-900 border border-slate-800 hover:border-green-500/50 p-4 rounded-xl text-center transition-colors">
          <div className="text-2xl mb-1">🔑</div>
          <div className="text-sm text-slate-300">License Keys</div>
        </a>
        <a href="/admin/settings" className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 p-4 rounded-xl text-center transition-colors">
          <div className="text-2xl mb-1">⚙️</div>
          <div className="text-sm text-slate-300">ตั้งค่าเว็บไซต์</div>
        </a>
      </div>
    </div>
  )
}
