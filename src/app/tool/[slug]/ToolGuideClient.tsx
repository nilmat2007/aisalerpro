'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatToolUpdateDate } from '@/lib/date-utils';
import ThemeToggle from '@/components/ThemeToggle';

export default function ToolGuideClient({
  slug,
  hasAccess,
  loggedIn,
  userEmail = '',
  isTrial = false,
  trialFlowUrl = '',
}: {
  slug: string;
  hasAccess: boolean;
  loggedIn: boolean;
  userEmail?: string;
  isTrial?: boolean;
  trialFlowUrl?: string;
}) {
  const router = useRouter();

  const [tool, setTool] = useState<any>(null);
  const [guideSections, setGuideSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(hasAccess);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unlockNotice, setUnlockNotice] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/tools`);
        if (!res.ok) throw new Error('Failed to fetch tools');
        const tools = await res.json();
        const currentTool = tools.find((t: any) => t.slug === slug);
        
        if (!currentTool) {
          router.push('/');
          return;
        }
        setTool(currentTool);

        const guideRes = await fetch(`/api/guide/${currentTool.id}`);
        if (guideRes.ok) {
          const guides = await guideRes.json();
          setGuideSections(guides);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (slug) {
      fetchData();
    }
  }, [slug, router]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId: tool.id, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsUnlocked(true);
        setError('');
        setUnlockNotice(
          data.boundToAccount
            ? `✅ ปลดล็อกสำเร็จ! ระบบได้ผูกสิทธิ์เครื่องมือนี้เข้ากับอีเมล ${userEmail || 'ของคุณ'} แบบถาวรเรียบร้อยแล้ว`
            : '✅ ปลดล็อกเครื่องมือสำเร็จ!'
        );
        router.refresh();
      } else {
        showError(data.error || '❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
      }
    } catch {
      showError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const showError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-9 h-9 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tool) return null;

  const activeFlowUrl = isTrial && trialFlowUrl ? trialFlowUrl : tool.flow_url;

  // ===== MAIN GUIDE CONTENT =====
  return (
    <div className="min-h-screen text-[var(--text-primary)] pb-12 transition-colors duration-200">
      {/* Top Bar */}
      <div className="max-w-3xl mx-auto px-4 pt-6 flex justify-between items-center">
        <Link href="/" className="puppap-btn-secondary px-3.5 py-1.5 text-xs font-semibold">
          ← กลับหน้าหลัก
        </Link>
        <ThemeToggle size="sm" />
      </div>

      {/* Header */}
      <header className="text-center pt-8 pb-10 px-4 flex flex-col items-center">
        {tool.logo_url ? (
          <img src={tool.logo_url} alt={tool.name} className="w-28 h-28 rounded-3xl object-cover border-2 border-[var(--border)] bg-white shadow-md hover:scale-105 transition-transform duration-300 mb-6" />
        ) : (
          <div className="w-28 h-28 rounded-3xl bg-[var(--accent)] text-white border-2 border-[var(--border)] shadow-md flex items-center justify-center text-5xl mb-6">
            {tool.icon}
          </div>
        )}
        
        <h1 className="text-3xl md:text-5xl font-black mb-4 text-[var(--text-primary)] tracking-tight">
          {tool.name}
        </h1>
        <p className="text-[var(--text-secondary)] text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          {tool.description}
        </p>

        {/* Version & Update Date Badges */}
        <div className="flex items-center justify-center gap-2.5 mt-3 flex-wrap">
          {tool.version && (
            <span className="px-3 py-1 bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] font-mono text-xs rounded-full font-bold">
              📦 เวอร์ชัน {tool.version}
            </span>
          )}
          {(() => {
            const updateInfo = formatToolUpdateDate(tool.updated_at);
            if (!updateInfo) return null;
            return (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                updateInfo.isRecent
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-[var(--bg-deep)] border-[var(--border-light)] text-[var(--text-secondary)]'
              }`}>
                {updateInfo.text} ({updateInfo.fullDate})
              </span>
            );
          })()}
        </div>

        {/* Unlocked Direct Launch Card */}
        {isUnlocked && (
          <div className="mt-6 w-full max-w-xl puppap-card p-5 border-2 border-emerald-500/50 text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-700 text-white">
              <span>✓</span>
              <span>ปลดล็อกแล้ว · พร้อมใช้งาน</span>
            </div>
            {unlockNotice && (
              <p className="text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {unlockNotice}
              </p>
            )}
            {activeFlowUrl && (
              <div className="pt-1">
                <a
                  href={activeFlowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="puppap-btn-primary px-6 py-3 text-sm sm:text-base font-black inline-flex items-center justify-center gap-2 shadow-md"
                >
                  <span>🚀 เปิดใช้งานเครื่องมือ Google Flow ทันที</span>
                  <span>↗</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Returning Customer & Unlock / Purchase Banner for non-unlocked users */}
        {!isUnlocked && (
          <div className="mt-6 w-full max-w-xl puppap-card p-5 sm:p-6 text-center space-y-5 border-2 border-[var(--border-accent)]">
            {/* Section 1: Existing Customers (Login or Enter Code) */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <span>🔑 สำหรับลูกค้าที่ซื้อแล้ว (ไม่ต้องซื้อซ้ำ)</span>
              </div>

              {!loggedIn ? (
                <div className="space-y-2.5">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    หากคุณเคยซื้อเครื่องมือนี้แล้ว กดเข้าสู่ระบบด้วย Gmail เดิม หรือกรอกรหัสปลดล็อกด้านล่างเพื่อเปิดใช้งานได้ทันทีครับ
                  </p>
                  <Link
                    href={`/login?next=/tool/${slug}`}
                    className="puppap-btn-primary w-full sm:w-auto px-6 py-3 text-sm font-black inline-flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>⚡ เข้าสู่ระบบด้วย Google (เช็กสิทธิ์อัตโนมัติ)</span>
                  </Link>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  คุณกำลังล็อกอินด้วยอีเมล <strong className="text-[var(--text-primary)]">{userEmail}</strong> — หากคุณมีรหัสผ่านเครื่องมือเดิม หรือ License Key กรอกด้านล่างเพื่อผูกสิทธิ์เข้ากับอีเมลนี้ถาวรได้เลยครับ
                </p>
              )}

              <form onSubmit={handleUnlock} className={`flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-1 ${isShaking ? 'animate-pulse' : ''}`}>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านเครื่องมือ หรือ PHM-XXXX-XXXX"
                  className="flex-1 bg-[var(--bg-deep)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-center sm:text-left text-[var(--text-primary)] text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
                />
                <button type="submit" className="puppap-btn-primary px-5 py-2.5 text-sm font-bold shrink-0">
                  🔑 ปลดล็อกทันที
                </button>
              </form>
              {error && <p className="text-[var(--danger)] text-xs mt-1 font-semibold">{error}</p>}
            </div>

            {/* Section 2: New Customers */}
            <div className="border-t border-[var(--border-light)] pt-4 space-y-2.5">
              <p className="text-xs font-bold text-[var(--text-muted)]">
                สำหรับลูกค้าใหม่ที่ยังไม่มีรหัสใช้งาน:
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                <Link href={`/checkout/${slug}`} className="puppap-btn-secondary px-5 py-2 text-xs sm:text-sm font-bold">
                  🛒 สั่งซื้อในเว็บ {tool.price ? `(${tool.price})` : ''}
                </Link>
                <a href="https://m.me/100083126689322" target="_blank" rel="noopener noreferrer" className="puppap-btn-secondary px-5 py-2 text-xs sm:text-sm font-bold">
                  💬 สอบถามทาง Messenger
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Trial Banner */}
      {isTrial && isUnlocked && (
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-amber-800 dark:text-amber-300 font-bold">🎁 โหมดทดลองใช้ฟรี (จำกัด 3 คลิป)</p>
              <p className="text-[var(--text-secondary)] text-sm">ซื้อเวอร์ชันเต็มเพื่อใช้งานไม่จำกัด!</p>
            </div>
            <Link href={`/checkout/${slug}`} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold whitespace-nowrap">
              🛒 ซื้อเวอร์ชันเต็ม
            </Link>
          </div>
        </div>
      )}

      {/* Guide Sections */}
      <main className="max-w-3xl mx-auto px-4 space-y-8">
        {guideSections.map((section: any, idx: number) => {
          const isVideo = section.style_variant === 'video';
          const isHighlight = section.style_variant === 'highlight';
          const isTip = section.style_variant === 'tip';

          // Video Section
          const videoUrl = tool?.youtube_url || section.steps?.[0]?.code_block;
          if (isVideo && videoUrl) {
            return (
              <div key={section.id || idx} className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 md:p-8 neon-border relative overflow-hidden flex flex-col items-center text-white">
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)]"></div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <span className="text-3xl">{section.icon}</span> {section.title}
                </h2>
                <div className="w-full max-w-[320px] relative rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)] border-2 border-slate-700 hover:border-cyan-400 transition-colors duration-500">
                  <div className="relative w-full" style={{ paddingTop: '177.77%' }}>
                    <iframe
                      src={`${videoUrl}?rel=0&modestbranding=1`}
                      className="absolute top-0 left-0 w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
                {section.description && (
                  <p className="text-cyan-400 text-sm mt-6 text-center bg-cyan-950/30 px-5 py-2.5 rounded-full border border-cyan-900/50">
                    💡 {section.description}
                  </p>
                )}
              </div>
            );
          }

          // Highlight Section (Phase 4 style or Tip)
          const sectionClasses = isHighlight
            ? 'bg-gradient-to-b from-slate-900 to-slate-800 border border-cyan-500/30 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)]'
            : isTip
            ? 'bg-gradient-to-b from-slate-900 to-slate-800 border border-yellow-500/30 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.1)]'
            : 'bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 neon-border relative overflow-hidden';

          return (
            <div key={section.id || idx} className={sectionClasses}>
              {!isHighlight && !isTip && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              )}
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <span className="text-3xl">{section.icon}</span> {section.title}
              </h2>
              {section.description && (
                <p className="text-slate-400 text-sm mb-6">{section.description}</p>
              )}
              <div className="space-y-4 text-slate-300">
                {section.steps?.map((step: any, stepIdx: number) => (
                  <div key={step.id || stepIdx}>
                    <div className="flex gap-4 items-start">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-cyan-400 ${isHighlight ? 'bg-cyan-900' : 'bg-slate-800'}`}>
                        {step.step_number || stepIdx + 1}
                      </div>
                      <div className="pt-1 w-full">
                        {step.title && <p className="mb-1"><strong>{step.title}:</strong> {step.content}</p>}
                        {!step.title && <p>{step.content}</p>}

                        {/* Sub Items */}
                        {step.sub_items && step.sub_items.length > 0 && (
                          <ul className="mt-2 space-y-1 text-sm text-slate-400">
                            {step.sub_items.map((item: string, i: number) => (
                              <li key={i} className="flex items-start">
                                <span className="text-cyan-500 mr-2 mt-0.5">▸</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Code Block (Tool Link) */}
                        {step.code_block && !isVideo && (() => {
                          // ใช้ flow_url จาก tool เป็นหลัก ถ้ามี ถ้าไม่มีใช้ code_block จาก step
                          // ถ้าเป็น trial → ใช้ trialFlowUrl แทน
                          const displayUrl = isTrial && trialFlowUrl ? trialFlowUrl : (tool?.flow_url || step.code_block);
                          return isUnlocked ? (
                            <div className="bg-slate-950 p-3 rounded-lg mt-2 text-sm text-slate-400 break-all border border-slate-800">
                              <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                                {displayUrl}
                              </a>
                            </div>
                          ) : (
                            <div className="relative mt-2 rounded-lg overflow-hidden border border-amber-500/30">
                              <div className="bg-slate-950 p-3 text-sm text-slate-600 blur-sm select-none">
                                https://labs.google/fx/tools/flow/shared/tool/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                                <div className="text-center">
                                  <span className="text-amber-400 text-sm font-semibold">🔒 ซื้อเพื่อปลดล็อกลิงก์</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Images */}
                        {step.image_urls && step.image_urls.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {step.image_urls.map((url: string, i: number) => (
                              <div key={i} className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                                <img src={url} alt={`Step ${step.step_number}`} className="w-full h-auto object-contain" />
                              </div>
                            ))}
                            {step.image_caption && (
                              <p className="text-center text-slate-500 text-sm">📸 {step.image_caption}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="text-center text-sm text-slate-500 mt-8">
          สงวนสิทธิ์การใช้งานสำหรับ VIP เท่านั้น
        </div>
      </main>

      <footer className="text-center mt-12 text-slate-500 text-sm">
        <Link href="/" className="text-cyan-500 hover:underline mr-4">← กลับหน้าหลัก</Link>
        © 2026 {tool.name} - {tool.version || 'v1.0'}
      </footer>
    </div>
  );
}
