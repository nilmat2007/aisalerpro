'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatToolUpdateDate } from '@/lib/date-utils';
import ThemeToggle from '@/components/ThemeToggle';
import { getPriceInfo } from '@/lib/price-utils';
import { getToolFlowLink, getToolTutorialEmbedUrl } from '@/lib/sanitize-tool';

export default function ToolGuideClient({
  slug,
  hasAccess,
  loggedIn,
  userEmail = '',
  isTrial = false,
  trialFlowUrl = '',
  initialFlowUrl = '',
  initialTutorialVideoUrl = '',
}: {
  slug: string;
  hasAccess: boolean;
  loggedIn: boolean;
  userEmail?: string;
  isTrial?: boolean;
  trialFlowUrl?: string;
  initialFlowUrl?: string;
  initialTutorialVideoUrl?: string;
}) {
  const router = useRouter();

  const [tool, setTool] = useState<any>(null);
  const [guideSections, setGuideSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(hasAccess);
  const [unlockedFlowUrl, setUnlockedFlowUrl] = useState(initialFlowUrl);
  const [unlockedTutorialVideoUrl, setUnlockedTutorialVideoUrl] = useState(initialTutorialVideoUrl);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [unlockNotice, setUnlockNotice] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVideoLoading(false), 3200);
    return () => clearTimeout(timer);
  }, [unlockedTutorialVideoUrl]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement && !isFullscreen) {
      if (playerContainerRef.current.requestFullscreen) {
        playerContainerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/tools`);
        if (!res.ok) throw new Error('Failed to fetch tools');
        const tools = await res.json();
        const currentTool = tools.find((t: any) => t.slug === slug);
        
        if (!currentTool || ((!currentTool.is_active || currentTool.is_coming_soon) && !hasAccess)) {
          router.push('/store');
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
    if (!password.trim() || isUnlocking) return;

    setIsUnlocking(true);
    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId: tool.id, password: password.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsUnlocked(true);
        const returnedFlowLink = getToolFlowLink(data.tool || data);
        if (returnedFlowLink) {
          setUnlockedFlowUrl(returnedFlowLink);
        }
        const returnedVideoUrl = data.tool?.demo_video_url || data.demo_video_url || '';
        if (returnedVideoUrl) {
          setUnlockedTutorialVideoUrl(String(returnedVideoUrl));
          setIsVideoLoading(true);
        }
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
    } finally {
      setIsUnlocking(false);
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

  const activeFlowUrl = isTrial && trialFlowUrl ? trialFlowUrl : (unlockedFlowUrl || getToolFlowLink(tool));
  const priceInfo = getPriceInfo(tool.price, tool.features);
  const feat = typeof tool.features === 'object' && tool.features !== null && !Array.isArray(tool.features) ? tool.features : {};
  const isCourseBonusTool =
    feat.included_in_course_slug === 'tiktok-ai-affiliate' ||
    feat.bundle_with_course === 'tiktok-ai-affiliate' ||
    slug === 'puppap-fashion-studio' ||
    slug === 'puppap-ugc-product';
  const embedTutorialUrl = getToolTutorialEmbedUrl(unlockedTutorialVideoUrl);

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
              <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <a
                  href={activeFlowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="puppap-btn-primary px-6 py-3 text-sm sm:text-base font-black inline-flex items-center justify-center gap-2 shadow-md"
                >
                  <span>🚀 เปิดใช้งานเครื่องมือ Google Flow ทันที</span>
                  <span>↗</span>
                </a>
                {embedTutorialUrl && (
                  <a
                    href="#tutorial-video-section"
                    className="puppap-btn-secondary px-5 py-3 text-xs sm:text-sm font-black inline-flex items-center justify-center gap-2 border-2 border-amber-500/50 text-amber-800 dark:text-amber-300"
                  >
                    <span>🎬 ดูคลิปสอนใช้งานด้านล่าง</span>
                    <span>↓</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Returning Customer & Unlock / Purchase Banner for non-unlocked users */}
        {!isUnlocked && (
          <div className="mt-6 w-full max-w-xl puppap-card p-5 sm:p-6 text-center space-y-5 border-2 border-[var(--border-accent)]">
            {/* Section 1: New Customers — Prominent Price & Instant Buy CTA (only if tool is active & not coming soon) */}
            {priceInfo.hasPrice && tool.is_active && !tool.is_coming_soon && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-deep)] border-2 border-[var(--border-accent)] space-y-3 shadow-sm">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black">
                    🔥 โปรโมชันลด {priceInfo.discountPercent}%
                  </span>
                  <span className="text-xs font-bold text-[var(--text-secondary)]">
                    ซื้อขาดครั้งเดียว · ใช้งานและอัปเดตฟรีตลอดชีพ
                  </span>
                </div>

                <div className="flex items-baseline justify-center gap-3 flex-wrap">
                  <span className="text-sm sm:text-base text-[var(--text-muted)] line-through font-semibold">
                    ราคาปกติ ฿{priceInfo.formattedOriginal}
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-[var(--accent)] leading-none">
                    ฿{priceInfo.formattedPrice}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-secondary)]">
                    บาท
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
                  <Link
                    href={`/checkout/${slug}`}
                    className="puppap-btn-primary px-6 py-3.5 text-sm sm:text-base font-black shadow-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    <span>🛒 สั่งซื้อและเปิดสิทธิ์ทันที ฿{priceInfo.formattedPrice}</span>
                  </Link>
                  <a
                    href="https://m.me/100083126689322"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="puppap-btn-secondary px-4 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5"
                  >
                    <span>💬 สอบถามทาง Messenger</span>
                  </a>
                </div>

                {isCourseBonusTool && (
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-left space-y-1.5">
                    <div className="text-xs sm:text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <span>🎁</span>
                      <span>โปรโมชันสุดคุ้ม! ราคาเปิดตัว ฿299 ได้ครบคอร์ส 22 บท + แถมฟรี 2 เครื่องมือ AI มูลค่ารวม ฿598 (แยกซื้อชิ้นละ ฿299)</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      ไม่ว่าคุณจะกดซื้อเครื่องมือนี้ ฿299 หรือสมัครคอร์สเรียน <strong>ปั้นนายหน้า TikTok ด้วย AI (฿299)</strong> ระบบจะปลดล็อกให้ครบทั้ง <strong>คอร์สเรียน 22 บท + PUP PAP Fashion Studio + PUPPAP AI UGC Product</strong> พร้อมกันทันที!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Existing Customers (Login or Enter Code) */}
            <div className="space-y-3 pt-1">
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
                    className="puppap-btn-secondary w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2"
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
                <button
                  type="submit"
                  disabled={!password.trim() || isUnlocking}
                  className="puppap-btn-primary px-5 py-2.5 text-sm font-bold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUnlocking ? '⏳ กำลังปลดล็อก...' : '🔑 ปลดล็อกทันที'}
                </button>
              </form>
              {error && <p className="text-[var(--danger)] text-xs mt-1 font-semibold">{error}</p>}
            </div>
          </div>
        )}
      </header>

      {/* Trial Banner */}
      {isTrial && isUnlocked && (
        <div className="max-w-3xl mx-auto px-4 mb-8">
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

      {/* Guide Sections & Embedded Tutorial Video */}
      <main id="tutorial-video-section" className="max-w-3xl mx-auto px-4 space-y-8">
        {(embedTutorialUrl || isCourseBonusTool) && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 md:p-8 neon-border relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5 !text-white" style={{ color: '#ffffff' }}>
                <span className="text-2xl sm:text-3xl">🎬</span>
                <span>คลิปวิดีโอสอนใช้งาน {tool.name} แบบจับมือทำ</span>
              </h2>
              {isUnlocked && embedTutorialUrl && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start sm:self-auto">
                  <span>▶</span>
                  <span>พร้อมรับชม</span>
                </span>
              )}
            </div>
            <p className="text-slate-300 text-xs sm:text-sm mb-5">
              แนะนำให้ดูคลิปสอนใช้งานด้านล่างควบคู่กับคู่มือทีละขั้นตอน เพื่อให้เข้าใจการตั้งค่าและสร้างคลิปรีวิวปักตะกร้าได้ทันทีครับ
            </p>

            <div
              ref={playerContainerRef}
              className={`overflow-hidden relative flex items-center justify-center select-none transition-all ${
                isFullscreen
                  ? 'fixed inset-0 z-[9999] rounded-none border-0 w-screen h-screen bg-black'
                  : 'w-full aspect-video rounded-2xl border-2 border-slate-700 bg-black shadow-xl'
              }`}
            >
              {isUnlocked && embedTutorialUrl ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  {isVideoLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-stone-950/90 text-white p-4 text-center pointer-events-none">
                      <div className="w-11 h-11 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin mb-3" />
                      <p className="text-xs sm:text-sm font-bold text-white">
                        🎬 กำลังโหลดคลิปสอนใช้งาน {tool.name}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1">กรุณารอสักครู่...</p>
                    </div>
                  )}

                  <iframe
                    key={embedTutorialUrl}
                    src={embedTutorialUrl}
                    title={`คลิปสอนใช้งาน ${tool.name}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setIsVideoLoading(false)}
                    className="w-full h-full border-0"
                  />

                  {/* UI Deterrent Overlays (Note: UI deterrent against casual pop-out clicks, not DRM) */}
                  <div
                    className="absolute top-0 left-0 right-0 h-16 z-20 cursor-default bg-transparent"
                    title="PUP PAP AI Embedded Video Player"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  />
                  <div
                    className="absolute top-0 right-0 w-24 h-20 z-20 cursor-default bg-transparent"
                    title="PUP PAP AI Embedded Video Player"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  />
                  <div
                    className="absolute bottom-0 right-0 w-20 h-10 z-20 cursor-default bg-transparent"
                    title="PUP PAP AI Embedded Video Player"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  />

                  {/* Watermark from Server Session Email (Deterrent) */}
                  <div className="absolute top-3 left-3 z-30 pointer-events-none select-none flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-xs border border-white/15 text-xs font-mono text-white/75 tracking-wide shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{userEmail || 'สมาชิก PUP PAP AI'}</span>
                  </div>

                  {/* Smart Fullscreen Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-lg bg-black/65 hover:bg-black/85 backdrop-blur-xs text-white/85 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-all shadow-md active:scale-95"
                    title={isFullscreen ? 'ย่อหน้าจอ' : 'ขยายเต็มจอ (Smart Fullscreen)'}
                  >
                    <span>{isFullscreen ? '🗗 ย่อจอ' : '⛶ เต็มจอ'}</span>
                  </button>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-stone-950 text-white relative">
                  <div className="max-w-md space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-stone-800 text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-md">
                      🔒
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold !text-white" style={{ color: '#ffffff' }}>
                      คลิปสอนใช้งานสำหรับสมาชิกที่ปลดล็อกเครื่องมือแล้ว
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                      ปลดล็อกเครื่องมือนี้เพียง ฿{priceInfo.formattedPrice} (แถมฟรีคอร์สเรียน 22 บท + เครื่องมือ AI ครบ 3 รายการ) เพื่อรับชมคลิปสอนแบบจับมือทำและเปิดใช้งานเครื่องมือได้ทันทีครับ
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                      <Link
                        href={`/checkout/${slug}`}
                        className="puppap-btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold shadow-lg"
                      >
                        <span>🛒 สั่งซื้อและเปิดสิทธิ์ทันที ฿{priceInfo.formattedPrice}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 !text-white" style={{ color: '#ffffff' }}>
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
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 !text-white" style={{ color: '#ffffff' }}>
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
                          const displayUrl = isTrial && trialFlowUrl ? trialFlowUrl : (activeFlowUrl || step.code_block);
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
