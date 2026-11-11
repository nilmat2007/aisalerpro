'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { getPreviewAbVariant, trackFunnelEvent } from '@/lib/meta-pixel';

export const COURSE_CORE_HIGHLIGHTS = [
  'พื้นฐานการเป็นนายหน้า TikTok',
  'ใช้ Google Flow สร้างคลิป AI',
  'ทำคลิปปักตะกร้าสร้างยอดขาย',
  'คลิปสไตล์มินิมอลปักตะกร้า',
  'คลิปรีวิวสินค้าแบบมืออาชีพ',
  'ทำคลิปละครสั้นบนมือถือ',
  'คลิปการ์ตูนแอนิเมชั่น 2D บนมือถือ',
  'โพสต์คลิปหารายได้ทุกแพลตฟอร์ม',
] as const;

export interface CourseVisualHighlightItem {
  step: number;
  shortTitle: string;
  fullTitle: (typeof COURSE_CORE_HIGHLIGHTS)[number];
  tag: string;
  icon: string;
  imageUrl: string;
  badgeGradient: string;
  cardBorder: string;
}

export const COURSE_VISUAL_HIGHLIGHTS: readonly CourseVisualHighlightItem[] = [
  {
    step: 1,
    shortTitle: 'ปั้นช่องนายหน้า',
    fullTitle: COURSE_CORE_HIGHLIGHTS[0],
    tag: 'เริ่มต้น 0',
    icon: '🛒',
    imageUrl: '/images/course-hero-intro-poster.webp',
    badgeGradient: 'from-rose-500 to-red-600 border-rose-200',
    cardBorder: 'border-rose-400/70 from-rose-950/90 via-stone-950 to-stone-950',
  },
  {
    step: 2,
    shortTitle: 'Google Flow AI',
    fullTitle: COURSE_CORE_HIGHLIGHTS[1],
    tag: 'เจนคลิปไว',
    icon: '⚡',
    imageUrl: '/images/poster-puppap-fashion-studio.jpg',
    badgeGradient: 'from-amber-400 to-orange-600 border-amber-200',
    cardBorder: 'border-amber-400/70 from-amber-950/90 via-stone-950 to-stone-950',
  },
  {
    step: 3,
    shortTitle: 'คลิปปักตะกร้า',
    fullTitle: COURSE_CORE_HIGHLIGHTS[2],
    tag: 'ขายดุ 24 ชม.',
    icon: '🛍️',
    imageUrl: '/images/poster-puppap-ugc-product.jpg',
    badgeGradient: 'from-emerald-500 to-green-600 border-emerald-200',
    cardBorder: 'border-emerald-400/70 from-emerald-950/90 via-stone-950 to-stone-950',
  },
  {
    step: 4,
    shortTitle: 'คลิปมินิมอล',
    fullTitle: COURSE_CORE_HIGHLIGHTS[3],
    tag: 'ไม่ต้องออกกล้อง',
    icon: '✨',
    imageUrl:
      'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images/poster_1794145940853.jpeg',
    badgeGradient: 'from-sky-500 to-blue-600 border-sky-200',
    cardBorder: 'border-sky-400/70 from-sky-950/90 via-stone-950 to-stone-950',
  },
  {
    step: 5,
    shortTitle: 'รีวิวสินค้าคนจริง',
    fullTitle: COURSE_CORE_HIGHLIGHTS[4],
    tag: 'สมจริง 100%',
    icon: '🎬',
    imageUrl: '/images/poster-ugc-batch.jpg',
    badgeGradient: 'from-pink-500 to-rose-600 border-pink-200',
    cardBorder: 'border-pink-400/70 from-pink-950/90 via-stone-950 to-stone-950',
  },
  {
    step: 6,
    shortTitle: 'ละครสั้นมือถือ',
    fullTitle: COURSE_CORE_HIGHLIGHTS[5],
    tag: 'ไวรัลล้านวิว',
    icon: '🎭',
    imageUrl: '/images/poster-ai-content-factory.jpg',
    badgeGradient: 'from-purple-500 to-violet-600 border-purple-200',
    cardBorder: 'border-purple-400/70 from-purple-950/90 via-stone-950 to-stone-950',
  },
  {
    step: 7,
    shortTitle: 'การ์ตูน 2D AI',
    fullTitle: COURSE_CORE_HIGHLIGHTS[6],
    tag: 'ทำบนมือถือ',
    icon: '🎨',
    imageUrl: '/images/lesson-21-preview-poster.webp',
    badgeGradient: 'from-yellow-400 to-amber-500 border-yellow-100',
    cardBorder: 'border-yellow-400/70 from-amber-950/90 via-stone-950 to-stone-950',
  },
  {
    step: 8,
    shortTitle: 'โพสต์สร้างรายได้',
    fullTitle: COURSE_CORE_HIGHLIGHTS[7],
    tag: 'ทุกแพลตฟอร์ม',
    icon: '💰',
    imageUrl:
      'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images/poster_1794117210595.jpg',
    badgeGradient: 'from-teal-500 to-emerald-600 border-teal-200',
    cardBorder: 'border-teal-400/70 from-teal-950/90 via-stone-950 to-stone-950',
  },
] as const;

