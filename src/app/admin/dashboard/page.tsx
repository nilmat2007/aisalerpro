import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
  
  const { count: totalTools } = await supabase.from('tools').select('*', { count: 'exact', head: true })
  const { count: activeTools } = await supabase.from('tools').select('*', { count: 'exact', head: true }).eq('is_active', true)
  const { count: comingSoonTools } = await supabase.from('tools').select('*', { count: 'exact', head: true }).eq('is_coming_soon', true)

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="text-slate-400 mb-2">เครื่องมือทั้งหมด</div>
          <div className="text-3xl font-bold text-white">{totalTools || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="text-slate-400 mb-2">เปิดใช้งาน</div>
          <div className="text-3xl font-bold text-cyan-400">{activeTools || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="text-slate-400 mb-2">เร็วๆ นี้</div>
          <div className="text-3xl font-bold text-purple-400">{comingSoonTools || 0}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">ยินดีต้อนรับสู่ Admin Panel</h2>
        <p className="text-slate-400 mb-4">
          คุณสามารถจัดการเครื่องมือทั้งหมด การตั้งค่า และดูสถิติต่างๆ ได้จากระบบนี้
        </p>
        <div className="flex gap-4">
          <a href="/admin/tools" className="text-cyan-400 hover:text-cyan-300">→ ไปที่จัดการเครื่องมือ</a>
          <a href="/admin/settings" className="text-cyan-400 hover:text-cyan-300">→ ไปที่ตั้งค่าเว็บไซต์</a>
        </div>
      </div>
    </div>
  )
}
