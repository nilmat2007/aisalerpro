import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DashboardClient from './DashboardClient'
import { notifyNewMember } from '@/lib/telegram'
import { formatToolUpdateDate } from '@/lib/date-utils'

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Landing Page
    const { data: allTools } = await supabase.from('tools').select('*').order('sort_order')
    const { data: settings } = await supabase.from('site_settings').select('*').single()
    
    return (
      <div className="min-h-screen bg-[#0F0F12] text-white font-sans flex flex-col items-center">
        <header className="w-full text-center pt-16 pb-12 px-4 relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-10"></div>
          
          {/* Logo with pheembot border style */}
          <div className="relative group mb-6">
            <img 
              src={settings?.logo_url || "/images/logo-puppap-ai.png"} 
              alt="PUP PAP AI Logo" 
              className="w-32 h-32 rounded-3xl object-cover border-2 border-slate-700 shadow-[0_4px_24px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-300 bg-[#18181E]"
            />
          </div>

          {/* Pill Badge matching pheembot PRO · LIFETIME */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 font-extrabold text-xs tracking-wider uppercase mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            PRO · LIFETIME · คิดปุ๊บ คลิปปั๊บ 🔄
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight text-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-400">
              {settings?.site_name || 'PUP PAP AI'}
            </span>
            <br/>
            <span className="text-2xl md:text-3xl text-slate-300 font-bold tracking-normal block mt-2">
              {settings?.tagline || 'คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม'}
            </span>
          </h1>
          
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto mb-8 text-center leading-relaxed">
            {settings?.description || 'คิดปุ๊บ คลิปปั๊บ สร้างและโพสต์วิดีโอ AI อัตโนมัติ ปักตะกร้าลง TikTok, Facebook Reels, และ Shopee Video'}
          </p>

          {/* Platform Pills matching pheembot */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18181E] border border-slate-800 text-white text-xs font-semibold shadow-sm hover:border-slate-700 transition-colors">
              🎵 <span>TikTok</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18181E] border border-slate-800 text-blue-400 text-xs font-semibold shadow-sm hover:border-slate-700 transition-colors">
              🎬 <span>Reels</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18181E] border border-orange-500/40 text-orange-400 text-xs font-bold shadow-sm hover:border-orange-500 transition-colors">
              🛒 <span>Shopee VDO</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18181E] border border-slate-800 text-red-400 text-xs font-semibold shadow-sm hover:border-slate-700 transition-colors">
              ▶️ <span>YouTube</span>
            </span>
          </div>
          
          <Link href="/login" className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-slate-950 rounded-full font-extrabold text-base md:text-lg shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all hover:scale-105 active:scale-95 text-center">
            ⚡ เข้าสู่ระบบเพื่อใช้งาน
          </Link>
        </header>

        <main className="max-w-6xl w-full mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-12 flex items-center justify-center gap-3">
            <span className="text-cyan-500">⚡</span> เครื่องมือทั้งหมด
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTools?.map((tool: any) => {
              const posterImage = tool.poster_url || null;
              const updateInfo = formatToolUpdateDate(tool.updated_at);
              return (
                <div key={tool.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative group overflow-hidden flex flex-col h-full hover:border-cyan-500/40 transition-colors">
                  {posterImage ? (
                    <div className="w-full h-48 mb-4 rounded-xl overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
                      <img src={posterImage} alt={tool.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl mb-4">
                      {tool.icon || '✨'}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    {tool.version && (
                      <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[11px] rounded-md font-semibold">
                        {tool.version}
                      </span>
                    )}
                    {updateInfo && (
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                        updateInfo.isRecent
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}>
                        {updateInfo.text}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{tool.name}</h3>
                  <p className="text-slate-400 text-sm mb-6 flex-grow">{tool.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-amber-400 font-bold">{tool.price ? `฿${tool.price.toLocaleString()}` : 'ฟรี'}</span>
                    <Link href="/login" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors">
                      ดูรายละเอียด
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
        
        <footer className="text-center py-12 text-slate-500 text-sm">
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