const FREE_BONUS_TOOLS_PREVIEW = [
  {
    slug: 'puppap-fashion-studio',
    shortName: 'PUP PAP Fashion Studio',
    role: 'เสกนางแบบ-นายแบบใส่เสื้อผ้า',
    posterUrl: '/images/poster-puppap-fashion-studio.jpg',
    normalPrice: '฿299',
  },
  {
    slug: 'puppap-ugc-product',
    shortName: 'PUPPAP AI UGC Product',
    role: 'ทำคลิปรีวิวสินค้าปักตะกร้า',
    posterUrl: '/images/poster-puppap-ugc-product.jpg',
    normalPrice: '฿299',
  },
] as const;

const VS_VIEW_SESSION_KEY = 'puppap_vs_viewed';
const VS_EXPAND_SESSION_KEY = 'puppap_vs_expanded';

interface CourseCoreHighlightsProps {
  pageContext?: 'home' | 'dashboard' | 'courses';
  showBonusLineInFooter?: boolean;
}

export default function CourseCoreHighlights({
  pageContext = 'courses',
  showBonusLineInFooter = false,
}: CourseCoreHighlightsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const reactId = useId();
  const listId = `core-highlights-list-${reactId}`;

  // Intentionally deduplicated per-session (via sessionStorage) so SPA navigations
  // between `/`, `/dashboard`, and `/courses` count unique session impressions.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    try {
      if (sessionStorage.getItem(VS_VIEW_SESSION_KEY) === '1') return;
    } catch {
      // Ignore storage errors in private browsing
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const variant = getPreviewAbVariant();
          try {
            if (sessionStorage.getItem(VS_VIEW_SESSION_KEY) !== '1') {
              sessionStorage.setItem(VS_VIEW_SESSION_KEY, '1');
              trackFunnelEvent('value_stack_view', { page: pageContext, variant });
            }
          } catch {
            trackFunnelEvent('value_stack_view', { page: pageContext, variant });
          }
          observer.disconnect();
        }
      },
      { threshold: [0.6], rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageContext]);

  const handleExpandMobile = () => {
    setIsMobileExpanded(true);
    const variant = getPreviewAbVariant();
    try {
      if (sessionStorage.getItem(VS_EXPAND_SESSION_KEY) !== '1') {
        sessionStorage.setItem(VS_EXPAND_SESSION_KEY, '1');
        trackFunnelEvent('value_stack_expand', { page: pageContext, variant });
      }
    } catch {
      trackFunnelEvent('value_stack_expand', { page: pageContext, variant });
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="course-core-highlights"
      className="rounded-2xl bg-[var(--bg-primary)] border-2 border-[var(--border-accent)] p-3 sm:p-4 text-left shadow-md space-y-3"
    >
      {/* Header Bar: “มือใหม่ก็ทำได้บนมือถือเครื่องเดียว” + Visual Count Pill */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--border-light)] pb-2">
        <p className="text-[13px] sm:text-sm font-black text-[var(--text-primary)] leading-snug">
          <span className="text-[var(--accent)]">
            📱 “มือใหม่ก็ทำได้บนมือถือเครื่องเดียว”
          </span>{' '}
          <span className="text-[var(--text-secondary)] font-bold">
            — สิ่งที่คุณจะได้เรียนครบในคอร์สนี้:
          </span>
        </p>
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-[10.5px] sm:text-xs font-black text-amber-800 dark:text-amber-300 whitespace-nowrap">
          🎓 22 บทเรียน + 🎁 ฟรี 2 Tools
        </span>
      </div>

      {/* 8 Visual Poster Skill Cards (4+4 collapse on mobile <640px; 4-col visual grid on all screens) */}
      <ul
        id={listId}
        data-testid="course-visual-highlights-grid"
        className="grid grid-cols-4 gap-1.5 sm:gap-2.5 pt-2"
      >
        {COURSE_VISUAL_HIGHLIGHTS.map((item, idx) => {
          const isHiddenOnMobile = idx >= 4 && !isMobileExpanded;
          const imgFailed = Boolean(failedImages[item.shortTitle]);

          return (
            <li
              key={item.fullTitle}
              data-testid={`course-highlight-card-${item.step}`}
              className={`${
                isHiddenOnMobile ? 'hidden sm:flex' : 'flex'
              } group relative flex-col items-center justify-between rounded-2xl bg-gradient-to-b ${
                item.cardBorder
              } border-[1.5px] p-1 sm:p-1.5 pt-3 text-center shadow-sm hover:-translate-y-0.5 transition-transform`}
            >
              {/* 3D Glossy Number Badge overlapping top border */}
              <span
                aria-hidden="true"
                className={`-mt-4 mb-0.5 inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-b ${item.badgeGradient} border-[1.5px] text-[10px] sm:text-xs font-black text-white shadow-[0_2px_4px_rgba(0,0,0,0.4)]`}
              >
                {item.step}
              </span>

              {/* Short Punchy Visual Title (2 words, zero cognitive load) */}
              <div className="px-0.5 min-h-[26px] sm:min-h-[30px] flex flex-col items-center justify-center">
                <span className="text-[9.5px] xs:text-[10.5px] sm:text-xs font-black text-white leading-tight tracking-tight line-clamp-2">
                  {item.shortTitle}
                </span>
              </div>

              {/* Phone Screen Visual Preview Frame */}
              <div className="mt-1 w-full aspect-[9/12] rounded-xl overflow-hidden border border-white/20 bg-stone-900 relative flex items-center justify-center shadow-inner">
                {/* Tiny phone speaker notch */}
                <span className="absolute top-0.5 left-1/2 -translate-x-1/2 z-10 w-3 h-0.5 rounded-full bg-black/70 pointer-events-none" />

                {!imgFailed ? (
                  <img
                    src={item.imageUrl}
                    alt={item.fullTitle}
                    loading="lazy"
                    decoding="async"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [item.shortTitle]: true }))
                    }
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl">{item.icon}</span>
                )}

                {/* Top-right floating icon badge */}
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/70 backdrop-blur-xs border border-white/20 flex items-center justify-center text-[9px] sm:text-[11px]"
                >
                  {item.icon}
                </span>

                {/* Bottom Visual Tag Pill inside Phone Screen */}
                <span className="absolute bottom-0.5 inset-x-0.5 py-0.5 px-1 rounded-md bg-stone-950/90 border border-amber-400/40 text-[7.5px] sm:text-[9px] font-black text-amber-300 truncate leading-tight">
                  ✓ {item.tag}
                </span>
              </div>

              {/* Full Accessible Title (Screen-reader & desktop sub-caption) */}
              <span className="sr-only sm:not-sr-only sm:mt-1 sm:text-[10px] sm:font-bold sm:text-stone-300 sm:line-clamp-1">
                {item.fullTitle}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Compact 1-Line Expand Button on Mobile (< 640px) matching items 5-8 */}
      {!isMobileExpanded && (
        <button
          type="button"
          onClick={handleExpandMobile}
          aria-expanded={isMobileExpanded}
          aria-controls={listId}
          className="sm:hidden w-full py-1.5 px-2.5 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] text-[11px] leading-tight font-extrabold flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>▾ ดูเพิ่มอีก 4 หัวข้อหลัก (รีวิวสินค้า • ละครสั้น • การ์ตูน 2D • โพสต์หารายได้)</span>
        </button>
      )}

      {/* Visual Bonus Strip: Show the 2 Free AI Tools (฿598 Value) with Real Posters */}
      <div
        data-testid="course-free-bonus-tools-strip"
        className="rounded-xl bg-gradient-to-r from-stone-950 via-[#231206] to-stone-950 border border-amber-400/60 p-2 sm:p-2.5 text-white space-y-1.5"
      >
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <span className="text-[11px] sm:text-xs font-black text-amber-300 flex items-center gap-1">
            <span>🎁</span>
            <span>สมัครคอร์สนี้ แถมฟรีทันที 2 โปรแกรม AI:</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9.5px] sm:text-[10.5px] font-black">
            มูลค่ารวม ฿598 ฟรี!
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {FREE_BONUS_TOOLS_PREVIEW.map((tool, idx) => (
            <div
              key={tool.slug}
              className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900/95 border border-amber-400/30"
            >
              <div className="w-9 h-11 sm:w-10 sm:h-12 rounded-md overflow-hidden border border-amber-300/50 bg-stone-950 shrink-0">
                <img
                  src={tool.posterUrl}
                  alt={tool.shortName}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="px-1 py-[1px] rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[8.5px] sm:text-[9.5px] font-black">
                    ฟรี #{idx + 1}
                  </span>
                  <span className="text-[8.5px] sm:text-[9.5px] text-stone-400 line-through font-bold">
                    {tool.normalPrice}
                  </span>
                </div>
                <div className="text-[10px] sm:text-xs font-black text-white truncate mt-0.5">
                  {tool.shortName}
                </div>
                <div className="text-[9px] sm:text-[10px] text-amber-200/90 font-semibold truncate">
                  {tool.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer Bar (migrated from Quick Info Badges) */}
      <div className="pt-1.5 border-t border-[var(--border-light)] text-[11px] sm:text-xs font-bold text-[var(--text-secondary)] flex items-center justify-between flex-wrap gap-1.5">
        <span>🎬 ครบ 22 บทเรียนเต็ม • ♾️ ดูซ้ำได้ตลอดชีพ ไม่มีพื้นฐานก็เรียนตามได้ทันที</span>
        {showBonusLineInFooter && (
          <span className="text-[var(--accent)] font-black">
            • แถมฟรี 2 เครื่องมือ AI (มูลค่ารวม ฿598)
          </span>
        )}
      </div>
    </div>
  );
}
