import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatToolUpdateDate } from '@/lib/date-utils'

export const dynamic = 'force-dynamic';

export default async function StorePage() {
  const supabase = await createClient()
  const { data: tools } = await supabase.from('tools').select('*').order('sort_order')

  return (
    <div className="min-h-screen bg-[#0F0F12] text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 font-extrabold text-xs tracking-wider uppercase mb-4">
            ⚡ PUP PAP AI STORE · ซื้อขาดตลอดชีพ
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-400">
            PUP PAP AI STORE
          </h1>
          <p className="text-slate-400 text-base md:text-lg">คิดปุ๊บ คลิปปั๊บ ปลดล็อกเครื่องมือสร้างวิดีโอ AI พร้อมปักตะกร้าขายได้ทันที</p>
          <div className="mt-6">
            <Link href="/" className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#18181E] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-semibold transition-colors">
              ← กลับหน้าหลัก
            </Link>
          </div>
        </header>

        {/* All-in-One Package */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-amber-500/15 via-[#18181E] to-sky-500/15 border-2 border-amber-500/40 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.12)]">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-extrabold px-4 py-1.5 rounded-bl-xl tracking-wider uppercase">
              PRO · LIFETIME
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-sky-300 to-amber-200 mb-3">
              แพ็กเกจบุฟเฟ่ต์ PUP PAP All-in-One
            </h2>
            <p className="text-slate-300 text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              ปลดล็อกทุกเครื่องมือสร้างคลิป AI + อัปเดตฟรีตลอดชีพ คิดไอเดีย ผลิตคลิป ปักตะกร้า TikTok, Reels, และ Shopee Video ครบจบที่เดียว
            </p>
            <div className="text-4xl font-extrabold text-white mb-8">
              เร็วๆ นี้ <span className="text-lg text-slate-500 font-normal line-through ml-2">฿9,990</span>
            </div>
            <button className="px-8 py-3.5 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-full font-bold cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </section>

        {/* Individual Tools */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold mb-6 border-b border-slate-800 pb-4">เครื่องมือเดี่ยว</h2>
          {tools?.map((tool: any) => {
            const features = tool.features || [];
            const contactUrl = tool.contact_url || 'https://m.me/100083126689322';
            const posterImage = tool.poster_url || null;

            return (
              <div key={tool.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col md:flex-row group hover:border-cyan-500/50 transition-colors">
                {posterImage ? (
                  <div className="w-full md:w-2/5 h-64 md:h-auto relative overflow-hidden">
                    <img src={posterImage} alt={tool.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900 md:block hidden"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent md:hidden block"></div>
                  </div>
                ) : (
                  <div className="w-full md:w-2/5 h-64 md:h-auto bg-slate-800 flex items-center justify-center text-6xl">
                    {tool.icon || '🛠️'}
                  </div>
                )}
                
                <div className="p-8 md:w-3/5 flex flex-col">
                  {(() => {
                    const updateInfo = formatToolUpdateDate(tool.updated_at);
                    return (
                      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                        {tool.version && (
                          <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs rounded-lg font-semibold">
                            📦 เวอร์ชัน {tool.version}
                          </span>
                        )}
                        {updateInfo && (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${
                            updateInfo.isRecent
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}>
                            {updateInfo.text} ({updateInfo.fullDate})
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <h3 className="text-3xl font-bold text-white mb-2">{tool.name}</h3>
                  <p className="text-slate-400 mb-6">{tool.description}</p>
                  
                  {features.length > 0 && (
                    <ul className="space-y-2 mb-8 flex-grow">
                      {features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-slate-300">
                          <span className="text-cyan-500 mr-2">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-auto pt-6 border-t border-slate-800/50 gap-4">
                      <div className="text-3xl font-bold text-amber-400">
                        {tool.price ? `฿${tool.price.toLocaleString()}` : 'ฟรี'}
                      </div>
                      <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                        <Link 
                          href={`/checkout/${tool.slug}`}
                          className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] text-center transition-all"
                        >
                          🛒 สั่งซื้อในเว็บ
                        </Link>
                        <a 
                          href={contactUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] text-center transition-all"
                        >
                          💬 สั่งซื้อผ่าน Messenger
                        </a>
                      </div>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
