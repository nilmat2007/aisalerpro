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
      className="rounded-2xl bg-[var(--bg-primary)] border-[1.5px] border-[var(--border-accent)] p-3.5 sm:p-4 text-left shadow-sm space-y-2.5"
    >
      {/* Header Bar: “มือใหม่ก็ทำได้บนมือถือเครื่องเดียว” */}
      <div className="border-b border-[var(--border-light)] pb-2">
        <p className="text-[13px] sm:text-sm font-black text-[var(--text-primary)] leading-snug">
          <span className="text-[var(--accent)]">
            📱 “มือใหม่ก็ทำได้บนมือถือเครื่องเดียว”
          </span>{' '}
          <span className="text-[var(--text-secondary)] font-bold">
            — สิ่งที่คุณจะได้เรียนครบในคอร์สนี้:
          </span>
        </p>
      </div>

      {/* 8 Outcome-Focused Core Pillars (4+4 collapse on mobile <640px; 2-col full grid on sm+) */}
      <ul
        id={listId}
        className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5"
      >
        {COURSE_CORE_HIGHLIGHTS.map((item, idx) => {
          const isHiddenOnMobile = idx >= 4 && !isMobileExpanded;
          return (
            <li
              key={item}
              className={`${
                isHiddenOnMobile ? 'hidden sm:flex' : 'flex'
              } items-start gap-2 text-[13px] sm:text-sm font-bold text-[var(--text-primary)] leading-snug`}
            >
              <span
                aria-hidden="true"
                className="text-emerald-600 dark:text-emerald-400 font-black shrink-0"
              >
                ✓
              </span>
              <span>{item}</span>
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

      {/* Summary Footer Bar (migrated from Quick Info Badges) */}
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
