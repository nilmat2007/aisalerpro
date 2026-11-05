'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import CoursePosterLightbox from '@/components/CoursePosterLightbox';
import { getPriceInfo } from '@/lib/price-utils';
import { captureUtmContent, fbViewContent } from '@/lib/meta-pixel';

interface CoursesClientProps {
  course: any;
  hasAccess: boolean;
  user: any | null;
}

export default function CoursesClient({
  course,
  hasAccess,
  user,
}: CoursesClientProps) {
  const feat = (typeof course?.features === 'object' && course?.features !== null) ? course.features : {};
  const lessons = Array.isArray(feat.lessons) ? feat.lessons : [];
  const priceInfo = getPriceInfo(course?.price || '299', feat);

  const [expandedModule, setExpandedModule] = useState<number | null>(1);

  useEffect(() => {
    captureUtmContent();
    fbViewContent({
      contentName: course?.slug || 'tiktok-ai-affiliate',
      contentId: course?.slug || 'tiktok-ai-affiliate',
      value: priceInfo.numericPrice || 299,
      currency: 'THB',
    });
  }, [course?.slug, priceInfo.numericPrice]);

  const modules = useMemo(() => {
    if (!lessons.length) return [];

    const map = new Map<string, any[]>();
    lessons.forEach((lesson: any) => {
      const key = lesson.module_title || 'บทเรียนทั่วไป';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(lesson);
    });

    const defaultDescMap: Record<string, string> = {
      'โมดูล 1: ปูพื้นฐาน & กฎเหล็กนายหน้ายุค AI': 'ทำความเข้าใจระบบ TikTok Shop อัลกอริทึม ข้อได้เปรียบของ AI และกฎป้องกันการโดนแบน',
      'โมดูล 2: พื้นฐานการใช้งาน Google Flow ตัวใหม่แบบจับมือทำ': 'เจาะลึกทุกปุ่มของ Google Flow ตัวใหม่ วิธีลบลายน้ำถาวร ทำภาพวิว/สัตว์ ล็อกหน้าเรา 100% นางแบบถือสินค้า และผัก 3D พูดได้',
      'โมดูล 3: เวิร์กโฟลว์ปฏิบัติการสร้างคลิปจริง': 'เจาะลึกวิธีทำคลิป AI ปักตะกร้า, คลิปสไตล์มินิมอล และคลิปสไตล์โรงงานปักตะกร้า',
      'โมดูล 4: การตลาด ปั๊มยอดวิว & สเกลรายได้': 'เทคนิคการโพสต์ แฮชแท็ก การเลือกสินค้าขายดี และวิธีปั๊ม 50-100 คลิปต่อสัปดาห์',
      'โมดูล 5: มาสเตอร์คลาสขั้นสูง': 'เทคนิคทำละครสั้นบนมือถือ แอนิเมชั่นการ์ตูน และการทำคลิปรีวิวสถานที่/ร้านค้า/สินค้า',
    };

    return Array.from(map.entries()).map(([title, items], index) => {
      let desc = defaultDescMap[title];
      if (!desc) {
        if (title.includes('โมดูล 1')) desc = defaultDescMap['โมดูล 1: ปูพื้นฐาน & กฎเหล็กนายหน้ายุค AI'];
        else if (title.includes('Google Flow')) desc = defaultDescMap['โมดูล 2: พื้นฐานการใช้งาน Google Flow ตัวใหม่แบบจับมือทำ'];
        else if (title.includes('เวิร์กโฟลว์') || title.includes('โมดูล 3')) desc = defaultDescMap['โมดูล 3: เวิร์กโฟลว์ปฏิบัติการสร้างคลิปจริง'];
        else if (title.includes('การตลาด') || title.includes('โมดูล 4')) desc = defaultDescMap['โมดูล 4: การตลาด ปั๊มยอดวิว & สเกลรายได้'];
        else if (title.includes('มาสเตอร์คลาส') || title.includes('โมดูลพิเศษ') || title.includes('โมดูล 5')) desc = defaultDescMap['โมดูล 5: มาสเตอร์คลาสขั้นสูง'];
        else desc = items[0]?.module_desc || `รวม ${items.length} บทเรียนปฏิบัติการพร้อมเครื่องมือ AI`;
      }
      return {
        id: index + 1,
        title,
        desc,
        lessons: items,
      };
    });
  }, [lessons]);

  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col transition-colors duration-200">
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
              <span className="hidden sm:inline-block ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                COURSE ACADEMY
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2.5 sm:gap-4">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] px-2 py-1"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/flow-tools"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] px-2 py-1"
            >
              เครื่องมือ Flow
            </Link>

            <ThemeToggle size="sm" />

            {hasAccess ? (
              <Link
                href={`/course/${course?.slug || 'tiktok-ai-affiliate'}`}
                className="puppap-btn-primary px-4 py-1.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>เข้าห้องเรียน</span>
                <span>→</span>
              </Link>
            ) : (
              <Link
                href={`/checkout/${course?.slug || 'tiktok-ai-affiliate'}`}
                className="puppap-btn-primary px-4 py-1.5 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-sm"
              >
                <span>🛒 สมัครเรียน ฿{priceInfo.formattedPrice}</span>
                <span className="text-[11px] opacity-80 line-through hidden sm:inline">
                  ฿{priceInfo.formattedOriginal}
                </span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section with Full Course Poster + Giant Price + Animated Psychological CTA */}
      <section className="relative py-10 sm:py-16 px-4 sm:px-6 overflow-hidden border-b border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-secondary)]/50 to-[var(--bg-primary)]">
        <div className="max-w-5xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* ซ้าย (หรือด้านบนบนมือถือ): โปสเตอร์คอร์สเรียนใหม่ แตะซูมดู 22 บทเรียนได้ */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
            <CoursePosterLightbox
              src={course?.poster_url || '/images/poster-course-tiktok-ai.jpg'}
              enrollHref={`/checkout/${course?.slug || 'tiktok-ai-affiliate'}`}
              hideEnrollCta={hasAccess}
            />
          </div>

          {/* ขวา: รายละเอียดคอร์ส + กล่องราคาขนาดยักษ์ + ปุ่มกดซื้อเคลื่อนไหว */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-5">
            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[var(--accent)] text-white shadow-xs">
                🎓 คอร์สเรียนวิดีโอแนวนอน 16:9
              </span>
              {!hasAccess && (
                <span className="px-3.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm puppap-badge-flash">
                  🔥 ลด {priceInfo.discountPercent}% วันนี้
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                💡 ซื้อครั้งเดียวเรียนได้ตลอดชีพ ไม่มีค่ารายเดือน
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
              ปั้นนายหน้า TikTok ด้วย <span className="text-[var(--accent)]">AI ปักตะกร้า</span>
            </h1>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              คู่มือสร้างรายได้แบบจับมือทำ {lessons.length || 22} บทเรียนเต็ม ตั้งแต่ก้าวแรก เจาะลึก Google Flow ตัวใหม่ ทำคลิปขายดุ สเกล 50-100 คลิป/สัปดาห์
              และเทคนิคละครสั้น/แอนิเมชั่นบนมือถือ โดยไม่ต้องออกกล้อง เหมาะสำหรับคนทุกเพศทุกวัยแม้ไม่มีพื้นฐานคอมพิวเตอร์
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="puppap-card p-3 text-center">
                <div className="text-xl sm:text-2xl font-black text-[var(--accent)]">{lessons.length || 22}</div>
                <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">บทเรียนเข้มข้น</div>
              </div>
              <div className="puppap-card p-3 text-center">
                <div className="text-xl sm:text-2xl font-black text-[var(--accent)]">{modules.length || 5}</div>
                <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">โมดูลปฏิบัติการ</div>
              </div>
              <div className="puppap-card p-3 text-center">
                <div className="text-xl sm:text-2xl font-black text-[var(--accent)]">∞</div>
                <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">ดูซ้ำได้ตลอดชีพ</div>
              </div>
            </div>

            {/* Prominent Flash Promo Price Box & Call to Actions */}
            <div className="pt-2 space-y-3.5">
              {!hasAccess && (
                <div className="puppap-card p-4 sm:p-5 border-2 border-[var(--border-accent)] bg-[var(--bg-card)] shadow-md text-center">
                  <div className="flex items-center justify-center gap-2.5 flex-wrap">
                    <span className="text-sm sm:text-base text-[var(--text-muted)] line-through decoration-rose-600 decoration-2 font-bold">
                      ราคาปกติ ฿{priceInfo.formattedOriginal}
                    </span>
                    <span className="px-3 py-0.5 rounded-full bg-rose-600 text-white text-xs sm:text-sm font-black puppap-badge-flash">
                      🔥 ประหยัดทันที ฿{priceInfo.savingsFormatted}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-center gap-1.5">
                    <span className="text-5xl sm:text-6xl font-black text-[var(--accent)] tracking-tight leading-none puppap-price-hero">
                      ฿{priceInfo.formattedPrice}
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-[var(--text-secondary)]">
                      บาท
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[var(--text-secondary)] mt-1">
                    ✅ จ่ายครั้งเดียวจบ · เรียนได้ครบ {lessons.length || 22} บทตลอดชีพ · ไม่มีค่ารายเดือน
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {hasAccess ? (
                  <Link
                    href={`/course/${course?.slug || 'tiktok-ai-affiliate'}`}
                    className="puppap-btn-primary px-8 py-4 text-base sm:text-lg font-black shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-transform w-full"
                  >
                    <span>🚀 เข้าสู่ห้องเรียนของคุณ</span>
                    <span className="puppap-arrow-nudge">→</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/checkout/${course?.slug || 'tiktok-ai-affiliate'}`}
                      className="puppap-btn-primary puppap-cta-animated min-h-[60px] sm:min-h-[66px] px-7 py-4 rounded-2xl text-lg sm:text-xl font-black shadow-xl flex items-center justify-center gap-2.5 flex-1"
                    >
                      <span>🛒 สมัครเรียนทันที ฿{priceInfo.formattedPrice}</span>
                      <span className="puppap-arrow-nudge text-xl sm:text-2xl">→</span>
                    </Link>
                    <Link
                      href={`/course/${course?.slug || 'tiktok-ai-affiliate'}?lesson=1`}
                      className="puppap-btn-secondary px-5 py-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span>🎁 ดูบทที่ 1 ฟรี</span>
                    </Link>
                  </>
                )}
              </div>

              {!hasAccess && (
                <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 text-center">
                  ⚡ สแกน QR ปุ๊บ ระบบ AI ตรวจสลิปเปิดห้องเรียนให้ทันทีใน 5 วินาที
                </p>
              )}
            </div>

            <p className="text-xs text-[var(--text-muted)] text-center lg:text-left">
              🔒 รับประกันสิทธิ์ตลอดชีพ · เข้าเรียนได้ทันทีหลังชำระเงิน · มีทีมงานคอยช่วยเหลือตลอดเวลา
            </p>
          </div>
        </div>
      </section>

      {/* Main Content: Curriculum Overview */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <span className="text-[var(--accent)]">❖</span> สารบัญ {lessons.length || 22} บทเรียน (Curriculum)
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            จัดเรียงตามลำดับการเรียนรู้ จากพื้นฐาน สู่การลงมือปฏิบัติจริง และขยายผลกำไร
          </p>
        </div>

        {/* Modules Accordion */}
        <div className="space-y-4">
          {modules.map((mod) => {
            const isExpanded = expandedModule === mod.id;
            return (
              <div
                key={mod.id}
                className="puppap-card overflow-hidden border-[var(--border-light)] transition-all"
              >
                {/* Module Header Toggle */}
                <button
                  onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                  className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 bg-[var(--bg-card)] hover:bg-[var(--bg-deep)] transition-colors"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">{mod.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--bg-deep)] border border-[var(--border-light)] text-[var(--text-secondary)]">
                      {mod.lessons.length} บท
                    </span>
                    <span className="text-base text-[var(--accent)] font-bold">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {/* Module Lessons List */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-light)] divide-y divide-[var(--border-light)] bg-[var(--bg-primary)]">
                    {mod.lessons.map((lesson: any) => (
                      <div
                        key={lesson.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-deep)] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {lesson.id}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-[var(--text-primary)]">
                                {lesson.title}
                              </h4>
                              {lesson.is_free_preview && (
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                                  🎁 ดูตัวอย่างฟรี
                                </span>
                              )}
                                {lesson.status === 'coming_soon' ? (
                                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-semibold">
                                    ⏳ กำลังอัปเดตวิดีโอ
                                  </span>
                                ) : (
                                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-semibold">
                                    🎬 พร้อมเรียน • {lesson.duration || 'วิดีโอ HD'}
                                  </span>
                                )}
                                {(lesson.promptStepCount ?? lesson.prompts?.length ?? 0) > 0 && (
                                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] font-bold">
                                    📋 แจกฟรี {lesson.promptStepCount ?? lesson.prompts?.length ?? 0} Prompt
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                                {lesson.description}
                              </p>
                              {Array.isArray(lesson.key_points) && lesson.key_points.length > 0 && (
                                <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                                  {lesson.key_points.map((pt: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <span className="text-[var(--accent)] font-bold">•</span>
                                      <span>{pt}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {lesson.flow_tool_slug && (
                              <span className="text-xs px-2.5 py-0.5 rounded bg-[var(--bg-deep)] border border-[var(--border-light)] text-[var(--accent)] font-semibold">
                                ใช้ Flow Tool
                              </span>
                            )}
                            {hasAccess ? (
                              <Link
                                href={`/course/${course?.slug || 'tiktok-ai-affiliate'}?lesson=${lesson.id}`}
                                className="puppap-btn-primary px-3.5 py-1.5 text-xs font-bold"
                              >
                                ▶ เข้าเรียนบทนี้
                              </Link>
                            ) : lesson.is_free_preview ? (
                              <Link
                                href={`/course/${course?.slug || 'tiktok-ai-affiliate'}?lesson=${lesson.id}`}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-800 text-xs font-bold transition-all shadow-xs"
                              >
                                🎁 ดูตัวอย่างบทนี้ฟรี
                              </Link>
                            ) : (
                              <Link
                                href={`/checkout/${course?.slug || 'tiktok-ai-affiliate'}`}
                                className="puppap-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                              >
                                <span>🔒 ปลดล็อก ฿{priceInfo.formattedPrice}</span>
                              </Link>
                            )}
                          </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Value Proposition Box (Flattened dividers instead of nested cards) */}
        <section className="puppap-card p-6 sm:p-8 space-y-6 border-[var(--border-light)]">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
              ทำไมต้องเรียนคอร์สนี้กับ PUP PAP AI?
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              เราไม่ได้สอนแค่ทฤษฎี แต่ให้เครื่องมือจริงที่ช่วยทุ่นแรงได้ 10 เท่า
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-light)]">
            <div className="pt-4 sm:pt-0 space-y-2">
              <span className="text-2xl">⚡</span>
              <h4 className="font-bold text-base text-[var(--text-primary)]">คู่กับ Google Flow</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                ทุกบทที่ลงมือทำมีโปรแกรม Flow Tools เฉพาะตัว เปิดลิงก์ทำตามได้ทันที
              </p>
            </div>

            <div className="pt-4 sm:pt-0 sm:pl-6 space-y-2">
              <span className="text-2xl">📱</span>
              <h4 className="font-bold text-base text-[var(--text-primary)]">ทำได้บนมือถือเครื่องเดียว</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                ไม่ต้องมีคอมพิวเตอร์แรงๆ สั่งงาน AI ผ่านสมาร์ตโฟนเครื่องโปรดของคุณได้เลย
              </p>
            </div>

            <div className="pt-4 sm:pt-0 sm:pl-6 space-y-2">
              <span className="text-2xl">🔄</span>
              <h4 className="font-bold text-base text-[var(--text-primary)]">อัปเดตตลอดชีพ</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                เมื่อมีโมเดลใหม่ กฎ TikTok ใหม่ เราอัปเดตวิดีโอและเครื่องมือเพิ่มให้อัตโนมัติ
              </p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="pt-4 border-t border-[var(--border-light)] text-center space-y-3">
            {!hasAccess && (
              <div className="text-sm sm:text-base font-bold text-[var(--text-secondary)]">
                ราคาปกติ <span className="line-through text-[var(--text-muted)] decoration-rose-600 decoration-2">฿{priceInfo.formattedOriginal}</span>{' '}
                ➔ พิเศษวันนี้เพียง <span className="text-2xl sm:text-3xl font-black text-[var(--accent)]">฿{priceInfo.formattedPrice} บาท</span> (ลด {priceInfo.discountPercent}%)
              </div>
            )}
            <Link
              href={hasAccess ? `/course/${course?.slug || 'tiktok-ai-affiliate'}` : `/checkout/${course?.slug || 'tiktok-ai-affiliate'}`}
              className={`puppap-btn-primary ${!hasAccess ? 'puppap-cta-animated min-h-[60px] rounded-2xl' : ''} px-8 py-4 text-base sm:text-lg font-black shadow-xl inline-flex items-center justify-center gap-2.5`}
            >
              <span>{hasAccess ? '🚀 เข้าสู่ห้องเรียนของคุณ' : `🛒 สมัครเรียนทันที ฿${priceInfo.formattedPrice} (ซื้อครั้งเดียวจบ)`}</span>
              <span className="puppap-arrow-nudge text-xl">→</span>
            </Link>
          </div>
        </section>

        {/* 📌 3 ขั้นตอนเริ่มต้นสำหรับคนไม่เก่งเทคโนโลยี (Flattened dividers instead of nested cards) */}
        <section className="puppap-card p-6 sm:p-8 space-y-5 border-[var(--border-light)]">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
              ขั้นตอนการเข้าเรียนง่ายนิดเดียว สำหรับทุกคนทุกวัย
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              ไม่ต้องกังวลเรื่องเทคโนโลยี เราออกแบบให้กดง่ายที่สุด ไม่ซับซ้อน
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-light)]">
            <div className="pt-4 sm:pt-0 flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-[var(--accent)] text-white font-black text-sm flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">สมัครและสแกน QR พร้อมเพย์</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                  กดปุ่มสมัครเรียน สแกน QR โอนเงิน {priceInfo.formattedPrice} บาท และแนบรูปสลิปในเว็บได้ทันที
                </p>
              </div>
            </div>

            <div className="pt-4 sm:pt-0 sm:pl-6 flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-[var(--accent)] text-white font-black text-sm flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">ระบบปลดล็อกให้ทันที</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                  เมื่อระบบตรวจสอบสลิปแล้ว ห้องเรียนจะปลดล็อกครบทุกบทเรียนตลอดชีพ
                </p>
              </div>
            </div>

            <div className="pt-4 sm:pt-0 sm:pl-6 flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-[var(--accent)] text-white font-black text-sm flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">เปิดดูและทำตามได้เลย</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                  เข้าสู่ระบบครั้งเดียว ดูได้ทุกที่ทุกเวลาบนมือถือเครื่องโปรดของคุณ
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-[var(--border-light)]">
            <a
              href="https://m.me/100083126689322"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-[var(--accent)] hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>💬 หากติดปัญหาหรือสอบถามข้อมูลเพิ่มเติม ทักแชทแอดมินได้ตลอดเวลา</span>
              <span>→</span>
            </a>
          </div>
        </section>
      </main>

      {/* Mobile Sticky Bottom Buy Bar (เฉพาะผู้ที่ยังไม่ได้ซื้อคอร์สบนมือถือ) */}
      {!hasAccess && (
        <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-[var(--bg-card)]/95 backdrop-blur-md border-t-2 border-[var(--border-accent)] px-3.5 py-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.18)]">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-muted)] line-through font-semibold">
                  ฿{priceInfo.formattedOriginal}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black puppap-badge-flash">
                  ลด {priceInfo.discountPercent}%
                </span>
              </div>
              <div className="text-2xl font-black text-[var(--accent)] leading-none mt-0.5">
                ฿{priceInfo.formattedPrice}{' '}
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">ตลอดชีพ</span>
              </div>
            </div>

            <Link
              href={`/checkout/${course?.slug || 'tiktok-ai-affiliate'}`}
              className="puppap-btn-primary puppap-cta-animated flex-1 py-3 px-4 rounded-xl text-center text-sm font-black flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span>🛒 สมัครเรียนทันที</span>
              <span className="puppap-arrow-nudge">→</span>
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`mt-auto border-t border-[var(--border-light)] pt-8 ${!hasAccess ? 'pb-28 sm:pb-8' : 'pb-8'} text-center text-xs text-[var(--text-muted)]`}>
        <p>© 2026 PUP PAP AI — คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม</p>
      </footer>
    </div>
  );
}
