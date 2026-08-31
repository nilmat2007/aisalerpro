import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function StorePage() {
  const supabase = await createClient()
  const { data: tools } = await supabase.from('tools').select('*').order('sort_order')

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
            ร้านค้า / Store
          </h1>
          <p className="text-slate-400 text-lg">เลือกซื้อเครื่องมือที่เหมาะกับคุณเพื่อปลดล็อกการสร้างคอนเทนต์</p>
          <div className="mt-8">
            <Link href="/" className="text-slate-500 hover:text-cyan-400 transition-colors">
              ← กลับหน้าหลัก
            </Link>
          </div>
        </header>

        {/* All-in-One Package */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/50 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)]">
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl">BEST VALUE</div>
            <h2 className="text-3xl font-bold text-amber-400 mb-4">แพ็กเกจบุฟเฟ่ต์ All-in-One</h2>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">ปลดล็อกทุกเครื่องมือ + อัปเดตฟรีตลอดชีพ คุ้มค่าที่สุดสำหรับการทำสื่อโฆษณา</p>
            <div className="text-4xl font-bold text-white mb-8">
              เร็วๆ นี้ <span className="text-lg text-slate-500 font-normal line-through ml-2">฿9,990</span>
            </div>
            <button className="px-8 py-4 bg-slate-800 text-slate-400 rounded-xl font-bold cursor-not-allowed">
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
            const posterImage = tool.slug === 'ugc-batch' ? '/images/poster-ugc-batch.jpg' 
                              : tool.slug === 'ai-content-factory' ? '/images/poster-ai-content-factory.jpg' 
                              : null;

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
            );
          })}
        </div>
      </div>
    </div>
  );
}
