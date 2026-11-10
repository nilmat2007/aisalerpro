'use client';

import React, { useState } from 'react';
import type { ShowcaseToolItem } from '@/lib/all-in-one-pricing';

const NUMBER_BADGE_COLORS = [
  'from-rose-500 to-pink-600 border-pink-300',
  'from-emerald-500 to-green-600 border-emerald-300',
  'from-amber-500 to-orange-600 border-amber-300',
  'from-sky-500 to-blue-600 border-sky-300',
  'from-yellow-400 to-amber-500 border-yellow-200 text-stone-950',
  'from-purple-500 to-violet-600 border-purple-300',
  'from-red-500 to-rose-600 border-red-300',
];

export interface AllInOneToolGridProps {
  items: ShowcaseToolItem[];
  currentItemIndex?: number;
  showThumbnailStrip?: boolean;
  compact?: boolean;
}

export default function AllInOneToolGrid({
  items,
  currentItemIndex = -1,
  showThumbnailStrip = true,
  compact = false,
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

  const gridColsClass =
    items.length < 4
      ? 'grid-cols-2 sm:grid-cols-3 max-w-md mx-auto'
      : items.length <= 7
        ? 'grid-cols-4 sm:grid-cols-7'
        : 'grid-cols-4 sm:grid-cols-5 md:grid-cols-8';

  const selectedItem =
    highlightedIndex >= 0 && highlightedIndex < items.length
      ? items[highlightedIndex]
      : null;

  return (
    <div className="space-y-3" data-testid="all-in-one-tool-grid">
      {/* Main Numbered Visual Layer Columns (1..N) */}
      <div className={`grid ${gridColsClass} gap-1.5 sm:gap-2 items-stretch`}>
        {items.map((item, idx) => {
          const isCurrent = idx === currentItemIndex;
          const isSelected = idx === highlightedIndex;
          const badgeColor = NUMBER_BADGE_COLORS[idx % NUMBER_BADGE_COLORS.length];
          const hasImage = Boolean(item.posterUrl && !failedImages[item.slug]);

          return (
            <button
              key={item.slug || idx}
              type="button"
              onClick={() => setActiveIndex(idx === activeIndex ? null : idx)}
              data-testid={`tool-slot-${idx + 1}`}
              aria-label={`รายการที่ ${idx + 1}: ${item.name} (${item.priceLabel})`}
              className={`group relative flex flex-col items-center justify-between rounded-xl p-1.5 pt-3.5 transition-all text-center cursor-pointer select-none ${
                isCurrent
                  ? 'bg-gradient-to-b from-emerald-950/90 via-stone-900 to-stone-950 border-2 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.45)] scale-[1.02]'
                  : isSelected
                    ? 'bg-gradient-to-b from-amber-950/80 via-stone-900 to-stone-950 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                    : 'bg-gradient-to-b from-stone-800/95 via-stone-900/95 to-stone-950 border border-amber-400/35 hover:border-amber-400/80'
              }`}
            >
              {/* Floating Number Circle (1..N) */}
              <span
                className={`-mt-5 mb-1 inline-flex items-center justify-center w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-gradient-to-b ${badgeColor} border text-[11px] sm:text-xs font-black text-white shadow-md`}
              >
                {idx + 1}
              </span>

              {/* Short Scannable Title (2 lines max, minimal reading) */}
              <span className="text-[10px] sm:text-[11px] font-black leading-tight text-white line-clamp-2 min-h-[26px] flex items-center justify-center px-0.5">
                {item.shortTitle}
              </span>

              {/* Real Program/Course Poster Frame (or Fallback Icon Card) */}
              <div
                className={`mt-1.5 w-full ${
                  compact ? 'aspect-[4/4.2]' : 'aspect-[3/3.6]'
                } rounded-lg overflow-hidden border border-white/15 bg-stone-950 relative flex items-center justify-center shadow-inner`}
              >
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
                  <div className="flex flex-col items-center justify-center p-1 text-center">
                    <span className="text-xl sm:text-2xl">{item.icon}</span>
                    <span className="text-[8px] text-stone-400 mt-0.5 font-semibold">
                      {item.isCourse ? '22 บทเรียน' : 'AI Tool'}
                    </span>
                  </div>
                )}

                {/* Individual Price Pill inside Frame */}
                <span
                  className={`absolute bottom-1 inset-x-1 py-0.5 px-1 rounded text-[8px] sm:text-[9px] font-black tracking-tight truncate backdrop-blur-xs ${
                    item.standalonePrice === 0
                      ? 'bg-emerald-600/90 text-white'
                      : 'bg-black/80 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {item.priceLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected / Current Item Full Title Bar */}
      {selectedItem && (
        <div
          className="px-3 py-1.5 rounded-xl bg-stone-950/90 border border-amber-400/30 flex items-center justify-between gap-2 text-left"
          data-testid="selected-tool-detail"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm shrink-0">{selectedItem.icon}</span>
            <span className="text-[11px] sm:text-xs font-extrabold text-amber-100 truncate">
              #{highlightedIndex + 1} {selectedItem.name}
            </span>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/40 text-[10px] sm:text-[11px] font-black text-amber-300">
            {selectedItem.standalonePrice > 0
              ? `แยกซื้อ ${selectedItem.priceLabel}`
              : 'รวมฟรีในแพ็ก'}
          </span>
        </div>
      )}

      {/* Layer 3: Bottom Interactive Thumbnail Strip with Green "ตัวนี้" Indicator */}
      {showThumbnailStrip && (
        <div
          className="pt-1 flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar"
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
                className={`relative shrink-0 w-11 sm:w-13 rounded-xl overflow-hidden transition-all cursor-pointer ${
                  isCurrent
                    ? 'ring-2 ring-emerald-400 bg-emerald-950/90 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-105'
                    : isSelected
                      ? 'ring-2 ring-amber-400 bg-stone-900 scale-105'
                      : 'border border-white/20 bg-stone-900/80 opacity-85 hover:opacity-100'
                }`}
              >
                {/* Mini Number Pill */}
                <span className="absolute top-0.5 left-0.5 z-10 w-4 h-4 rounded-full bg-stone-950/90 border border-white/30 text-[9px] font-black text-white flex items-center justify-center">
                  {idx + 1}
                </span>

                <div className="w-full aspect-square bg-stone-950 flex items-center justify-center overflow-hidden">
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
                    <span className="text-base">{item.icon}</span>
                  )}
                </div>

                {/* Green "ตัวนี้" Badge (Matches Reference Image 1) */}
                {isCurrent ? (
                  <div
                    data-testid="current-tool-badge"
                    className="w-full bg-emerald-500 text-stone-950 text-[9px] font-black py-0.5 text-center leading-none tracking-tight"
                  >
                    ตัวนี้
                  </div>
                ) : (
                  <div className="w-full bg-stone-950/95 text-stone-300 text-[8px] font-bold py-0.5 px-0.5 text-center leading-none truncate">
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
