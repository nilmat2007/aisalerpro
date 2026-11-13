'use client';

import React, { useState } from 'react';
import type { ShowcaseToolItem } from '@/lib/all-in-one-pricing';

const COLUMN_THEMES = [
  {
    badge: 'from-pink-500 to-rose-600 border-pink-200',
    column:
      'from-[#fff1f5] via-[#ffe4ed] to-[#ffd6e4] border-pink-400/80 text-stone-900',
  },
  {
    badge: 'from-emerald-500 to-green-600 border-emerald-200',
    column:
      'from-[#effdf5] via-[#dcfce8] to-[#bbf7d2] border-emerald-400/80 text-stone-900',
  },
  {
    badge: 'from-amber-500 to-orange-600 border-amber-200',
    column:
      'from-[#fffbeb] via-[#fef3c7] to-[#fde68a] border-amber-400/80 text-stone-900',
  },
  {
    badge: 'from-sky-500 to-blue-600 border-sky-200',
    column:
      'from-[#f0f9ff] via-[#e0f2fe] to-[#bae6fd] border-sky-400/80 text-stone-900',
  },
  {
    badge: 'from-yellow-400 to-amber-500 border-yellow-100',
    column:
      'from-[#fefce8] via-[#fef9c3] to-[#fef08a] border-yellow-400/90 text-stone-900',
  },
  {
    badge: 'from-purple-500 to-violet-600 border-purple-200',
    column:
      'from-[#faf5ff] via-[#f3e8ff] to-[#e9d5ff] border-purple-400/80 text-stone-900',
  },
  {
    badge: 'from-red-500 to-rose-600 border-red-200',
    column:
      'from-[#fff1f2] via-[#ffe4e6] to-[#fecdd3] border-rose-400/80 text-stone-900',
  },
];

export interface AllInOneToolGridProps {
  items: ShowcaseToolItem[];
  currentItemIndex?: number;
  showThumbnailStrip?: boolean;
  compact?: boolean;
  renderPosterFooterRibbon?: boolean;
}

