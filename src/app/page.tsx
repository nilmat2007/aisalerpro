import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Tool, SiteSettings } from '@/lib/types'

export const revalidate = 60 // Revalidate every 60 seconds

export default async function LandingPage() {
  // Fetch site settings
  const { data: settingsData } = await supabase
    .from('site_settings')
    .select('*')
    .limit(1)
    .single()

  const settings: SiteSettings | null = settingsData

  // Fetch tools
  const { data: toolsData } = await supabase
    .from('tools')
    .select('*')
    .order('sort_order', { ascending: true })

  const tools: Tool[] = toolsData || []

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="text-center pt-16 pb-10 px-4 flex flex-col items-center animate-fade-in">
        <div className="mb-6 flex justify-center">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings?.site_name || 'Logo'}
              className="w-28 h-28 rounded-full object-cover border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-500 to-teal-500 flex items-center justify-center text-5xl">
              🎬
            </div>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-teal-400 to-cyan-400">
          {settings?.site_name || 'PHEEM AI TOOLKIT'}
        </h1>
        <p className="text-slate-400 text-sm font-mono tracking-widest mb-4">
          {settings?.tagline || 'MULTI-PROVIDER STUDIO'}
        </p>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          {settings?.description || 'ศูนย์รวมเครื่องมือ AI สำหรับสร้างคอนเทนต์วิดีโอระดับมืออาชีพ'}
        </p>
        <div className="mt-4 inline-block bg-gradient-to-r from-amber-400/20 to-teal-600/20 border border-amber-500/30 text-amber-300 text-xs px-3 py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          ⭐ เลือกเครื่องมือที่ต้องการเข้าใช้งาน
        </div>
      </header>

      {/* Tools Grid */}
      <main className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool, index) => (
            <div
              key={tool.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {tool.is_coming_soon ? (
                /* Coming Soon Card */
                <div className="opacity-60 cursor-default">
                  <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden relative">
                    <div className="relative h-64 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
                      <div className="absolute inset-0 bg-slate-950/60 z-20 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-3 opacity-50">🔒</div>
                          <span className="bg-slate-800/80 text-slate-400 px-5 py-2 rounded-full text-sm font-semibold border border-slate-700">
                            Coming Soon
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="bg-slate-700/30 text-slate-500 text-xs px-3 py-1 rounded-full border border-slate-700/30">
                          {tool.badge_text || '🕐 เร็วๆ นี้'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm">{tool.description}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Tool Card */
                <Link href={`/tool/${tool.slug}`} className="block group">
                  <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-2xl overflow-hidden relative hover:border-slate-600 transition-colors duration-300">
                    {/* Poster Image */}
                    <div className="relative overflow-hidden">
                      {tool.poster_url ? (
                        <img
                          src={tool.poster_url}
                          alt={tool.name}
                          className="w-full h-auto object-cover"
                        />
                      ) : (
                        <div className="h-64 bg-gradient-to-br from-cyan-900/40 via-slate-900 to-purple-900/40 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-5xl mb-4">{tool.icon}</div>
                            <h3 className="text-xl font-bold text-white">{tool.name}</h3>
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className={`absolute inset-0 bg-${tool.badge_color}-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center`}>
                        <span className="bg-black/50 backdrop-blur-sm text-white px-6 py-3 rounded-full font-semibold border border-white/20 transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-lg">
                          🔓 เข้าสู่คู่มือ
                        </span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`bg-${tool.badge_color}-500/20 text-${tool.badge_color}-300 text-xs px-3 py-1 rounded-full border border-${tool.badge_color}-500/30`}>
                          {tool.badge_text}
                        </span>
                        {tool.price && (
                          <span className="text-yellow-400 text-sm font-semibold">{tool.price}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">{tool.name}</h3>
                      <p className="text-slate-400 text-sm">{tool.description}</p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center mt-16 text-slate-600 text-sm">
        © 2026 {settings?.site_name || 'Pheem AI Toolkit'} - {settings?.tagline || 'Multi-Provider Studio'}
      </footer>
    </div>
  )
}
