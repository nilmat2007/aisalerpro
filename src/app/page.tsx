import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DashboardClient from './DashboardClient'
import { notifyNewMember } from '@/lib/telegram'
import { formatToolUpdateDate } from '@/lib/date-utils'
import ThemeToggle from '@/components/ThemeToggle'

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
        <header className="w-full text-center pt-8 md:pt-14 pb-12 px-4 relative overflow-hidden flex flex-col items-center">
          
          {/* Header Card matching pheembot extension screenshot */}
          <div className="puppap-card p-4 sm:p-5 max-w-xl w-full mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-left">
              <img 
                src={settings?.logo_url || "/images/logo-puppap-ai.png"} 
                alt="PUP PAP AI Logo" 
                className="w-12 h-12 rounded-2xl object-cover border-[1.5px] border-[var(--border)] bg-white shadow-sm shrink-0"
              />
              <div>
                <div className="text-xl font-black text-[var(--text-primary)] tracking-tight">PUP PAP AI</div>
                <div className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
                  V1.2.9 · ระบบพร้อมทำงาน 0 Credit
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="puppap-badge-pro">
                PRO · LIFETIME
              </span>
              <ThemeToggle size="md" />
            </div>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight text-center">
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

          {/* Platform Pills matching pheembot */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
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
          
          <Link href="/login" className="puppap-btn-primary px-8 py-3.5 rounded-full text-base md:text-lg shadow-md hover:scale-105 active:scale-95 text-center flex items-center gap-2">
            <span>⚡</span> เข้าสู่ระบบเพื่อใช้งาน
          </Link>
        </header>

        <main className="max-w-6xl w-full mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-center mb-10 flex items-center justify-center gap-2.5 text-[var(--text-primary)]">
            <span className="text-[var(--accent)]">❖</span> เครื่องมือทั้งหมด
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTools?.map((tool: any) => {
              const posterImage = tool.poster_url || null;
              const updateInfo = formatToolUpdateDate(tool.updated_at);
              return (
                <div key={tool.id} className="puppap-card p-5 relative group overflow-hidden flex flex-col h-full hover:scale-[1.01] transition-all">
                  {posterImage ? (
                    <div className="w-full h-48 mb-4 rounded-xl overflow-hidden relative border border-[var(--border-light)] bg-black/10">
                      <img src={posterImage} alt={tool.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border-light)] flex items-center justify-center text-3xl mb-4">
                      {tool.icon || '✨'}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    {tool.version && (
                      <span className="px-2 py-0.5 bg-[var(--accent-dim)] border border-[var(--accent)] text-[var(--accent)] font-mono text-[11px] rounded-md font-semibold">
                        {tool.version}
                      </span>
                    )}
                    {updateInfo && (
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                        updateInfo.isRecent
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--bg-deep)] border-[var(--border-light)] text-[var(--text-muted)]'
                      }`}>
                        {updateInfo.text}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{tool.name}</h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-6 flex-grow">{tool.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-light)]">
                    <span className="text-[var(--accent)] font-bold text-lg">{tool.price ? `฿${tool.price.toLocaleString()}` : 'ฟรี'}</span>
                    <Link href="/login" className="puppap-btn-secondary px-4 py-2 text-sm">
                      ดูรายละเอียด
                    </Link>
                  </div>
                </div>
              );
            })}
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

  return <DashboardClient user={user} profile={profile} userTools={userTools || []} allTools={allTools || []} announcements={announcements || []} userTrials={userTrials || []} />
}
