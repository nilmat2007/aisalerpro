import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DashboardClient from './DashboardClient'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Landing Page
    const { data: allTools } = await supabase.from('tools').select('*').order('sort_order')
    const { data: settings } = await supabase.from('site_settings').select('*').single()
    
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center">
        <header className="w-full text-center pt-20 pb-12 px-4 relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl -z-10"></div>
          
          <img 
            src={settings?.logo_url || "/images/logo-pheem-ai-toolkit.jpg"} 
            alt="Logo" 
            className="w-32 h-32 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.5)] mb-8"
          />
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-amber-400 tracking-tight text-center">
            {settings?.site_name || 'PHEEM AI TOOLKIT'} <br/>
            <span className="text-3xl md:text-4xl text-slate-300 font-medium tracking-normal">MULTI-PROVIDER STUDIO</span>
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 text-center">
            {settings?.description || 'ศูนย์รวมเครื่องมือ AI สำหรับสร้างคอนเทนต์วิดีโอระดับมืออาชีพ'}
          </p>
          
          <Link href="/login" className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-105 active:scale-95 text-center">
            เข้าสู่ระบบเพื่อใช้งาน
          </Link>
        </header>

        <main className="max-w-6xl w-full mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-12 flex items-center justify-center gap-3">
            <span className="text-cyan-500">⚡</span> เครื่องมือทั้งหมด
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTools?.map((tool: any) => {
              const posterImage = tool.poster_url || null;
              return (
                <div key={tool.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative group overflow-hidden flex flex-col h-full">
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
        
        <footer className="text-center py-12 text-slate-600 text-sm">
          © 2026 PHEEM AI TOOLKIT
        </footer>
      </div>
    )
  }

  // Dashboard
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: userTools } = await supabase.from('user_tools').select('*, tools(*)').eq('user_id', user.id)
  const { data: allTools } = await supabase.from('tools').select('*').order('sort_order')
  const { data: announcements } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false })

  return <DashboardClient user={user} profile={profile} userTools={userTools || []} allTools={allTools || []} announcements={announcements || []} />
}
