import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatToolUpdateDate } from '@/lib/date-utils'
import ThemeToggle from '@/components/ThemeToggle'

export const dynamic = 'force-dynamic';

export default async function StorePage() {
  const supabase = await createClient()
  const { data: tools } = await supabase.from('tools').select('*').order('sort_order')

  return (
    <div className="min-h-screen text-[var(--text-primary)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        
        {/* Navigation & Header */}
        <header className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Link 
                href="/" 
                className="puppap-btn-secondary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
              >
                <span>←</span>
                <span>หน้าหลัก</span>
              </Link>
              <Link 
                href="/courses" 
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium px-2 py-1 transition-colors"
              >
                🎓 คอร์สเรียน TikTok
              </Link>
              <Link 
                href="/flow-tools" 
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium px-2 py-1 transition-colors"
              >
                ❖ คลัง Flow Tools
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle size="sm" />
            </div>
          </div>

          <div className="text-center max-w-3xl mx-auto pt-4 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
              <span>⚡</span>
              <span>PUP PAP AI STORE · ซื้อขาดตลอดชีพ ไม่มีรายเดือน</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight">
              ศูนย์รวมเครื่องมือสร้างคลิป AI
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              คิดปุ๊บ คลิปปั๊บ ปลดล็อกเครื่องมือผลิตคอนเทนต์ AI สำหรับนายหน้า TikTok, Reels และ Shopee Video สเกลงานไว ขายได้จริง
            </p>
          </div>
        </header>

        {/* All-in-One Compact Banner */}
        <section>
          <div className="puppap-card p-6 sm:p-8 rounded-2xl relative overflow-hidden border-2 border-[var(--border-accent)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-deep)] to-[var(--bg-card)] shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-[var(--accent)] text-white shadow-xs">
                    🔥 PRO · LIFETIME
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    บุฟเฟ่ต์รวมทุกเครื่องมือ
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--text-primary)]">
                  แพ็กเกจบุฟเฟ่ต์ PUP PAP All-in-One
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  ปลดล็อกทุกเครื่องมือสร้างคลิป AI ทั้งปัจจุบันและอนาคต พร้อมรับอัปเดตฟรีตลอดชีพ จ่ายครั้งเดียวจบ ไม่ต้องซื้อแยกทีละตัว
                </p>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 shrink-0">
                <div className="text-left md:text-right">
                  <div className="text-2xl sm:text-3xl font-black text-[var(--accent)]">
                    เร็วๆ นี้
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    ราคาพิเศษเปิดตัว <span className="line-through">฿9,990</span>
                  </div>
                </div>
                <button 
                  disabled 
                  className="puppap-btn-secondary px-6 py-2.5 rounded-xl text-xs font-bold cursor-not-allowed opacity-70 w-full sm:w-auto"
                >
                  ⏳ Coming Soon
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Individual Tools Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border-light)] pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-[var(--accent)]">🛠️</span>
                <span>เครื่องมือเดี่ยวทั้งหมด</span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                เลือกซื้อเฉพาะเครื่องมือที่คุณต้องการใช้งาน จ่ายครั้งเดียวใช้ได้ตลอดชีพ
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--bg-deep)] border border-[var(--border-light)] text-[var(--text-secondary)]">
              ทั้งหมด {tools?.length || 0} รายการ
            </span>
          </div>

          {/* Responsive Grid: 1 col on mobile, 2 col on tablet, 3 col on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {tools?.map((tool: any) => {
              const features = Array.isArray(tool.features) ? tool.features : [];
              const contactUrl = tool.contact_url || 'https://m.me/100083126689322';
              const posterImage = tool.poster_url || null;
              const updateInfo = formatToolUpdateDate(tool.updated_at);
              const isComingSoon = tool.slug === 'coming-soon' || !tool.price;

              return (
                <div 
                  key={tool.id} 
                  className="puppap-card overflow-hidden flex flex-col h-full group hover:-translate-y-1 hover:shadow-xl transition-all duration-200 border border-[var(--border-light)]"
                >
                  {/* Poster Image (Controlled Aspect Ratio) */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-900 border-b border-[var(--border-light)] group">
                    {posterImage ? (
                      <img 
                        src={posterImage} 
                        alt={tool.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-deep)] text-[var(--accent)]">
                        <span className="text-5xl mb-2">{tool.icon || '🎬'}</span>
                        <span className="text-xs font-bold text-[var(--text-muted)]">{tool.name}</span>
                      </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 flex-wrap">
                      {tool.version && (
                        <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-black/80 text-white backdrop-blur-md border border-white/10 shadow-sm">
                          📦 {tool.version}
                        </span>
                      )}
                      {updateInfo?.isRecent && (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600/90 text-white backdrop-blur-md shadow-sm">
                          {updateInfo.text}
                        </span>
                      )}
                    </div>

                    {/* Price Chip on Top Right */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-[var(--accent)] text-white shadow-md">
                        {tool.price ? (tool.price.includes('บาท') ? tool.price : `฿${tool.price}`) : 'เร็วๆ นี้'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-black text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                          {tool.name}
                        </h3>
                      </div>

                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {tool.description || 'เครื่องมือสร้างวิดีโอ AI ปักตะกร้าคุณภาพสูง'}
                      </p>

                      {/* Key Features List (Max 3 items) */}
                      {features.length > 0 && (
                        <ul className="pt-2 space-y-1.5">
                          {features.slice(0, 3).map((feature: string, i: number) => (
                            <li key={i} className="flex items-start text-xs text-[var(--text-muted)] leading-tight">
                              <span className="text-emerald-500 mr-1.5 font-black shrink-0">✓</span>
                              <span className="line-clamp-1">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 border-t border-[var(--border-light)] space-y-3 mt-auto">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-2xl font-black text-[var(--accent)]">
                            {tool.price ? (tool.price.includes('บาท') ? tool.price : `฿${tool.price}`) : 'เร็วๆ นี้'}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {tool.price ? 'ซื้อขาดตลอดชีพ · อัปเดตฟรี' : 'อยู่ระหว่างพัฒนา'}
                          </div>
                        </div>

                        {tool.trial_enabled && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            🎁 มีตัวทดลองฟรี
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {isComingSoon ? (
                        <button 
                          disabled 
                          className="w-full py-2.5 puppap-btn-secondary text-xs font-bold opacity-60 cursor-not-allowed text-center"
                        >
                          🔒 เปิดตัวเร็วๆ นี้
                        </button>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Link 
                            href={`/checkout/${tool.slug}`}
                            className="puppap-btn-primary py-2.5 px-3 text-xs font-black text-center flex items-center justify-center gap-1 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                          >
                            <span>🛒</span>
                            <span>สั่งซื้อในเว็บ</span>
                          </Link>
                          <a 
                            href={contactUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="puppap-btn-secondary py-2.5 px-3 text-xs font-bold text-center flex items-center justify-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                          >
                            <span>💬</span>
                            <span>Messenger</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Store Trust Footer */}
        <footer className="pt-8 pb-12 border-t border-[var(--border-light)] text-center text-xs text-[var(--text-muted)] space-y-2">
          <div className="flex items-center justify-center gap-4 flex-wrap text-[var(--text-secondary)] font-medium">
            <span className="flex items-center gap-1">🔒 ชำระเงินปลอดภัยด้วยการโอนเงินตรวจสอบสลิป</span>
            <span>•</span>
            <span className="flex items-center gap-1">⚡ ปลดล็อกเครื่องมืออัตโนมัติภายใน 5-15 นาที</span>
            <span>•</span>
            <span className="flex items-center gap-1">🛠️ ทีมงานช่วยเหลือและดูแลตลอดการใช้งาน</span>
          </div>
          <p>© 2026 PUP PAP AI — คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม</p>
        </footer>

      </div>
    </div>
  );
}
