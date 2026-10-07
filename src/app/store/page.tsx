import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatToolUpdateDate } from '@/lib/date-utils'
import ThemeToggle from '@/components/ThemeToggle'

export const dynamic = 'force-dynamic';

export default async function StorePage() {
  const supabase = await createClient()
  const { data: tools } = await supabase.from('tools').select('*').order('sort_order')

  return (
    <div className="min-h-screen text-[var(--text-primary)] py-12 px-4 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="puppap-badge-pro">
              ⚡ PUP PAP AI STORE · ซื้อขาดตลอดชีพ
            </div>
            <ThemeToggle size="sm" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3 text-[var(--text-primary)]">
            PUP PAP AI STORE
          </h1>
          <p className="text-[var(--text-secondary)] text-base md:text-lg">คิดปุ๊บ คลิปปั๊บ ปลดล็อกเครื่องมือสร้างวิดีโอ AI พร้อมปักตะกร้าขายได้ทันที</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/" className="puppap-btn-secondary px-4 py-1.5 text-xs font-semibold">
              ← กลับหน้าหลัก
            </Link>
          </div>
        </header>

        {/* All-in-One Package */}
        <section className="mb-16">
          <div className="puppap-card p-8 md:p-12 text-center relative overflow-hidden border-2 border-[var(--accent)]">
            <div className="absolute top-0 right-0 bg-[var(--accent)] text-white text-xs font-black px-4 py-1.5 rounded-bl-xl tracking-wider uppercase">
              PRO · LIFETIME
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-3">
              แพ็กเกจบุฟเฟ่ต์ PUP PAP All-in-One
            </h2>
            <p className="text-[var(--text-secondary)] text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              ปลดล็อกทุกเครื่องมือสร้างคลิป AI + อัปเดตฟรีตลอดชีพ คิดไอเดีย ผลิตคลิป ปักตะกร้า TikTok, Reels, และ Shopee Video ครบจบที่เดียว
            </p>
            <div className="text-4xl font-extrabold text-[var(--accent)] mb-8">
              เร็วๆ นี้ <span className="text-lg text-[var(--text-muted)] font-normal line-through ml-2">฿9,990</span>
            </div>
            <button className="puppap-btn-secondary px-8 py-3.5 rounded-full font-bold cursor-not-allowed opacity-60">
              Coming Soon
            </button>
          </div>
        </section>

        {/* Individual Tools */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold mb-6 border-b border-[var(--border-light)] pb-4 text-[var(--text-primary)]">
            เครื่องมือเดี่ยว
          </h2>
          {tools?.map((tool: any) => {
            const features = tool.features || [];
            const contactUrl = tool.contact_url || 'https://m.me/100083126689322';
            const posterImage = tool.poster_url || null;

            return (
              <div key={tool.id} className="puppap-card overflow-hidden flex flex-col md:flex-row group hover:scale-[1.01] transition-all">
                {posterImage ? (
                  <div className="w-full md:w-2/5 h-64 md:h-auto relative overflow-hidden border-b md:border-b-0 md:border-r border-[var(--border-light)] bg-black/10">
                    <img src={posterImage} alt={tool.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                ) : (
                  <div className="w-full md:w-2/5 h-64 md:h-auto bg-[var(--bg-deep)] border-b md:border-b-0 md:border-r border-[var(--border-light)] flex items-center justify-center text-6xl">
                    {tool.icon || '🛠️'}
                  </div>
                )}
                
                <div className="p-8 md:w-3/5 flex flex-col">
                  {(() => {
                    const updateInfo = formatToolUpdateDate(tool.updated_at);
                    return (
                      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                        {tool.version && (
                          <span className="px-2.5 py-1 bg-[var(--accent-dim)] border border-[var(--accent)] text-[var(--accent)] font-mono text-xs rounded-lg font-semibold">
                            📦 เวอร์ชัน {tool.version}
                          </span>
                        )}
                        {updateInfo && (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${
                            updateInfo.isRecent
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-[var(--bg-deep)] border-[var(--border-light)] text-[var(--text-muted)]'
                          }`}>
                            {updateInfo.text} ({updateInfo.fullDate})
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <h3 className="text-3xl font-black text-[var(--text-primary)] mb-2">{tool.name}</h3>
                  <p className="text-[var(--text-secondary)] mb-6">{tool.description}</p>
                  
                  {features.length > 0 && (
                    <ul className="space-y-2 mb-8 flex-grow">
                      {features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-[var(--text-secondary)]">
                          <span className="text-emerald-600 dark:text-emerald-400 mr-2 font-bold">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-auto pt-6 border-t border-[var(--border-light)] gap-4">
                    <div className="text-3xl font-black text-[var(--accent)]">
                      {tool.price ? `฿${tool.price.toLocaleString()}` : 'ฟรี'}
                    </div>
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                      <Link 
                        href={`/checkout/${tool.slug}`}
                        className="w-full sm:w-auto px-6 py-2.5 puppap-btn-primary text-center"
                      >
                        🛒 สั่งซื้อในเว็บ
                      </Link>
                      <a 
                        href={contactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-6 py-2.5 puppap-btn-secondary text-center"
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