export default function AllInOneToolGrid({
  items,
  currentItemIndex = -1,
  showThumbnailStrip = true,
  compact = false,
  renderPosterFooterRibbon = false,
}: AllInOneToolGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(
    currentItemIndex >= 0 ? currentItemIndex : null
  );
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  if (!items || items.length === 0) return null;

  const highlightedIndex =
    activeIndex !== null && activeIndex >= 0 && activeIndex < items.length
      ? activeIndex
      : currentItemIndex;

  // Keep 1..7 in a single poster row on all viewports (matching the reference poster).
  // If 8+ tools are added in the future, wrap cleanly into balanced multi-row columns on mobile and a single/wide row on desktop.
  const gridColsClass =
    items.length <= 3
      ? 'grid-cols-3 max-w-md mx-auto'
      : items.length === 4
        ? 'grid-cols-4'
        : items.length === 5
          ? 'grid-cols-5'
          : items.length === 6
            ? 'grid-cols-6'
            : items.length === 7
              ? 'grid-cols-7'
              : items.length === 8 || items.length === 16
                ? 'grid-cols-4 sm:grid-cols-8'
                : items.length === 9
                  ? 'grid-cols-3 sm:grid-cols-9'
                  : 'grid-cols-5 sm:grid-cols-10';

  const selectedItem =
    highlightedIndex >= 0 && highlightedIndex < items.length
      ? items[highlightedIndex]
      : null;

  return (
    <div className="space-y-2.5" data-testid="all-in-one-tool-grid">
      {/* Main Numbered Vertical Pill Columns (1..N side-by-side like Reference Poster) */}
      <div className={`grid ${gridColsClass} gap-1 sm:gap-1.5 pt-2.5 items-stretch`}>
        {items.map((item, idx) => {
          const isCurrent = idx === currentItemIndex;
          const isSelected = idx === highlightedIndex;
          const theme = COLUMN_THEMES[idx % COLUMN_THEMES.length];
          const hasImage = Boolean(item.posterUrl && !failedImages[item.slug]);

          return (
            <button
              key={item.slug || idx}
              type="button"
              onClick={() => setActiveIndex(idx === activeIndex ? null : idx)}
              data-testid={`tool-slot-${idx + 1}`}
              aria-label={`รายการที่ ${idx + 1}: ${item.name} (${item.priceLabel})`}
              className={`group relative flex flex-col items-center justify-between rounded-t-2xl rounded-b-xl px-0.5 sm:px-1 pb-1 pt-3 transition-all text-center cursor-pointer select-none bg-gradient-to-b ${
                theme.column
              } ${
                isCurrent
                  ? 'ring-2 ring-emerald-400 border-2 border-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.6)] -translate-y-0.5'
                  : isSelected
                    ? 'ring-2 ring-amber-400 border-2 border-amber-500 shadow-md -translate-y-0.5'
                    : 'border-[1.5px] shadow-xs hover:-translate-y-0.5'
              }`}
            >
              {/* 3D Glossy Number Circle (1..N) overlapping top of pill column */}
              <span
                className={`-mt-5 mb-0.5 inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-b ${theme.badge} border-[1.5px] text-[10px] sm:text-xs font-black text-white shadow-[0_2px_4px_rgba(0,0,0,0.35)]`}
              >
                {idx + 1}
              </span>

              {/* Compact Vertical Thai Title (Minimal reading, bold poster style) */}
              <span className="text-[8.5px] xs:text-[9.5px] sm:text-[11px] font-black leading-[1.12] text-stone-950 tracking-tight line-clamp-3 min-h-[27px] sm:min-h-[32px] flex items-center justify-center px-0.5">
                {item.shortTitle}
              </span>

              {/* Phone Screen Mockup Frame at bottom of each column */}
              <div
                className={`mt-1 w-full ${
                  compact ? 'aspect-[9/12]' : 'aspect-[9/13]'
                } rounded-lg overflow-hidden border-[1.5px] border-stone-900 bg-stone-950 relative flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.35)]`}
              >
                {/* Tiny phone speaker notch */}
                <span className="absolute top-0.5 left-1/2 -translate-x-1/2 z-10 w-3 h-0.5 rounded-full bg-black/60 pointer-events-none" />

                {hasImage ? (
                  <img
                    src={item.posterUrl!}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [item.slug]: true }))
                    }
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-0.5 text-center">
                    <span className="text-base sm:text-xl">{item.icon}</span>
                  </div>
                )}

                {/* Price / Free Pill inside Phone Frame */}
                <span
                  className={`absolute bottom-0.5 inset-x-0.5 py-[1px] px-0.5 rounded text-[7px] sm:text-[8.5px] font-black tracking-tighter truncate leading-tight ${
                    item.standalonePrice === 0
                      ? 'bg-emerald-600/95 text-white'
                      : 'bg-stone-950/90 text-amber-300'
                  }`}
                >
                  {item.priceLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Lifetime Free Updates Ribbon Inside the Poster */}
      {renderPosterFooterRibbon && (
        <div
          data-testid="grid-dynamic-item-count"
          className="py-1.5 sm:py-2 px-3 rounded-full bg-gradient-to-r from-[#2b1204] via-[#451a03] to-[#2b1204] border-2 border-amber-400 text-center shadow-[0_4px_14px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(254,240,138,0.45)]"
        >
          <span className="text-xs sm:text-base font-black text-white tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            อัปเดตและเติมโปรแกรม AI ใหม่ให้ฟรี{' '}
            <span className="text-yellow-300 underline decoration-amber-400/80">
              ตลอดชีพ
            </span>
          </span>
        </div>
      )}

      {/* Selected / Current Item Full Title Bar */}
      {selectedItem && (
        <div
          className="px-2.5 py-1 rounded-xl bg-stone-950/90 border border-amber-400/35 flex items-center justify-between gap-2 text-left"
          data-testid="selected-tool-detail"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm shrink-0">{selectedItem.icon}</span>
            <span className="text-[10.5px] sm:text-xs font-extrabold text-amber-100 truncate">
              #{highlightedIndex + 1} {selectedItem.name}
            </span>
          </div>
          <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/40 text-[9.5px] sm:text-[11px] font-black text-amber-300">
            {selectedItem.standalonePrice > 0
              ? `แยกซื้อ ${selectedItem.priceLabel}`
              : 'รวมฟรีในแพ็ก'}
          </span>
        </div>
      )}

      {/* Layer 3: Bottom Interactive Thumbnail Strip with Green "ตัวนี้" Indicator */}
      {showThumbnailStrip && (
        <div
          className={`pt-0.5 grid ${gridColsClass} gap-1 sm:gap-1.5 items-stretch`}
          data-testid="all-in-one-thumbnail-strip"
        >
          {items.map((item, idx) => {
            const isCurrent = idx === currentItemIndex;
            const isSelected = idx === highlightedIndex;
            const hasThumb = Boolean(
              (item.logoUrl || item.posterUrl) && !failedImages[`thumb-${item.slug}`]
            );

            return (
              <button
                key={`thumb-${item.slug || idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                data-testid={`tool-thumb-${idx + 1}`}
                aria-label={`ดูรายละเอียดรายการที่ ${idx + 1}: ${item.shortTitle}${
                  isCurrent ? ' (ตัวนี้)' : ''
                }`}
                className={`relative w-full rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'ring-2 ring-emerald-500 bg-emerald-500 p-[1.5px] shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-[1.03]'
                    : isSelected
                      ? 'ring-2 ring-amber-400 bg-stone-900 p-[1px]'
                      : 'border border-amber-500/35 bg-stone-900/90 opacity-90 hover:opacity-100'
                }`}
              >
                {/* Mini Number Pill in top-left corner (Matches Reference Image 1) */}
                <span className="absolute top-1 left-1 z-10 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white border border-stone-800 text-[8px] sm:text-[9px] font-black text-stone-950 flex items-center justify-center shadow-xs">
                  {idx + 1}
                </span>

                <div className="w-full aspect-square rounded-t-[9px] bg-stone-950 flex items-center justify-center overflow-hidden">
                  {hasThumb ? (
                    <img
                      src={(item.logoUrl || item.posterUrl)!}
                      alt={item.shortTitle}
                      loading="lazy"
                      decoding="async"
                      onError={() =>
                        setFailedImages((prev) => ({
                          ...prev,
                          [`thumb-${item.slug}`]: true,
                        }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm sm:text-base">{item.icon}</span>
                  )}
                </div>

                {/* Green "ตัวนี้" Badge at Bottom of Active Thumbnail (Matches Reference Image 1) */}
                {isCurrent ? (
                  <div
                    data-testid="current-tool-badge"
                    className="w-full bg-emerald-500 text-white text-[8.5px] sm:text-[10px] font-black py-0.5 text-center leading-tight tracking-tight"
                  >
                    ตัวนี้
                  </div>
                ) : (
                  <div className="w-full bg-stone-950/95 text-stone-300 text-[7.5px] sm:text-[9px] font-bold py-0.5 px-0.5 text-center leading-tight truncate">
                    {item.shortTitle}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
