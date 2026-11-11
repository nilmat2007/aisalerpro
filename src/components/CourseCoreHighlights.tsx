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
  iconKey:
    | 'tiktok_affiliate'
    | 'google_flow'
    | 'tiktok_shop_cart'
    | 'minimal_faceless'
    | 'pro_review'
    | 'short_drama'
    | 'anime_2d'
    | 'multi_platform';
  shortTitle: string;
  subText: string;
  fullTitle: (typeof COURSE_CORE_HIGHLIGHTS)[number];
  badgeColor: string;
  iconBg: string;
}

export const COURSE_VISUAL_HIGHLIGHTS: readonly CourseVisualHighlightItem[] = [
  {
    step: 1,
    iconKey: 'tiktok_affiliate',
    shortTitle: 'นายหน้า TikTok',
    subText: 'ปูพื้นฐาน & ปักตะกร้า',
    fullTitle: COURSE_CORE_HIGHLIGHTS[0],
    badgeColor: 'bg-stone-950 text-white border-rose-400',
    iconBg: 'from-stone-950 via-stone-900 to-rose-950 border-rose-500/40',
  },
  {
    step: 2,
    iconKey: 'google_flow',
    shortTitle: 'Google Flow AI',
    subText: 'เจนคลิปด้วย AI ตัวใหม่',
    fullTitle: COURSE_CORE_HIGHLIGHTS[1],
    badgeColor: 'bg-sky-600 text-white border-sky-200',
    iconBg: 'from-sky-950 via-blue-950 to-indigo-950 border-sky-400/50',
  },
  {
    step: 3,
    iconKey: 'tiktok_shop_cart',
    shortTitle: 'คลิปปักตะกร้า',
    subText: 'ทำคลิปขายดุ 24 ชม.',
    fullTitle: COURSE_CORE_HIGHLIGHTS[2],
    badgeColor: 'bg-orange-600 text-white border-amber-200',
    iconBg: 'from-amber-950 via-orange-950 to-red-950 border-amber-400/50',
  },
  {
    step: 4,
    iconKey: 'minimal_faceless',
    shortTitle: 'คลิปมินิมอล',
    subText: 'ขายดีโดยไม่ออกกล้อง',
    fullTitle: COURSE_CORE_HIGHLIGHTS[3],
    badgeColor: 'bg-emerald-600 text-white border-emerald-200',
    iconBg: 'from-emerald-950 via-teal-950 to-stone-950 border-emerald-400/50',
  },
  {
    step: 5,
    iconKey: 'pro_review',
    shortTitle: 'คลิปรีวิวสินค้า',
    subText: 'พรีเซนเตอร์คนจริง AI',
    fullTitle: COURSE_CORE_HIGHLIGHTS[4],
    badgeColor: 'bg-rose-600 text-white border-pink-200',
    iconBg: 'from-rose-950 via-pink-950 to-stone-950 border-pink-400/50',
  },
  {
    step: 6,
    iconKey: 'short_drama',
    shortTitle: 'ละครสั้นมือถือ',
    subText: 'ปั้นช่องไวรัลล้านวิว',
    fullTitle: COURSE_CORE_HIGHLIGHTS[5],
    badgeColor: 'bg-purple-600 text-white border-purple-200',
    iconBg: 'from-purple-950 via-violet-950 to-stone-950 border-purple-400/50',
  },
  {
    step: 7,
    iconKey: 'anime_2d',
    shortTitle: 'การ์ตูน 2D AI',
    subText: 'ทำอนิเมชั่นบนมือถือ',
    fullTitle: COURSE_CORE_HIGHLIGHTS[6],
    badgeColor: 'bg-amber-500 text-stone-950 border-yellow-100',
    iconBg: 'from-amber-900 via-yellow-950 to-stone-950 border-yellow-400/50',
  },
  {
    step: 8,
    iconKey: 'multi_platform',
    shortTitle: 'โพสต์ทุกแพลตฟอร์ม',
    subText: 'TikTok · Reels · Shopee',
    fullTitle: COURSE_CORE_HIGHLIGHTS[7],
    badgeColor: 'bg-teal-600 text-white border-teal-200',
    iconBg: 'from-teal-950 via-emerald-950 to-stone-950 border-teal-400/50',
  },
] as const;

