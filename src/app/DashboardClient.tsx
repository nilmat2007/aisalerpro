'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { formatToolUpdateDate } from '@/lib/date-utils';
import ThemeToggle from '@/components/ThemeToggle';
import FlowToolCard from '@/components/FlowToolCard';

function AnnouncementCard({ ann, onDismiss }: { ann: any; onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = ann.content && ann.content.length > 150;

  return (
    <div className="puppap-card p-4 border-[var(--border-light)] overflow-hidden">
      <div>
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 bg-[var(--accent-dim)] border border-[var(--accent)] text-[var(--accent)] text-xs font-bold rounded-full">
              {ann.badge_text || '📢 ประกาศ'}
            </span>
            <h3 className="font-bold text-[var(--text-primary)]">{ann.title}</h3>
          </div>
          <button onClick={() => onDismiss(ann.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg shrink-0">✕</button>
        </div>
        <div className={`text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {ann.content}
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[var(--accent)] text-xs mt-2 hover:underline font-semibold"
          >
            {expanded ? '▲ ย่อ' : '▼ อ่านเพิ่มเติม'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardClient({ user, profile, userTools, allTools, announcements, userTrials, userOrders = [] }: any) {
  const router = useRouter();
  const supabase = createClient();
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseMsg, setLicenseMsg] = useState({ type: '', text: '' });
  const [activeAnnouncements, setActiveAnnouncements] = useState(announcements);
  const [trialToolIds, setTrialToolIds] = useState<Set<string>>(new Set(userTrials?.map((t: any) => t.tool_id) || []));
  const [startingTrial, setStartingTrial] = useState<string | null>(null);

  const startTrial = async (toolId: string) => {
    setStartingTrial(toolId);
    try {
      const res = await fetch('/api/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId })
      });
      const data = await res.json();
      if (data.success || data.alreadyTried) {
        setTrialToolIds(prev => new Set([...prev, toolId]));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStartingTrial(null);
    }
  };

  const displayName = profile?.display_name || user?.user_metadata?.full_name || 'ผู้ใช้งาน';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleActivate = async () => {
    if (!licenseKey) return;
    try {
      setLicenseMsg({ type: '', text: '' });
      const res = await fetch('/api/activate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyCode: licenseKey })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLicenseMsg({ type: 'success', text: '✅ ปลดล็อกสำเร็จ!' });
        setLicenseKey('');
        router.refresh(); // Refresh to get new tools
      } else {
        setLicenseMsg({ type: 'error', text: data.error || '❌ รหัสไม่ถูกต้องหรือถูกใช้ไปแล้ว' });
      }
    } catch (err) {
      setLicenseMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    }
  };

  const dismissAnnouncement = (id: string) => {
    setActiveAnnouncements(activeAnnouncements.filter((a: any) => a.id !== id));
  };

  const ownedToolIds = new Set(userTools?.map((ut: any) => ut.tool_id) || []);
  const courseTool = allTools?.find((t: any) => t.slug === 'tiktok-ai-affiliate' || t.category === 'course');
  const flowTools = allTools?.filter((t: any) => t.category !== 'course' && t.slug !== 'tiktok-ai-affiliate');
  const hasCourseAccess = Boolean(
    profile?.role === 'admin' ||
    (courseTool && ownedToolIds.has(courseTool.id))
  );

  return (
    <div className="min-h-screen text-[var(--text-primary)] p-4 sm:p-6 transition-colors duration-200">
      
      {/* Header Card matching pheembot extension screenshot */}
      <header className="max-w-6xl mx-auto puppap-card p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link href="/" className="shrink-0 group">
            <img 
              src="/images/logo-puppap-ai.png" 
              alt="PUP PAP AI" 
              className="w-12 h-12 rounded-2xl object-cover border-[1.5px] border-[var(--border)] bg-white shadow-sm group-hover:scale-105 transition-transform" 
            />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)]">PUP PAP AI</h1>
              <span className="puppap-badge-pro">
                PRO · LIFETIME
              </span>
              <span className="text-[11px] font-semibold text-[var(--accent)] hidden md:inline">
                · คิดปุ๊บ คลิปปั๊บ 🔄
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              สวัสดี, <span className="font-semibold text-[var(--accent)]">{displayName}</span> 👋 · พร้อมสร้างคอนเทนต์ทุกแพลตฟอร์ม
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 self-end sm:self-center flex-wrap">
          <Link href="/courses" className="puppap-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition-transform">
            <span>🎓 คอร์สเรียน</span>
          </Link>
          <Link href="/flow-tools" className="puppap-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition-transform">
            <span>✨ คลัง Flow Tools</span>
          </Link>
          {avatarUrl && (
            <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border-[1.5px] border-[var(--border)]" />
          )}
          <ThemeToggle size="md" />
          <button onClick={handleLogout} className="puppap-btn-secondary px-4 py-1.5 text-xs">
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        {/* Order Status Banners (Pending / Rejected) */}
        {userOrders && userOrders.length > 0 && (
          <div className="space-y-3">
            {userOrders.map((order: any) => {
              if (order.status === 'pending') {
                return (
                  <div 
                    key={order.id} 
                    className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-[var(--text-primary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-xl shrink-0 font-bold">
                        ⏳
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-400">
                          ได้รับสลิปคำสั่งซื้อ &quot;{order.tools?.name || 'เครื่องมือ AI'}&quot; เรียบร้อยแล้ว
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                          ทีมงานกำลังตรวจสอบและเปิดสิทธิ์การใช้งานให้คุณ (ปกติไม่เกิน 5-15 นาที) ระบบจะปลดล็อกให้อัตโนมัติ ไม่ต้องโอนซ้ำนะครับ
                        </p>
                      </div>
                    </div>
                    <a
                      href="https://m.me/100083126689322"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="puppap-btn-secondary px-4 py-2 text-xs font-bold shrink-0 self-end sm:self-center flex items-center gap-1.5"
                    >
                      <span>💬 สอบถามแอดมิน</span>
                    </a>
                  </div>
                );
              }

              if (order.status === 'rejected') {
                return (
                  <div 
                    key={order.id} 
                    className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-[var(--text-primary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center text-xl shrink-0 font-bold">
                        ⚠️
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-rose-400">
                          คำสั่งซื้อ &quot;{order.tools?.name || 'เครื่องมือ AI'}&quot; ยังไม่ผ่านการอนุมัติ
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                          {order.admin_note ? `เหตุผล: ${order.admin_note}` : 'ภาพหลักฐานการโอนเงิน (สลิป) ไม่ชัดเจน หรือยอดเงินไม่ตรง ท่านสามารถแนบสลิปใหม่อีกครั้งได้ครับ'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {order.tools?.slug && (
                        <Link
                          href={`/checkout/${order.tools.slug}`}
                          className="puppap-btn-primary px-4 py-2 text-xs font-bold"
                        >
                          🔄 แนบสลิปใหม่
                        </Link>
                      )}
                      <a
                        href="https://m.me/100083126689322"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="puppap-btn-secondary px-3.5 py-2 text-xs font-semibold"
                      >
                        💬 แชทหาแอดมิน
                      </a>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* Announcements */}
        {activeAnnouncements.length > 0 && (
          <div className="space-y-3">
            {activeAnnouncements.map((ann: any) => (
              <AnnouncementCard key={ann.id} ann={ann} onDismiss={dismissAnnouncement} />
            ))}
          </div>
        )}

        {/* 🎓 คอร์สเรียนออนไลน์ / ห้องเรียน (Low-Tech & All Ages Friendly) */}
        {courseTool && (
          <section className="puppap-card p-5 sm:p-7 relative overflow-hidden border-2 border-[var(--border-accent)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-deep)] to-[var(--bg-card)] shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-[var(--accent)] text-white shadow-xs">
                    🎓 คอร์สเรียนออนไลน์
                  </span>
                  {hasCourseAccess ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <span>✅</span> ปลดล็อกแล้ว · สิทธิ์เรียนตลอดชีพ
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                      <span>💡</span> ซื้อครั้งเดียว 990฿ เรียนได้ตลอดชีพ (16 บท)
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                    {courseTool.name || 'ปั้นนายหน้า TikTok ด้วย AI ปักตะกร้า'}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    {hasCourseAccess
                      ? 'คุณมีสิทธิ์เข้าเรียนครบทั้ง 16 บทเรียนตลอดชีพ พร้อมโปรแกรมช่วยผลิตคลิป ดูซ้ำได้ทุกเวลาบนมือถือและคอมพิวเตอร์'
                      : 'คู่มือสร้างรายได้แบบจับมือทำ 16 บทเรียนเต็ม ตั้งแต่ก้าวแรก ทำคลิปขายดุ สเกล 50-100 คลิป/สัปดาห์ ไม่ต้องออกกล้อง'}
                  </p>
                </div>

                {/* Quick Info Badges */}
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap pt-1">
                  <span className="flex items-center gap-1">
                    <span>🎬</span> 16 บทเรียนเต็ม
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span>📱</span> ดูบนมือถือได้
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span>🔄</span> อัปเดตฟรีตลอดชีพ
                  </span>
                </div>
              </div>

              {/* Action Buttons: High-Contrast & Big for Low-Tech Learners */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-72">
                {hasCourseAccess ? (
                  <>
                    <Link
                      href={`/course/${courseTool.slug || 'tiktok-ai-affiliate'}`}
                      className="puppap-btn-primary py-3.5 px-6 text-center text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-transform"
                    >
                      <span className="text-lg">▶</span>
                      <span>กดตรงนี้เพื่อเข้าห้องเรียน</span>
                    </Link>
                    <Link
                      href="/courses"
                      className="puppap-btn-secondary py-2.5 px-4 text-center text-xs font-bold text-[var(--text-secondary)]"
                    >
                      📑 ดูสารบัญ 16 บทเรียน
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/checkout/${courseTool.slug || 'tiktok-ai-affiliate'}`}
                      className="puppap-btn-primary py-3.5 px-6 text-center text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-transform"
                    >
                      <span>🛒</span>
                      <span>สมัครเรียน 990฿ (ครั้งเดียวจบ)</span>
                    </Link>
                    <Link
                      href="/courses"
                      className="puppap-btn-secondary py-2.5 px-4 text-center text-xs font-bold text-[var(--text-secondary)]"
                    >
                      📑 ดูสารบัญ 16 บทเรียน
                    </Link>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 📌 คู่มือ 3 ขั้นตอนง่ายๆ สำหรับทุกคนทุกวัย */}
        <section className="puppap-card p-5 sm:p-6 bg-[var(--bg-card)] border-[var(--border-light)]">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm sm:text-base font-black text-[var(--text-primary)] flex items-center gap-2">
              <span className="text-[var(--accent)]">📌</span> วิธีเข้าเรียนและใช้งานง่ายๆ (สำหรับมือใหม่)
            </h3>
            <a
              href="https://m.me/100083126689322"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--accent)] hover:underline font-bold flex items-center gap-1"
            >
              <span>💬 สอบถามแอดมินทางแชท</span>
              <span>→</span>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-[var(--bg-deep)] border border-[var(--border-light)] flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white font-black text-sm flex items-center justify-center shrink-0">
                1
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">เข้าสู่ระบบครั้งเดียว</h4>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                  ล็อกอินด้วย Gmail สะดวก รวดเร็ว ระบบจดจำสิทธิ์ตลอดชีพ ไม่ต้องจำรหัสผ่าน
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-deep)] border border-[var(--border-light)] flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white font-black text-sm flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">กดปุ่มเข้าห้องเรียน</h4>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                  กดปุ่มสีแดง "เข้าห้องเรียน" ด้านบน จะพบสารบัญวิดีโอ 16 บทเรียนพร้อมเรียนทันที
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-deep)] border border-[var(--border-light)] flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white font-black text-sm flex items-center justify-center shrink-0">
                3
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">ดูคลิป & ทำตามได้เลย</h4>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                  ดูวิดีโอแนวนอนคมชัด และกดปุ่มเปิดเครื่องมือ Flow ทำตามทีละขั้นตอนได้ง่ายๆ
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tools Grid */}
        <div>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <span className="text-[var(--accent)]">❖</span> สตูดิโอ Flow Tools ของคุณ
            </h2>
            <Link
              href="/flow-tools"
              className="text-xs text-[var(--accent)] hover:underline font-bold flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)]"
            >
              <span>ดูเครื่องมือ Flow ทั้งหมด ({flowTools?.length || 0} ตัว)</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flowTools?.map((tool: any) => (
              <FlowToolCard
                key={tool.id}
                tool={tool}
                hasAccess={ownedToolIds.has(tool.id)}
                hasTrial={trialToolIds.has(tool.id)}
                onStartTrial={startTrial}
                isStartingTrial={startingTrial === tool.id}
              />
            ))}
          </div>
        </div>

        {/* License Activation */}
        <div className="puppap-card p-6 mt-12 max-w-xl mx-auto relative overflow-hidden">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--accent)]">
            🔑 มีรหัสปลดล็อก?
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="กรอก License Key ของคุณ"
              className="flex-grow bg-[var(--bg-deep)] border border-[var(--border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
            />
            <button
              onClick={handleActivate}
              disabled={!licenseKey}
              className="puppap-btn-primary px-6 py-2 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ปลดล็อก
            </button>
          </div>
          {licenseMsg.text && (
            <p className={`mt-3 text-sm font-semibold ${licenseMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--danger)]'}`}>
              {licenseMsg.text}
            </p>
          )}
        </div>
      </main>
      
      <footer className="text-center mt-20 text-[var(--text-muted)] text-sm pb-8 border-t border-[var(--border-light)] pt-6">
        © 2026 PUP PAP AI — คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม
      </footer>
    </div>
  );
}
