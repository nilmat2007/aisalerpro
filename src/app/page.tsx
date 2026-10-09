import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DashboardClient from './DashboardClient'
import { notifyNewMember } from '@/lib/telegram'
import { formatToolUpdateDate } from '@/lib/date-utils'
import ThemeToggle from '@/components/ThemeToggle'
import FlowToolCard from '@/components/FlowToolCard'

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Landing Page
    const { data: allTools } = await supabase.from('tools').select('*').order('sort_order')
    const { data: settings } = await supabase.from('site_settings').select('*').single()
    
    return (
      <div className="min-h-screen text-[var(--text-primary)] font-sans flex flex-col items-center transition-colors duration-200">
        
        {/* Top Navigation Bar สไตล์โมเดิร์นมาตรฐานสากล */}
        <header className="w-full border-b border-[var(--border-light)] bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            {/* ซ้าย: โลโก้ + ชื่อแบรนด์ */}
            <Link href="/" className="flex items-center gap-3 group">
              <img 
                src={settings?.logo_url || "/images/logo-puppap-ai.png"} 
                alt="PUP PAP AI Logo" 
                className="w-9 h-9 rounded-xl object-cover border-[1.5px] border-[var(--border)] bg-white shadow-sm group-hover:scale-105 transition-transform shrink-0"
              />
              <span className="text-lg md:text-xl font-black text-[var(--text-primary)] tracking-tight">
                {settings?.site_name || 'PUP PAP AI'}
              </span>
            </Link>

            {/* ขวา: แคตตาล็อก Flow + คอร์สเรียน + ตัวเลือกโหมดกลางวัน/กลางคืนมาตรฐาน + ปุ่มเข้าสู่ระบบ */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link 
                href="/courses" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--accent)] bg-[var(--bg-deep)] border border-[var(--border-light)] hover:scale-105 transition-transform"
              >
                <span>🎓 คอร์สเรียน</span>
              </Link>
              <Link 
                href="/flow-tools" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[var(--accent)] bg-[var(--accent-dim)] border border-[var(--border-accent)] hover:scale-105 transition-transform"
              >
                <span>✨ แคตตาล็อก Flow</span>
              </Link>
              <ThemeToggle variant="segmented" size="sm" />
              <Link 
                href="/login" 
                className="puppap-btn-primary px-4 py-1.5 rounded-full text-xs md:text-sm shadow-sm"
              >
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section กลางหน้า คลีน สบายตา */}
        <section className="w-full text-center pt-10 md:pt-16 pb-10 px-4 relative overflow-hidden flex flex-col items-center">
          
          {/* มาสค็อตหุ่นยนต์ 3D คุณภาพสูง */}
          <div className="relative group mb-6">
            <img 
              src={settings?.logo_url || "/images/logo-puppap-ai.png"} 
              alt="PUP PAP AI Mascot" 
              className="w-28 h-28 md:w-36 md:h-36 rounded-3xl object-cover border-[2px] border-[var(--border)] bg-white shadow-xl group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          
          {/* หัวข้อและสโลแกน */}
          <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight text-center">
            <span className="text-[var(--text-primary)]">
              {settings?.site_name || 'PUP PAP AI'}
            </span>
            <br/>
            <span className="text-xl md:text-2xl text-[var(--accent)] font-bold tracking-normal block mt-2">
              {settings?.tagline || 'คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม'}
            </span>
          </h1>
          
          <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-2xl mx-auto mb-6 text-center leading-relaxed">
            {settings?.description || 'คิดปุ๊บ คลิปปั๊บ สร้างและโพสต์วิดีโอ AI อัตโนมัติ ปักตะกร้าลง TikTok, Facebook Reels, และ Shopee Video'}
          </p>

          {/* Platform Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <span className="puppap-tab active">
              🎵 TikTok
            </span>
            <span className="puppap-tab">
              🎬 Reels
            </span>
            <span className="puppap-tab text-[#EE4D2D]">
              🛒 Shopee VDO
            </span>
            <span className="puppap-tab">
              ▶️ YouTube
            </span>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link href="/login" className="puppap-btn-primary px-8 py-3.5 rounded-full text-base md:text-lg shadow-md hover:scale-105 active:scale-95 text-center flex items-center gap-2">
              <span>⚡</span> เข้าสู่ระบบเพื่อใช้งาน
            </Link>
            <Link href="/courses" className="puppap-btn-secondary px-6 py-3.5 rounded-full text-base font-bold text-center flex items-center gap-2 hover:scale-105 transition-transform">
              <span>🎓</span> ดูคอร์สเรียน 990฿
            </Link>
          </div>
        </section>

        {/* Featured Course Card for All Ages & Low Tech */}
        <div className="max-w-6xl w-full mx-auto px-4 mb-8">
          <div className="puppap-card p-6 sm:p-8 border-2 border-[var(--border-accent)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-deep)] to-[var(--bg-card)] shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[var(--accent)] text-white shadow-xs">
                  🎓 คอร์สเรียนแนะนำ
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  💡 ซื้อครั้งเดียว 990฿ เรียนได้ตลอดชีพ (16 บทเรียน)
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                ปั้นนายหน้า TikTok ด้วย AI ปักตะกร้า
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                คู่มือสร้างรายได้แบบจับมือทำ 16 บทเรียนเต็ม วิดีโอแนวนอน 16:9 คมชัด เรียนได้ทุกเพศทุกวัย แม้ไม่เก่งคอมพิวเตอร์ ทำตามได้บนมือถือเครื่องเดียว
              </p>
              <div className="flex items-center justify-center md:justify-start gap-3 text-xs text-[var(--text-muted)] flex-wrap pt-1">
                <span>✓ ไม่มีพื้นฐานก็เรียนได้</span>
                <span>•</span>
                <span>✓ ดูซ้ำกี่รอบก็ได้ ไม่มีหมดอายุ</span>
                <span>•</span>
                <span>✓ พร้อมโปรแกรม Flow Tools ช่วยทำคลิป</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full sm:w-auto shrink-0 md:w-64">
              <Link 
                href="/courses" 
                className="puppap-btn-primary py-3 px-6 text-center text-sm font-black flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-transform"
              >
                <span>🎓 ดูสารบัญ 16 บท</span>
              </Link>
              <Link 
                href="/course/tiktok-ai-affiliate" 
                className="puppap-btn-secondary py-2.5 px-4 text-center text-xs font-bold"
              >
                🎁 ดูตัวอย่างบทแรกฟรี
              </Link>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <main className="max-w-6xl w-full mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2.5 text-[var(--text-primary)]">
                <span className="text-[var(--accent)]">❖</span> เครื่องมือ Flow ทั้งหมด
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                คลิปขายสินค้า ละครสั้น พอดแคสต์ AI พร้อมโมเดล Omni, Veo 3.1, Imagen 4
              </p>
            </div>
            <Link 
              href="/flow-tools" 
              className="text-xs text-[var(--accent)] hover:underline font-bold flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)]"
            >
              <span>เปิดดูมุมมองแยกหมวดหมู่</span>
              <span>→</span>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTools?.filter((t: any) => t.category !== 'course' && t.slug !== 'tiktok-ai-affiliate')?.map((tool: any) => (
              <FlowToolCard key={tool.id} tool={tool} hasAccess={false} />
            ))}
          </div>
        </main>
        
        <footer className="text-center py-12 text-[var(--text-muted)] text-sm border-t border-[var(--border-light)] w-full max-w-6xl mt-12">
          © 2026 PUP PAP AI — คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม
        </footer>
      </div>
    )
  }

  // Dashboard
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  // แจ้ง Telegram ถ้าเป็นสมาชิกใหม่ (ยังไม่มี profile)
  if (!profile) {
    notifyNewMember(
      user.user_metadata?.full_name || user.user_metadata?.name || 'ไม่ทราบชื่อ',
      user.email || ''
    )
  }
  
  const { data: userTools } = await supabase.from('user_tools').select('*, tools(*)').eq('user_id', user.id)
  const { data: allTools } = await supabase.from('tools').select('*').order('sort_order')
  const { data: announcements } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false })
  const { data: userTrials } = await supabase.from('user_trials').select('*').eq('user_id', user.id)
  const { data: userOrders } = await supabase
    .from('orders')
    .select('*, tools(name, slug)')
    .eq('user_id', user.id)
    .in('status', ['pending', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <DashboardClient 
      user={user} 
      profile={profile} 
      userTools={userTools || []} 
      allTools={allTools || []} 
      announcements={announcements || []} 
      userTrials={userTrials || []} 
      userOrders={userOrders || []} 
    />
  )
}
