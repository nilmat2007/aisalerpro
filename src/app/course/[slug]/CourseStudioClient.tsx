'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface Lesson {
  id: number;
  module_id: number;
  module_title: string;
  title: string;
  description: string;
  video_url: string;
  duration: string;
  status: 'ready' | 'coming_soon';
  is_free_preview: boolean;
  flow_tool_slug?: string;
  key_points?: string[];
}

interface CourseStudioClientProps {
  tool: any;
  hasAccess: boolean;
  user: any | null;
  initialDemoMode?: boolean;
}

// Convert normal youtube links to embed
function getEmbedUrl(url: string): string {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
  }
  return url;
}

const SAMPLE_DURATIONS = [
  '11:20 นาที', '13:45 นาที', '09:30 นาที', '15:10 นาที',
  '12:50 นาที', '14:15 นาที', '16:40 นาที', '18:25 นาที',
  '15:00 นาที', '10:35 นาที', '14:50 นาที', '17:30 นาที',
  '19:15 นาที', '22:40 นาที', '26:10 นาที', '20:50 นาที'
];

export default function CourseStudioClient({
  tool,
  hasAccess = false,
  user,
  initialDemoMode = false,
}: CourseStudioClientProps) {
  const feat = (typeof tool?.features === 'object' && tool?.features !== null) ? tool.features : {};
  const rawLessons: Lesson[] = useMemo(() => Array.isArray(feat.lessons) ? feat.lessons : [], [feat.lessons]);

  const [demoMode, setDemoMode] = useState<boolean>(initialDemoMode);
  const [activeLessonId, setActiveLessonId] = useState<number>(1);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // When demo mode is on, populate sample video and ready status for all 16 lessons
  const lessons: Lesson[] = useMemo(() => {
    if (!demoMode) return rawLessons;
    return rawLessons.map((l, idx) => ({
      ...l,
      status: 'ready' as const,
      video_url: l.video_url || 'https://www.youtube.com/embed/LsCTTWxuyvg?si=gH63wqDzCN8OoNVd',
      duration: (l.duration && l.duration !== 'รออัปเดต') ? l.duration : (SAMPLE_DURATIONS[idx] || '15:00 นาที'),
    }));
  }, [rawLessons, demoMode]);

  // Group lessons by module
  const modules = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    lessons.forEach(lesson => {
      const key = lesson.module_title || 'บทเรียนทั่วไป';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(lesson);
    });
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [lessons]);

  // Load completed lessons & last viewed lesson (Auto-Resume) from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && tool?.slug) {
      try {
        const saved = localStorage.getItem(`puppap_course_${tool.slug}_completed`);
        if (saved) {
          setCompletedIds(JSON.parse(saved));
        }
        const lastLesson = localStorage.getItem(`puppap_course_${tool.slug}_last_lesson`);
        if (lastLesson) {
          const parsedId = parseInt(lastLesson, 10);
          if (parsedId && lessons.some(l => l.id === parsedId)) {
            setActiveLessonId(parsedId);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [tool?.slug]);

  // Save last active lesson for Auto-Resume
  useEffect(() => {
    if (typeof window !== 'undefined' && tool?.slug && activeLessonId) {
      try {
        localStorage.setItem(`puppap_course_${tool.slug}_last_lesson`, String(activeLessonId));
      } catch (e) {}
    }
  }, [tool?.slug, activeLessonId]);

  // Toggle completion
  const toggleComplete = (id: number) => {
    setCompletedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (typeof window !== 'undefined' && tool?.slug) {
        localStorage.setItem(`puppap_course_${tool.slug}_completed`, JSON.stringify(next));
      }
      return next;
    });
  };

  const activeLesson = lessons.find(l => l.id === activeLessonId) || lessons[0];
  const activeIndex = lessons.findIndex(l => l.id === activeLessonId);
  const prevLesson = activeIndex > 0 ? lessons[activeIndex - 1] : null;
  const nextLesson = activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;

  const effectiveHasAccess = hasAccess || demoMode;
  const canViewActiveLesson = effectiveHasAccess || activeLesson?.is_free_preview;
  const progressPercent = lessons.length > 0 ? Math.round((completedIds.length / lessons.length) * 100) : 0;

  const embedUrl = activeLesson ? getEmbedUrl(activeLesson.video_url) : '';
  const isVideoReady = Boolean(embedUrl) && activeLesson?.status === 'ready';

  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col transition-colors duration-200">
      {/* Studio Header */}
      <header className="sticky top-0 z-50 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border-light)] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/courses" className="shrink-0 group flex items-center gap-2">
              <img
                src="/images/logo-puppap-ai.png"
                alt="PUP PAP AI"
                className="w-10 h-10 rounded-2xl object-cover border-[1.5px] border-[var(--border)] bg-white shadow-xs group-hover:scale-105 transition-transform"
              />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--accent)] hidden sm:inline">คอร์สเรียน</span>
                <span className="text-xs text-[var(--text-muted)] hidden sm:inline">•</span>
                <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                  {tool?.name || 'ปั้นนายหน้า TikTok ด้วย AI ปักตะกร้า'}
                </h1>
                {effectiveHasAccess ? (
                  <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ✓ {demoMode ? 'โหมดจำลอง (พรีวิวครบ 16 บท)' : 'สิทธิ์เรียนตลอดชีพ'}
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    🎁 ตัวอย่างฟรี
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {activeLesson ? `บทที่ ${activeLesson.id}: ${activeLesson.title}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Progress Pill on Desktop */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-deep)] border border-[var(--border-light)] text-xs font-medium">
              <span className="text-[var(--accent)] font-bold">{progressPercent}%</span>
              <span>เรียนแล้ว ({completedIds.length}/{lessons.length})</span>
            </div>

            <ThemeToggle size="sm" />

            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden puppap-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
            >
              <span>📑 สารบัญ</span>
              <span className="px-1.5 py-0.2 bg-[var(--accent)] text-white rounded-full text-[10px]">
                {activeLesson?.id}
              </span>
            </button>

            <Link
              href="/"
              className="puppap-btn-secondary hidden sm:inline-flex px-3 py-1.5 text-xs"
            >
              แดชบอร์ด
            </Link>
          </div>
        </div>
      </header>

      {/* 🎬 Preview Mode Bar (ให้แอดมินหรือผู้ใช้ทดสอบดูหน้าตาจริงตอนใส่คลิปครบ) */}
      <div className="bg-[var(--bg-deep)] border-b border-[var(--border-light)] px-4 py-2 text-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold text-[11px]">
            {demoMode ? '🎬 โหมดจำลองเนื้อหาครบ 16 บท' : '📊 โหมดข้อมูลจริงจาก Database'}
          </span>
          <span className="text-[var(--text-secondary)] hidden sm:inline">
            {demoMode 
              ? 'ระบบจำลองคลิป 16:9 และระยะเวลาให้เสมือนใส่คลิปจริงครบทั้ง 16 บทเรียน' 
              : 'แสดงผลตามฐานข้อมูลจริงปัจจุบัน (กำลังเตรียมเนื้อหา)'}
          </span>
        </div>
        <button
          onClick={() => setDemoMode(!demoMode)}
          className="puppap-btn-secondary px-3 py-1 text-xs font-bold hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5"
        >
          <span>{demoMode ? '🔄 สลับเป็นข้อมูลจริง DB' : '✨ เปิดโหมดจำลองดูคลิปครบ 16 บท'}</span>
        </button>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6 relative">
        {/* Left Column: 16:9 Video Player & Lesson Content */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* 16:9 Landscape Video Container */}
          <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-[var(--border)] bg-black shadow-xl relative flex items-center justify-center">
            {canViewActiveLesson ? (
              isVideoReady ? (
                <iframe
                  src={embedUrl}
                  title={activeLesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                /* Graceful Coming Soon / In Production Placeholder */
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-stone-900 via-stone-950 to-neutral-900 text-white relative overflow-hidden">
                  {/* Subtle Background Pattern */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  
                  <div className="relative z-10 max-w-md space-y-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[var(--accent)] text-white flex items-center justify-center text-3xl sm:text-4xl mx-auto shadow-lg animate-pulse">
                      🎬
                    </div>
                    <div className="space-y-1.5">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ⏳ อยู่ระหว่างผลิตเนื้อหาวิดีโอ
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                        บทที่ {activeLesson?.id}: {activeLesson?.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                        เนื้อหาวิดีโอความยาวประมาณ 10-15 นาที กำลังบันทึกและตัดต่อ
                        ท่านสามารถอ่านสรุปหัวข้อและเนื้อหาสำคัญด้านล่างได้ทันทีครับ
                      </p>
                    </div>

                    {activeLesson?.is_free_preview && (
                      <span className="inline-block text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-3 py-0.5 rounded-full">
                        🎁 บทนี้เปิดให้ดูฟรีเมื่อคลิปพร้อมใช้งาน
                      </span>
                    )}
                  </div>
                </div>
              )
            ) : (
              /* Locked State for non-purchasers */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-stone-950 text-white relative">
                <div className="max-w-md space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-stone-800 text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-md">
                    🔒
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">
                    บทเรียนนี้สำหรับสมาชิกที่สมัครคอร์ส
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400">
                    ปลดล็อกทั้ง 16 บทเรียนพร้อมเครื่องมือ AI และเทคนิคปักตะกร้าครบสูตร
                  </p>
                  <Link
                    href={`/checkout/${tool?.slug || 'tiktok-ai-affiliate'}`}
                    className="puppap-btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold shadow-lg"
                  >
                    <span>🛒 สมัครเรียนและปลดล็อกคอร์สนี้</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Lesson Controls & Progress Bar */}
          <div className="puppap-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start flex-wrap">
              <button
                onClick={() => prevLesson && setActiveLessonId(prevLesson.id)}
                disabled={!prevLesson}
                className="puppap-btn-secondary px-4 py-2.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
              >
                <span>◀ บทก่อนหน้า</span>
                {prevLesson && <span className="opacity-70 hidden md:inline">({prevLesson.id})</span>}
              </button>

              <button
                onClick={() => nextLesson && setActiveLessonId(nextLesson.id)}
                disabled={!nextLesson}
                className={`px-5 py-2.5 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 rounded-full transition-transform ${
                  nextLesson
                    ? 'puppap-btn-primary shadow-md hover:scale-105 active:scale-95'
                    : 'puppap-btn-secondary'
                }`}
              >
                <span>บทถัดไป ▶</span>
                {nextLesson && <span className="text-[11px] font-bold">({nextLesson.id})</span>}
              </button>
            </div>

            {/* Mark as Completed Button */}
            <button
              onClick={() => activeLesson && toggleComplete(activeLesson.id)}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-xs ${
                completedIds.includes(activeLesson?.id || 0)
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-[var(--bg-deep)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-emerald-500'
              }`}
            >
              <span className="text-sm">{completedIds.includes(activeLesson?.id || 0) ? '✅' : '⚪'}</span>
              <span>
                {completedIds.includes(activeLesson?.id || 0)
                  ? 'เรียนบทนี้จบแล้ว'
                  : 'ทำเครื่องหมายว่าเรียนจบแล้ว'}
              </span>
            </button>
          </div>

          {/* Lesson Details Card */}
          <div className="puppap-card p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] mb-1">
                <span>{activeLesson?.module_title}</span>
                <span>•</span>
                <span>บทที่ {activeLesson?.id} จาก {lessons.length}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                {activeLesson?.title}
              </h2>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {activeLesson?.description}
            </p>

            {/* Key Takeaways / Points */}
            {activeLesson?.key_points && activeLesson.key_points.length > 0 && (
              <div className="p-4 rounded-xl bg-[var(--bg-deep)] border border-[var(--border-light)] space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>📌</span> สิ่งที่คุณจะได้เรียนรู้ในบทนี้
                </h4>
                <ul className="space-y-1.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                  {activeLesson.key_points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[var(--accent)] font-bold">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Flow Tool Box */}
            {activeLesson?.flow_tool_slug && (
              <div className="p-4 rounded-xl border border-[var(--border-accent)] bg-[var(--accent-dim)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)]">
                    <span>⚡</span> เครื่องมือ Flow แนะนำสำหรับบทนี้
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    กดเปิดเครื่องมือ Google Flow เพื่อลงมือทำตามบทเรียนได้ทันที
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-1 shrink-0">
                  <Link
                    href={`/tool/${activeLesson.flow_tool_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="puppap-btn-primary px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm hover:scale-105 transition-transform"
                  >
                    <span>🚀 เปิดเครื่องมือ Flow (แท็บใหม่)</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                  <span className="text-[10px] text-[var(--text-muted)] italic">
                    💡 คลิปยังคงเปิดอยู่ที่แท็บนี้ ไม่ต้องกลัวหาย
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* FAQ & Beginner Guide Accordion / Help Center for Low-Tech Learners */}
          <div className="puppap-card p-5 sm:p-6 space-y-4 border-[var(--border-light)]">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[var(--border-light)]">
              <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-[var(--accent)]">❓</span> คำถามที่พบบ่อย & ศูนย์ช่วยเหลือ (สำหรับผู้เริ่มต้น)
              </h3>
              <a
                href="https://m.me/100083126689322"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--accent)] hover:underline font-bold flex items-center gap-1"
              >
                <span>💬 ทักแชทสอบถามแอดมิน</span>
                <span>→</span>
              </a>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-[var(--bg-deep)] border border-[var(--border-light)] space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="text-[var(--accent)]">Q:</span> เข้าเรียนในครั้งต่อไปอย่างไร? ต้องจำรหัสผ่านไหม?
                </h4>
                <p className="text-[var(--text-secondary)] pl-5 leading-relaxed">
                  ไม่ต้องจำรหัสผ่านครับ เพียงเปิดเว็บนี้ แล้วกด "เข้าสู่ระบบด้วย Google" ด้วยบัญชี Gmail เดิม ระบบจะจำสิทธิ์และเปิดห้องเรียนให้ทันทีตลอดชีพครับ
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-deep)] border border-[var(--border-light)] space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="text-[var(--accent)]">Q:</span> ดูผ่านโทรศัพท์มือถือ หรือแท็บเล็ตได้ไหม?
                </h4>
                <p className="text-[var(--text-secondary)] pl-5 leading-relaxed">
                  ดูได้ 100% ครับ ทั้งมือถือ Android, iPhone, iPad และคอมพิวเตอร์ โดยภาพวิดีโอ 16:9 จะปรับขนาดให้พอดีหน้าจออัตโนมัติ (แนะนำให้หมุนมือถือเป็นแนวนอนเพื่อความคมชัดเต็มตา)
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-deep)] border border-[var(--border-light)] space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="text-[var(--accent)]">Q:</span> ซื้อครั้งเดียวเรียนได้ทุกบทจริงไหม มีค่าใช้จ่ายรายเดือนไหม?
                </h4>
                <p className="text-[var(--text-secondary)] pl-5 leading-relaxed">
                  จริงครับ ชำระเงิน 990 บาทครั้งเดียว เรียนได้ครบทั้ง 16 บทเรียนตลอดชีพ ไม่มีค่าธรรมเนียมรายเดือน และหากมีบทเรียนอัปเดตใหม่ในอนาคต ท่านจะได้รับสิทธิ์เข้าดูฟรีทันทีครับ
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-deep)] border border-[var(--border-light)] space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="text-[var(--accent)]">Q:</span> ถ้าคลิปไม่เล่น หรือดูไม่ได้ต้องทำอย่างไร?
                </h4>
                <p className="text-[var(--text-secondary)] pl-5 leading-relaxed">
                  หากวิดีโอนิ่งหรือไม่ยอมเล่น ให้กดปุ่ม Refresh (โหลดหน้าใหม่) หรือตรวจสอบสัญญาณอินเทอร์เน็ตของท่าน หากยังพบปัญหา สามารถกดปุ่มทักแชทแอดมินด้านบนเพื่อให้ทีมงานดูแลได้ทันทีครับ
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Mobile Backdrop for Drawer */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-16 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Right Column: Curriculum Playlist Sidebar (Desktop & Mobile Drawer) */}
        <aside
          className={`fixed top-16 bottom-0 right-0 z-40 w-80 sm:w-88 bg-[var(--bg-card)] border-l border-[var(--border)] p-4 sm:p-5 overflow-y-auto transform transition-transform duration-300 lg:static lg:top-auto lg:bottom-auto lg:w-88 lg:translate-x-0 lg:rounded-2xl lg:border lg:p-5 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:sticky lg:top-20 lg:z-10 ${
            sidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Header */}
          <div className="sticky -top-4 sm:-top-5 -mt-4 sm:-mt-5 pt-4 sm:pt-5 bg-[var(--bg-card)] z-10 pb-4 mb-4 border-b border-[var(--border-light)] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">สารบัญ {lessons.length} บทเรียน</h3>
              <p className="text-xs text-[var(--text-muted)]">
                ความคืบหน้า: {progressPercent}% ({completedIds.length}/{lessons.length})
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden puppap-btn-secondary px-2.5 py-1 text-xs font-bold flex items-center gap-1"
            >
              <span>✕</span>
              <span>ปิด</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--bg-deep)] h-2 rounded-full overflow-hidden mb-5 border border-[var(--border-light)]">
            <div
              className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Modules List */}
          <div className="space-y-5">
            {modules.map((mod, modIdx) => (
              <div key={modIdx} className="space-y-2">
                <h4 className="text-xs font-bold text-[var(--accent)] tracking-tight px-1">
                  {mod.title}
                </h4>

                <div className="space-y-1.5">
                  {mod.items.map((lesson) => {
                    const isActive = lesson.id === activeLessonId;
                    const isDone = completedIds.includes(lesson.id);
                    const isLocked = !effectiveHasAccess && !lesson.is_free_preview;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setActiveLessonId(lesson.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 border ${
                          isActive
                            ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)] font-bold shadow-xs'
                            : 'bg-[var(--bg-primary)] border-transparent hover:border-[var(--border-light)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {/* Status Icon */}
                        <span className="shrink-0 mt-0.5 text-xs">
                          {isDone ? (
                            <span className="text-emerald-500 font-bold">✓</span>
                          ) : isActive ? (
                            <span className="text-[var(--accent)] animate-pulse">▶</span>
                          ) : isLocked ? (
                            <span className="text-[var(--text-muted)]">🔒</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">○</span>
                          )}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">
                              {lesson.id}. {lesson.title}
                            </span>
                            {lesson.is_free_preview && !effectiveHasAccess && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 font-bold">
                                ฟรี
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5">
                            {lesson.status === 'coming_soon' ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                ⏳ เร็วๆ นี้
                              </span>
                            ) : (
                              <span>{lesson.duration || 'พร้อมดู'}</span>
                            )}
                            {lesson.flow_tool_slug && (
                              <span className="text-[var(--accent)] font-mono font-bold">• Flow</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA for non-members */}
          {!effectiveHasAccess && (
            <div className="mt-6 pt-4 border-t border-[var(--border-light)] text-center space-y-2">
              <p className="text-xs text-[var(--text-muted)]">สมัครเรียนเพื่อปลดล็อกครบทั้ง 16 บท</p>
              <Link
                href={`/checkout/${tool?.slug || 'tiktok-ai-affiliate'}`}
                className="puppap-btn-primary w-full py-2 text-xs font-bold block"
              >
                🛒 สมัครเรียน 990 บาท
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        ></div>
      )}
    </div>
  );
}