function renderHighlightVisualLogo(iconKey: CourseVisualHighlightItem['iconKey']) {
  switch (iconKey) {
    case 'tiktok_affiliate':
      return (
        /* TikTok Musical Note Logo (Cyan/Rose Glitch) + Gold Affiliate Bag Badge */
        <div className="relative flex items-center justify-center w-full h-full">
          <svg viewBox="0 0 36 36" className="w-7 h-7 sm:w-8 sm:h-8 overflow-visible" aria-hidden="true">
            {/* Cyan offset layer */}
            <path
              d="M23.2 7.5c.7 2.4 2.5 4.2 4.9 4.6v3.7c-1.8-.1-3.5-.7-4.9-1.7v7.6c0 4.6-3.7 8.3-8.3 8.3s-8.3-3.7-8.3-8.3 3.7-8.3 8.3-8.3c.5 0 .9 0 1.4.1v4c-.4-.1-.9-.2-1.4-.2-2.4 0-4.4 2-4.4 4.4s2 4.4 4.4 4.4 4.4-2 4.4-4.4V7.5h3.9z"
              fill="#25F4EE"
              transform="translate(-1.2, -1)"
            />
            {/* Rose offset layer */}
            <path
              d="M23.2 7.5c.7 2.4 2.5 4.2 4.9 4.6v3.7c-1.8-.1-3.5-.7-4.9-1.7v7.6c0 4.6-3.7 8.3-8.3 8.3s-8.3-3.7-8.3-8.3 3.7-8.3 8.3-8.3c.5 0 .9 0 1.4.1v4c-.4-.1-.9-.2-1.4-.2-2.4 0-4.4 2-4.4 4.4s2 4.4 4.4 4.4 4.4-2 4.4-4.4V7.5h3.9z"
              fill="#FE2C55"
              transform="translate(1.2, 1)"
            />
            {/* White core note */}
            <path
              d="M23.2 7.5c.7 2.4 2.5 4.2 4.9 4.6v3.7c-1.8-.1-3.5-.7-4.9-1.7v7.6c0 4.6-3.7 8.3-8.3 8.3s-8.3-3.7-8.3-8.3 3.7-8.3 8.3-8.3c.5 0 .9 0 1.4.1v4c-.4-.1-.9-.2-1.4-.2-2.4 0-4.4 2-4.4 4.4s2 4.4 4.4 4.4 4.4-2 4.4-4.4V7.5h3.9z"
              fill="#FFFFFF"
            />
          </svg>
          <span className="absolute -bottom-1 -right-1 px-1 py-[1px] rounded bg-amber-400 text-stone-950 text-[7.5px] font-black leading-none shadow-xs">
            SHOP
          </span>
        </div>
      );

    case 'google_flow':
      return (
        /* Google Flow Play + AI Sparkle Emblem */
        <div className="relative flex items-center justify-center w-full h-full">
          <svg viewBox="0 0 36 36" className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true">
            <circle cx="17" cy="18" r="12" fill="#38BDF8" fillOpacity="0.2" stroke="#38BDF8" strokeWidth="2" />
            <polygon points="14,12.5 23.5,18 14,23.5" fill="#FACC15" />
            <path
              d="M28 5l1.2 3.2L32.5 9.5l-3.3 1.2L28 14l-1.2-3.3-3.3-1.2 3.3-1.3L28 5z"
              fill="#FDE047"
            />
          </svg>
          <span className="absolute -bottom-1 -right-1 px-1 py-[1px] rounded bg-sky-400 text-stone-950 text-[7.5px] font-black leading-none shadow-xs">
            FLOW
          </span>
        </div>
      );

    case 'tiktok_shop_cart':
      return (
        /* TikTok Shop Orange Basket + Checkmark */
        <div className="relative flex items-center justify-center w-full h-full">
          <svg viewBox="0 0 36 36" className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true">
            <rect x="7" y="12" width="22" height="17" rx="4" fill="#F97316" stroke="#FDE047" strokeWidth="1.8" />
            <path d="M13 12V9.5a5 5 0 0 1 10 0V12" fill="none" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M14 20.5l2.8 2.8 5.5-5.5" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute -bottom-1 -right-1 px-1 py-[1px] rounded bg-emerald-400 text-stone-950 text-[7.5px] font-black leading-none shadow-xs">
            24h
          </span>
        </div>
      );

    case 'minimal_faceless':
      return (
        /* Minimal Faceless Phone Tripod + Sparkle */
        <div className="relative flex items-center justify-center w-full h-full">
          <svg viewBox="0 0 36 36" className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true">
            <rect x="10" y="6" width="16" height="24" rx="3.5" fill="#10B981" fillOpacity="0.2" stroke="#34D399" strokeWidth="2" />
            <circle cx="18" cy="16" r="4" fill="#FDE047" />
            <path d="M14 24h8" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" />
            <path d="M28 7l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9L28 7z" fill="#FDE047" />
          </svg>
        </div>
      );

    case 'pro_review':
      return (
        /* 5-Star Product Review + Badge */
        <div className="relative flex items-center justify-center w-full h-full">
          <svg viewBox="0 0 36 36" className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true">
            <path
              d="M18 6l3.3 6.7 7.4 1.1-5.3 5.2 1.3 7.4L18 22.9l-6.7 3.5 1.3-7.4-5.3-5.2 7.4-1.1L18 6z"
              fill="#FACC15"
              stroke="#FB7185"
              strokeWidth="1.5"
            />
          </svg>
          <span className="absolute -bottom-1 -right-1 px-1 py-[1px] rounded bg-rose-500 text-white text-[7.5px] font-black leading-none shadow-xs">
            5.0★
          </span>
        </div>
      );

    case 'short_drama':
      return (
        /* Cinema Clapperboard SVG */
        <div className="relative flex items-center justify-center w-full h-full">
          <svg viewBox="0 0 36 36" className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true">
            <rect x="6" y="13" width="24" height="16" rx="3" fill="#A855F7" fillOpacity="0.25" stroke="#C084FC" strokeWidth="2" />
            <path d="M6 13l2-5h20l2 5H6z" fill="#E9D5FF" stroke="#C084FC" strokeWidth="1.5" />
            <polygon points="15,17 22,21 15,25" fill="#FACC15" />
          </svg>
        </div>
      );

    case 'anime_2d':
      return (
        /* 2D Animation Palette & Sparkle Frame */
        <div className="relative flex items-center justify-center w-full h-full">
          <svg viewBox="0 0 36 36" className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true">
            <rect x="6" y="8" width="24" height="20" rx="4" fill="#F59E0B" fillOpacity="0.25" stroke="#FBBF24" strokeWidth="2" />
            <text x="18" y="22" textAnchor="middle" fill="#FEF08A" fontSize="11" fontWeight="900" fontFamily="sans-serif">
              2D
            </text>
          </svg>
          <span className="absolute -bottom-1 -right-1 px-1 py-[1px] rounded bg-amber-400 text-stone-950 text-[7.5px] font-black leading-none shadow-xs">
            AI
          </span>
        </div>
      );

    case 'multi_platform':
      return (
        /* Multi-Platform (TikTok / Reels / Shopee) Badges */
        <div className="relative flex items-center justify-center w-full h-full">
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            <span className="w-3.5 h-3.5 rounded bg-stone-950 border border-cyan-400 text-[7px] font-black text-white flex items-center justify-center">
              ♪
            </span>
            <span className="w-3.5 h-3.5 rounded bg-gradient-to-br from-pink-500 to-amber-500 text-[7px] font-black text-white flex items-center justify-center">
              ▶
            </span>
            <span className="w-3.5 h-3.5 rounded bg-orange-600 text-[7px] font-black text-white flex items-center justify-center">
              S
            </span>
            <span className="w-3.5 h-3.5 rounded bg-red-600 text-[7px] font-black text-white flex items-center justify-center">
              Y
            </span>
          </div>
        </div>
      );
  }
}

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
      className="rounded-2xl bg-[var(--bg-primary)] border-[1.5px] border-[var(--border-accent)] p-3 sm:p-3.5 text-left shadow-sm space-y-2.5"
    >
      {/* Header Bar: “มือใหม่ก็ทำได้บนมือถือเครื่องเดียว” */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--border-light)] pb-2">
        <p className="text-[13px] sm:text-sm font-black text-[var(--text-primary)] leading-snug">
          <span className="text-[var(--accent)]">
            📱 “มือใหม่ก็ทำได้บนมือถือเครื่องเดียว”
          </span>{' '}
          <span className="text-[var(--text-secondary)] font-bold">
            — สิ่งที่คุณจะได้เรียนครบในคอร์สนี้:
          </span>
        </p>
      </div>

      {/* 8 Compact Visual Logo & Icon Cards (2x2 + expand on mobile <640px; 4x2 grid on sm+) */}
      <ul
        id={listId}
        data-testid="course-visual-highlights-grid"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5"
      >
        {COURSE_VISUAL_HIGHLIGHTS.map((item, idx) => {
          const isHiddenOnMobile = idx >= 4 && !isMobileExpanded;

          return (
            <li
              key={item.fullTitle}
              data-testid={`course-highlight-card-${item.step}`}
              className={`${
                isHiddenOnMobile ? 'hidden sm:flex' : 'flex'
              } items-center gap-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-[var(--border-accent)] p-2 transition-colors shadow-2xs`}
            >
              {/* Left: Crisp Topic/Brand Logo Tile (TikTok / Google Flow / Shop Cart / etc.) */}
              <div
                className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${item.iconBg} border shrink-0 flex items-center justify-center shadow-xs`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full border text-[9px] font-black flex items-center justify-center shadow-2xs ${item.badgeColor}`}
                >
                  {item.step}
                </span>
                {renderHighlightVisualLogo(item.iconKey)}
              </div>

              {/* Right: Short Memorable Title + Tiny Subtitle (Zero truncation, zero tool poster clutter) */}
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-[12.5px] font-black text-[var(--text-primary)] leading-tight">
                  {item.shortTitle}
                </div>
                <div className="text-[10px] sm:text-[10.5px] font-bold text-[var(--text-secondary)] leading-tight mt-0.5">
                  {item.subText}
                </div>
                <span className="sr-only">{item.fullTitle}</span>
              </div>
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

      {/* Summary Footer Bar */}
      <div className="pt-2 border-t border-[var(--border-light)] text-[11px] sm:text-xs font-bold text-[var(--text-secondary)] flex items-center justify-between flex-wrap gap-1.5">
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
