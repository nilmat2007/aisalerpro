'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FlowToolCard from '@/components/FlowToolCard';
import ThemeToggle from '@/components/ThemeToggle';

interface FlowToolsClientProps {
  tools: any[];
  user: any | null;
  userTools: any[];
  userTrials: any[];
}

export default function FlowToolsClient({
  tools = [],
  user,
  userTools = [],
  userTrials = [],
}: FlowToolsClientProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trialToolIds, setTrialToolIds] = useState<Set<string>>(
    new Set(userTrials?.map((t: any) => t.tool_id) || [])
  );
  const [startingTrialId, setStartingTrialId] = useState<string | null>(null);

  const ownedToolIds = useMemo(
    () => new Set(userTools?.map((ut: any) => ut.tool_id) || []),
    [userTools]
  );

  const handleStartTrial = async (toolId: string) => {
    if (!user) {
      router.push('/login?next=/flow-tools');
      return;
    }
    setStartingTrialId(toolId);
    try {
      const res = await fetch('/api/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId }),
      });
      const data = await res.json();
      if (data.success || data.alreadyTried) {
        setTrialToolIds((prev) => new Set([...prev, toolId]));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStartingTrialId(null);
    }
  };

  const categories = [
    { id: 'all', label: 'ทั้งหมด', icon: '❖' },
    { id: 'hardsell', label: '📢 คลิปขายสินค้า / Ads', icon: '📢' },
    { id: 'film', label: '🎬 ละครสั้น / ซีรีส์', icon: '🎬' },
    { id: 'podcast', label: '🎙️ พอดแคสต์ AI', icon: '🎙️' },
    { id: 'showhow', label: '🧼 ทำให้ดู / โชว์สินค้า', icon: '🧼' },
    { id: 'trial', label: '🎁 ทดลองฟรี 3 คลิป', icon: '🎁' },
  ];

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      // Must be active unless it's a preview
      if (!tool.is_active && !tool.is_coming_soon) return false;

      // Category filter
      const feat = (typeof tool.features === 'object' && tool.features !== null && !Array.isArray(tool.features))
        ? tool.features
        : {};

      if (selectedCategory === 'trial') {
        if (!tool.trial_enabled || !tool.trial_flow_url) return false;
      } else if (selectedCategory !== 'all') {
        const catMatch = (feat.category || '').toLowerCase() === selectedCategory.toLowerCase();
        const tagMatch = Array.isArray(feat.tags) && feat.tags.some((t: string) => t.toLowerCase().includes(selectedCategory.toLowerCase()));
        if (!catMatch && !tagMatch) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (tool.name || '').toLowerCase().includes(q);
        const descMatch = (tool.description || '').toLowerCase().includes(q);
        const tagsMatch = Array.isArray(feat.tags) && feat.tags.some((t: string) => t.toLowerCase().includes(q));
        if (!nameMatch && !descMatch && !tagsMatch) return false;
      }

      return true;
    });
  }, [tools, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen text-[var(--text-primary)] transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-light)] shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/images/logo-puppap-ai.png"
              alt="PUP PAP AI"
              className="w-10 h-10 rounded-2xl object-cover border-[1.5px] border-[var(--border)] bg-white shadow-xs group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[var(--text-primary)]">
                PUP PAP <span className="text-[var(--accent)]">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                FLOW TOOLS
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] px-2.5 py-1.5 transition-colors"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/store"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] px-2.5 py-1.5 transition-colors"
            >
              ร้านค้า
            </Link>

            <ThemeToggle size="sm" />

            {user ? (
              <Link
                href="/"
                className="puppap-btn-primary px-3 sm:px-4 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
              >
                <span>แดชบอร์ด</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <Link
                href="/login"
                className="puppap-btn-primary px-3 sm:px-4 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
              >
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Header Section */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6 overflow-hidden border-b border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-secondary)]/50 to-[var(--bg-primary)]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-bold mb-4 shadow-xs">
            <span>✨</span>
            <span>เครื่องมือ Google Flow · คิดปุ๊บ คลิปปั๊บ</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--text-primary)] leading-tight mb-4">
            เครื่องมือ Flow พร้อมใช้ <span className="text-[var(--accent)]">{tools.length}+</span> ตัว
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto mb-6 leading-relaxed">
            แอปที่รันบนเว็บ Google Flow — เปิดจากลิงก์ได้ทันที ไม่ต้องติดตั้งโปรแกรม
            พร้อมโมเดล AI ล่าสุด (Omni 1.1 Flash, Veo 3.1, Imagen 4) อัปเดตตลอดชีพ
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm">
            {user ? (
              <Link
                href="/"
                className="puppap-btn-primary px-6 py-2.5 font-bold shadow-md flex items-center gap-2"
              >
                <span>🚀 เข้าใช้งานแดชบอร์ดของคุณ</span>
              </Link>
            ) : (
              <Link
                href="/login?next=/flow-tools"
                className="puppap-btn-primary px-6 py-2.5 font-bold shadow-md flex items-center gap-2"
              >
                <span>สมัครสมาชิก / เข้าสู่ระบบ → ปลดล็อก Flow Tools</span>
              </Link>
            )}
            <a
              href="#how-it-works"
              className="puppap-btn-secondary px-5 py-2.5 font-medium flex items-center gap-1.5"
            >
              <span>วิธีใช้งานใน 3 ขั้นตอน →</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Search & Category Filter Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-2 sm:pb-0 scrollbar-none">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                      isActive
                        ? 'bg-[var(--accent)] text-white border-[var(--border)] shadow-sm'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 ค้นหาเครื่องมือ..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border-light)] rounded-full px-4 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] outline-none shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
              <FlowToolCard
                key={tool.id}
                tool={tool}
                hasAccess={ownedToolIds.has(tool.id)}
                hasTrial={trialToolIds.has(tool.id)}
                onStartTrial={handleStartTrial}
                isStartingTrial={startingTrialId === tool.id}
              />
            ))}
          </div>
        ) : (
          <div className="puppap-card p-12 text-center space-y-3">
            <span className="text-4xl">🔍</span>
            <h3 className="text-base font-bold text-[var(--text-primary)]">ไม่พบเครื่องมือที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-[var(--text-muted)]">ลองเลือกหมวดหมู่อื่น หรือพิมพ์คำค้นหาใหม่อีกครั้ง</p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="puppap-btn-secondary px-4 py-1.5 text-xs mt-2"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}

        {/* How It Works Section */}
        <section id="how-it-works" className="puppap-card p-6 sm:p-8 mt-12 border-[var(--border-light)]">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mb-2">
              วิธีใช้งาน Flow Tools ง่ายๆ ใน 3 ขั้นตอน
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              ทำงานร่วมกับ Google Flow อัจฉริยะ คิดปุ๊บ คลิปปั๊บ ใช้งานได้ทันที
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border-light)] space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white font-black text-sm flex items-center justify-center shadow-sm">
                1
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">เลือกเครื่องมือ & กดเปิดแอป</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                เลือกลักษณะคอนเทนต์ที่ต้องการทำ เช่น คลิปขายของดุ, ละครสั้น, พอดแคสต์ แล้วกดปุ่ม &quot;เปิดใช้ Flow Tool&quot;
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border-light)] space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white font-black text-sm flex items-center justify-center shadow-sm">
                2
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">วางหัวข้อสินค้าหรือพล็อตเรื่อง</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                ใส่รายละเอียดสินค้า ลิงก์สินค้า หรือไอเดียเรื่องสั้นลงในช่องคำสั่งที่เตรียมไว้ให้
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border-light)] space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white font-black text-sm flex items-center justify-center shadow-sm">
                3
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">ได้คลิปพร้อมขายทันที</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                AI จะเรนเดอร์ภาพและวิดีโอพร้อมสคริปต์อัตโนมัติ นำไปโพสต์ Shopee, TikTok, Reels ได้ทันที
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[var(--border-light)] py-8 text-center text-xs text-[var(--text-muted)]">
        <p>© 2026 PUP PAP AI — คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม</p>
      </footer>
    </div>
  );
}
