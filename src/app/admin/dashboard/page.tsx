import { createClient } from '@supabase/supabase-js'
import { computeTrafficAnalytics, type PvRow } from '@/lib/visitor-analytics'

export const dynamic = 'force-dynamic'

// Parse price string like "699 บาท" or "1,299" to number
function parsePrice(price: string | null): number {
  if (!price) return 0
  const cleaned = price.replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
}

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

  // Activated License Keys with tool info (main revenue source)
  const { data: activatedLicenses } = await supabase
    .from('license_keys')
    .select('activated_at, activated_email, package_type, tools(name, price)')
    .eq('status', 'activated')
    .order('activated_at', { ascending: false })

  // Orders (secondary)
  const { count: pendingOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')

  // Visitor & Page View Analytics (last 7 days from rate_limit_attempts pv:*)
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: rawPvRows } = await supabase
    .from('rate_limit_attempts')
    .select('endpoint, ip_hash, created_at')
    .like('endpoint', 'pv:%')
    .gte('created_at', sevenDaysAgoIso)
    .order('created_at', { ascending: false })
    .limit(10000)

  const traffic = computeTrafficAnalytics((rawPvRows as PvRow[]) || [])
  const maxDailyUv = Math.max(...traffic.dailySeries.map(d => d.uv), 1)

  // Build unified revenue records from license keys
  const revenueRecords: { date: string; toolName: string; amount: number; source: string; email?: string }[] = []
  
  activatedLicenses?.forEach((lic: any) => {
    const toolName = lic.tools?.name || (lic.package_type === 'all' ? 'All-in-One' : 'ไม่ระบุ')
    const amount = parsePrice(lic.tools?.price)
    revenueRecords.push({
      date: lic.activated_at || '',
      toolName,
      amount,
      source: 'license',
      email: lic.activated_email
    })
  })

  // Sort by date descending
  revenueRecords.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // Calculate totals
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const todayStr = now.toISOString().split('T')[0]

  const totalRevenue = revenueRecords.reduce((sum, r) => sum + r.amount, 0)
  const thisMonthRevenue = revenueRecords
    .filter(r => r.date >= firstDayOfMonth)
    .reduce((sum, r) => sum + r.amount, 0)
  const todayRevenue = revenueRecords
    .filter(r => r.date?.startsWith(todayStr))
    .reduce((sum, r) => sum + r.amount, 0)

  // Revenue by tool
  const revenueByTool: Record<string, { amount: number; count: number }> = {}
  revenueRecords.forEach(r => {
    if (!revenueByTool[r.toolName]) revenueByTool[r.toolName] = { amount: 0, count: 0 }
    revenueByTool[r.toolName].amount += r.amount
    revenueByTool[r.toolName].count += 1
  })
  const sortedToolRevenue = Object.entries(revenueByTool).sort((a, b) => b[1].amount - a[1].amount)

  // Recent sales (last 5)
  const recentSales = revenueRecords.slice(0, 5)

  // Monthly breakdown (last 6 months)
  const monthlyRevenue: { month: string; amount: number; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthName = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
    const monthRecords = revenueRecords.filter(r => r.date?.startsWith(monthKey))
    const amount = monthRecords.reduce((sum, r) => sum + r.amount, 0)
    monthlyRevenue.push({ month: monthName, amount, count: monthRecords.length })
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
          <div className="text-xs text-green-400/60 mt-1">{revenueRecords.length} License Keys ที่ activated</div>
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

      {/* Visitor & Page View Analytics Section */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>👁️ สถิติผู้เข้าชมเว็บไซต์ (Visitor Analytics)</span>
          </h2>
          <span className="text-xs text-slate-400">
            7 วันล่าสุด: <strong className="text-cyan-400">{traffic.sevenDayUv.toLocaleString()} คน (UV)</strong> · <strong className="text-slate-200">{traffic.sevenDayPv.toLocaleString()} ครั้ง (PV)</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="text-cyan-400 text-xs mb-1">👤 คนเข้าเว็บวันนี้ (Unique)</div>
            <div className="text-2xl font-bold text-white">{traffic.todayUv.toLocaleString()} <span className="text-xs font-normal text-slate-400">คน</span></div>
            <div className="text-[11px] text-slate-500 mt-1">ไม่ซ้ำ IP ในวันนี้</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="text-indigo-400 text-xs mb-1">📄 เปิดหน้าเว็บวันนี้ (PV)</div>
            <div className="text-2xl font-bold text-white">{traffic.todayPv.toLocaleString()} <span className="text-xs font-normal text-slate-400">ครั้ง</span></div>
            <div className="text-[11px] text-slate-500 mt-1">รวมทุกหน้าวันนี้</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="text-amber-400 text-xs mb-1">🎓 ดูหน้าคอร์สวันนี้ (/courses)</div>
            <div className="text-2xl font-bold text-amber-300">{traffic.todayCourseUv.toLocaleString()} <span className="text-xs font-normal text-slate-400">คน</span></div>
            <div className="text-[11px] text-slate-500 mt-1">ผู้สนใจดูรายละเอียดคอร์ส</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="text-emerald-400 text-xs mb-1">🛒 เข้าหน้าจ่ายเงินวันนี้ (/checkout)</div>
            <div className="text-2xl font-bold text-emerald-300">{traffic.todayCheckoutUv.toLocaleString()} <span className="text-xs font-normal text-slate-400">คน</span></div>
            <div className="text-[11px] text-slate-500 mt-1">กดปุ่มสมัครเรียน/ซื้อเครื่องมือ</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 7-Day Daily Visitor Chart */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">📅 ผู้เข้าชมย้อนหลัง 7 วัน (คน / ครั้ง)</h3>
            <div className="flex items-end gap-2 h-36">
              {traffic.dailySeries.map((d) => (
                <div key={d.dateKey} className="flex-1 flex flex-col items-center">
                  <div className="text-[11px] text-cyan-300 font-mono mb-1">
                    {d.uv > 0 ? `${d.uv}` : '0'}
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-cyan-600 to-teal-400 rounded-t-md transition-all min-h-[4px]"
                    style={{ height: `${Math.max((d.uv / maxDailyUv) * 96, 4)}px` }}
                    title={`${d.label}: ${d.uv} คน (${d.pv} ครั้ง)`}
                  />
                  <div className="text-[10px] text-slate-400 mt-1">{d.label}</div>
                  <div className="text-[9px] text-slate-500">{d.pv} PV</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Pages & UTM Breakdown */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">🔥 หน้าที่มีคนเข้าดูมากที่สุด (7 วันล่าสุด)</h3>
              {traffic.topPages.length === 0 ? (
                <p className="text-xs text-slate-500">กำลังเริ่มเก็บข้อมูลผู้เข้าชม...</p>
              ) : (
                <div className="space-y-1.5">
                  {traffic.topPages.map((p) => (
                    <div key={p.pathname} className="flex items-center justify-between text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg">
                      <span className="text-slate-300 truncate max-w-[65%]">{p.label}</span>
                      <span className="text-cyan-400 font-mono">{p.uv} คน <span className="text-slate-500">({p.pv} ครั้ง)</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {traffic.utmBreakdown.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-amber-300 mb-2">🎯 คนเข้าจากแอด (UTM Content)</h3>
                <div className="space-y-1.5">
                  {traffic.utmBreakdown.map((u) => (
                    <div key={u.utm} className="flex items-center justify-between text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg">
                      <span className="text-amber-300 font-mono">{u.utm}</span>
                      <span className="text-white font-mono">{u.uv} คน <span className="text-slate-500">({u.pv} ครั้ง)</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lesson 21 Video Preview Funnel & Single-Variable A/B Test Summary */}
        {traffic.previewFunnel && (
          <div className="mt-6 bg-slate-950/60 border border-amber-500/30 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <span>🎬 สถิติวิดีโอตัวอย่างบทที่ 21 (1 นาที • Preview Conversion Funnel)</span>
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                {traffic.previewFunnel.abTest.isSampleReached
                  ? '✅ กลุ่มตัวอย่างครบเกณฑ์ N ≥ 500 ต่อ Variant แล้ว'
                  : `⏳ กำลังเก็บตัวอย่าง A/B (A: ${traffic.previewFunnel.abTest.variantA.plays}/500 · B: ${traffic.previewFunnel.abTest.variantB.plays}/500 — ห้ามสรุปผลก่อนครบ 500 UV/กลุ่ม)`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-center">
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                <div className="text-[11px] text-slate-400">▶ เริ่มเล่นคลิป</div>
                <div className="text-lg font-bold text-white">{traffic.previewFunnel.playUv}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                <div className="text-[11px] text-cyan-400">🔊 กดเปิดเสียง</div>
                <div className="text-lg font-bold text-cyan-300">{traffic.previewFunnel.unmuteUv}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                <div className="text-[11px] text-slate-400">⏱️ ดูถึง 50%</div>
                <div className="text-lg font-bold text-white">{traffic.previewFunnel.q50Uv}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                <div className="text-[11px] text-emerald-400">🏁 ดูจบ 100%</div>
                <div className="text-lg font-bold text-emerald-300">{traffic.previewFunnel.q100Uv}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                <div className="text-[11px] text-amber-400">🔥 กดปุ่มตอน 30s</div>
                <div className="text-lg font-bold text-amber-300">{traffic.previewFunnel.sticky30sClickUv}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                <div className="text-[11px] text-rose-400">🔒 กดปุ่ม Overlay จบ</div>
                <div className="text-lg font-bold text-rose-300">{traffic.previewFunnel.overlayClickUv}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                <div className="text-[11px] text-indigo-400">📑 กดดูสารบัญ</div>
                <div className="text-lg font-bold text-indigo-300">{traffic.previewFunnel.curriculumClickUv}</div>
              </div>
            </div>
          </div>
        )}
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
              {sortedToolRevenue.map(([name, data], i) => {
                const maxToolRevenue = sortedToolRevenue[0]?.[1].amount || 1
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '} {name} <span className="text-slate-500">({data.count} keys)</span></span>
                      <span className="text-amber-400 font-mono">{data.amount.toLocaleString()} ฿</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full transition-all"
                        style={{ width: `${(data.amount / maxToolRevenue) * 100}%` }}
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
          <h2 className="text-lg font-bold text-white">🧾 การขายล่าสุด (License Keys)</h2>
          <a href="/admin/licenses" className="text-cyan-400 text-sm hover:underline">ดูทั้งหมด →</a>
        </div>
        {recentSales.length === 0 ? (
          <p className="text-slate-500 text-sm">ยังไม่มีการขาย</p>
        ) : (
          <table className="w-full text-sm text-slate-300">
            <thead className="text-slate-500 border-b border-slate-800">
              <tr>
                <th className="text-left py-2">วันที่</th>
                <th className="text-left py-2">ลูกค้า</th>
                <th className="text-left py-2">เครื่องมือ</th>
                <th className="text-right py-2">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((r, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td className="py-2 text-slate-400">{r.date ? new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}</td>
                  <td className="py-2 text-slate-400 text-xs">{r.email || '-'}</td>
                  <td className="py-2">{r.toolName}</td>
                  <td className="py-2 text-right font-mono text-green-400">+{r.amount.toLocaleString()} ฿</td>
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
