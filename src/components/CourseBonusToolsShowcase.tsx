import React from 'react';
import Link from 'next/link';

export interface BonusToolPreviewItem {
  slug: string;
  name: string;
  subtitle: string;
  posterUrl: string;
  originalPrice: string;
  badgeText: string;
}

export const COURSE_BONUS_TOOLS_PREVIEW: BonusToolPreviewItem[] = [
  {
    slug: 'puppap-fashion-studio',
    name: 'PUP PAP Fashion Studio',
    subtitle: 'สตูดิโอเสื้อผ้า & นายแบบนางแบบ AI',
    posterUrl: '/images/poster-puppap-fashion-studio.jpg',
    originalPrice: '299',
    badgeText: 'FREE #1',
  },
  {
    slug: 'puppap-ugc-product',
    name: 'PUPPAP AI UGC Product',
    subtitle: 'สตูดิโอสร้างคลิปรีวิวสินค้าปักตะกร้า',
    posterUrl: '/images/poster-puppap-ugc-product.jpg',
    originalPrice: '299',
    badgeText: 'FREE #2',
  },
];

interface CourseBonusToolsShowcaseProps {
  compact?: boolean;
  className?: string;
}

export default function CourseBonusToolsShowcase({
  compact = false,
  className = '',
}: CourseBonusToolsShowcaseProps) {
  return (
    <div
      data-testid="course-bonus-tools-showcase"
      className={`mt-3 pt-3 border-t border-[var(--border-light)] text-left ${className}`}
    >
      {/* Header Ribbon */}
      <div className="flex items-center justify-center sm:justify-between gap-2 flex-wrap mb-2.5">
        <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
          <span className="text-base leading-none">🎁</span>
          <span>
            พิเศษ! สมัครคอร์สวันนี้ <strong>แถมฟรี 2 เครื่องมือ AI ตัวเต็ม</strong> (มูลค่ารวม ฿598)
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/35 text-[11px] font-bold">
          ✨ ปลดล็อกให้อัตโนมัติทันที
        </span>
      </div>

      {/* 2 Visual Bonus Tool Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {COURSE_BONUS_TOOLS_PREVIEW.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tool/${tool.slug}`}
            className="group relative flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border-[1.5px] border-amber-500/45 hover:border-[var(--accent)] shadow-xs transition-all"
          >
            {/* Square Tool Poster Thumbnail */}
            <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-[1.5px] border-amber-400/80 bg-stone-950 shrink-0 shadow-sm">
              <img
                src={tool.posterUrl}
                alt={tool.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <span className="absolute top-0.5 left-0.5 px-1.5 py-[1px] rounded bg-amber-400 text-stone-950 text-[9px] font-bold leading-tight shadow-xs">
                {tool.badgeText}
              </span>
            </div>

            {/* Tool Details + Free Badge */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold leading-none shadow-2xs">
                  แถมฟรี! ฿0
                </span>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] line-through">
                  ปกติ ฿{tool.originalPrice}
                </span>
              </div>

              <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate mt-1 transition-colors">
                {tool.name}
              </div>

              {!compact && (
                <div className="text-[11px] text-[var(--text-secondary)] truncate">
                  {tool.subtitle}
                </div>
              )}
            </div>

            <span
              className="text-xs font-bold text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0 pr-0.5"
              aria-hidden="true"
            >
              ↗
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
