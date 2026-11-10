'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AllInOneToolGrid from '@/components/AllInOneToolGrid';
import { getAllInOnePricing } from '@/lib/all-in-one-pricing';
import {
  trackFunnelEvent,
  type PromoEventSource,
} from '@/lib/meta-pixel';

const DISMISS_DAY_MS = 24 * 60 * 60 * 1000;

export interface AllInOneUpsellBannerProps {
  variant?: 'hero' | 'compact' | 'modal';
  tools?: any[] | null;
  currentToolSlug?: string | null;
  ownsAllInOne?: boolean;
  dismissPersistence?: 'day' | 'tab' | 'none';
  source?: PromoEventSource;
  className?: string;
}

export default function AllInOneUpsellBanner({
  variant = 'hero',
  tools = null,
  currentToolSlug = null,
  ownsAllInOne = false,
  dismissPersistence = 'none',
  source = 'store_banner',
  className = '',
}: AllInOneUpsellBannerProps) {
  const [liveTools, setLiveTools] = useState<any[] | null>(tools);
  const [isDismissed, setIsDismissed] = useState(false);

  const pricing = getAllInOnePricing(liveTools ?? tools, currentToolSlug);

  useEffect(() => {
    if (Array.isArray(tools) && tools.length > 0) {
      setLiveTools(tools);
    }
  }, [tools]);

  useEffect(() => {
    if (Array.isArray(tools) && tools.length > 0) return;

    let cancelled = false;
    const schedule =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : (cb: () => void) => window.setTimeout(cb, 1200);

    const handle = schedule(async () => {
      try {
        const res = await fetch('/api/tools');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setLiveTools(data);
        }
      } catch {
        // Fallback to DEFAULT_SHOWCASE_TOOLS
      }
    });

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        try {
          window.cancelIdleCallback(handle as number);
        } catch {
          clearTimeout(handle as number);
        }
      } else {
        clearTimeout(handle as number);
      }
    };
  }, [tools]);

  useEffect(() => {
    if (dismissPersistence === 'none' || typeof window === 'undefined') return;
    const key = `puppap_upsell_dismiss_${currentToolSlug || 'global'}`;
    try {
      if (dismissPersistence === 'day') {
        const raw = localStorage.getItem(key);
        if (raw) {
          const ts = Number(raw);
          if (Number.isFinite(ts) && Date.now() - ts < DISMISS_DAY_MS) {
            setIsDismissed(true);
            return;
          }
          localStorage.removeItem(key);
        }
      } else if (dismissPersistence === 'tab') {
        if (sessionStorage.getItem(key) === '1') {
          setIsDismissed(true);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [dismissPersistence, currentToolSlug]);

  useEffect(() => {
    if (ownsAllInOne || isDismissed || pricing.isEmpty || !currentToolSlug) return;
    trackFunnelEvent('upsell_shown_on_tool', {
      source,
      currentToolSlug,
      itemCount: pricing.itemCount,
      upgradeDiffAmount: pricing.upgradeDiffAmount,
    });
  }, [
    ownsAllInOne,
    isDismissed,
    pricing.isEmpty,
    currentToolSlug,
    source,
    pricing.itemCount,
    pricing.upgradeDiffAmount,
  ]);

  if (ownsAllInOne || isDismissed || pricing.isEmpty) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    const key = `puppap_upsell_dismiss_${currentToolSlug || 'global'}`;
    try {
      if (dismissPersistence === 'day') {
        localStorage.setItem(key, String(Date.now()));
      } else if (dismissPersistence === 'tab') {
        sessionStorage.setItem(key, '1');
      }
    } catch {
      // Ignore storage errors
    }
  };

  const handleCtaClick = () => {
    trackFunnelEvent('all_in_one_cta_click', {
      source,
      currentToolSlug,
      itemCount: pricing.itemCount,
      upgradeDiffAmount: pricing.upgradeDiffAmount,
      utm_content: `all_in_one_${source}`,
    });
  };

  const isCompact = variant === 'compact';
  const isModal = variant === 'modal';

  return (
    <section
      aria-label="แพ็กเกจเหมาๆ ปุ๊บ ปั๊บ 999 ปลดล็อกทุกโปรแกรมและคอร์สเรียน"
      data-testid="all-in-one-upsell-banner"
      className={`relative space-y-2.5 ${className}`}
    >
      {/* Layer 1: Clean Minimal "ก่อนตัดสินใจ" Header Above Poster (Matches Reference Image 1) */}
      <div
        className="relative px-3 py-2 text-center"
        data-testid="upsell-contextual-header"
      >
        {dismissPersistence !== 'none' && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="ซ่อนคำแนะนำโปรโมชันนี้ชั่วคราว"
            data-testid="dismiss-upsell-btn"
            className="absolute top-0 right-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}

        <div className="text-xs sm:text-sm font-extrabold text-orange-700 dark:text-amber-400 tracking-wide">
          ก่อนตัดสินใจ
        </div>

        {pricing.isCurrentToolEligible && pricing.currentItem ? (
          pricing.shouldUseDiffFraming ? (
            <>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-black text-[#6b210b] dark:text-amber-200 leading-snug">
                เพิ่มอีก ฿{pricing.upgradeDiffFormatted} ได้ครบทั้ง {pricing.toolOnlyCount} โปรแกรม + คอร์สเรียน
              </h3>
              <p className="mt-0.5 text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                {pricing.currentItem.shortTitle}ที่คุณกำลังจะซื้อ คือ 1 ใน {pricing.itemCount} รายการ ของแพ็กเกจเหมาๆ ปุ๊บ ปั๊บ
              </p>
            </>
          ) : (
            <>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-black text-[#6b210b] dark:text-amber-200 leading-snug">
                เหมาครบทั้ง {pricing.toolOnlyCount} โปรแกรม + คอร์สเรียน เพียง ฿{pricing.packagePriceFormatted}
              </h3>
              <p className="mt-0.5 text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                {pricing.currentItem.shortTitle}ที่คุณกำลังดู คือรายการที่ #{pricing.currentItemIndex + 1} ใน {pricing.itemCount} รายการ (ประหยัดทันที ฿{pricing.savingsFormatted})
              </p>
            </>
          )
        ) : (
          <>
            <h3 className="mt-0.5 text-lg sm:text-2xl font-black text-[#6b210b] dark:text-amber-200 leading-snug">
              เหมาครบทั้ง {pricing.toolOnlyCount} โปรแกรม + คอร์สเรียน เพียง ฿{pricing.packagePriceFormatted}
            </h3>
            <p className="mt-0.5 text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              ปลดล็อกครบทั้ง {pricing.itemCount} รายการในโปสเตอร์ด้านล่าง (จากปกติรวม ฿{pricing.totalSeparateFormatted})
            </p>
          </>
        )}
      </div>

      {/* Layer 2: 3D Graphic HTML Poster Card (PUP PAP AI Gold / Obsidian / Crimson Theme) */}
      <div className="puppap-vip-card-glow relative rounded-[26px] overflow-hidden bg-gradient-to-b from-[#2a1205] via-[#170c04] to-[#241004] text-white border-[2.5px] border-amber-400 shadow-2xl p-2.5 sm:p-4 space-y-2">
        {/* Ambient Poster Sunburst & Sparkles */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-44 bg-amber-400/30 rounded-full blur-2xl" />
        <div className="pointer-events-none absolute top-3 left-4 text-yellow-300 text-base sm:text-xl select-none">
          ✦
        </div>
        <div className="pointer-events-none absolute top-12 left-7 text-amber-300 text-xs select-none">
          ✦
        </div>

        {/* Poster Top Header: 3D Extruded Title + Giant 999 บาท + Mascot Badge on Right */}
        <div className="relative z-10 flex items-center justify-between gap-2 px-1 sm:px-3 pt-0.5">
          <div className="flex-1 text-center sm:pl-10">
            {/* 3D Title ("แพ็กเหมาๆ ปุ๊บ ปั๊บ") */}
            <div className="puppap-poster-3d-title text-xl xs:text-2xl sm:text-3xl font-black tracking-tight leading-none">
              แพ็กเหมาๆ ปุ๊บ ปั๊บ
            </div>

            {/* Giant 3D Gold "999" + "บาท" + "ปกติ 2,054" tucked underneath */}
            <div className="mt-0.5 inline-flex items-end justify-center gap-1.5">
              <span
                className="puppap-poster-3d-price text-5xl xs:text-6xl sm:text-7xl font-black leading-[0.88] tracking-tighter"
                data-testid="poster-package-price"
              >
                {pricing.packagePriceFormatted}
              </span>
              <div className="flex flex-col items-start leading-none pb-0.5">
                <span className="puppap-poster-3d-baht text-lg xs:text-xl sm:text-2xl font-black">
                  บาท
                </span>
                <span
                  className="mt-0.5 px-1.5 py-0.5 rounded-md bg-stone-950/90 border border-amber-400/50 text-[9px] sm:text-[11px] font-black text-amber-200 line-through"
                  data-testid="poster-separate-total"
                >
                  ปกติ ฿{pricing.totalSeparateFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Right Mascot / Brand Character Badge (Matches Cute Mascot Position in Reference Poster) */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="relative w-13 h-13 xs:w-15 xs:h-15 sm:w-18 sm:h-18 rounded-2xl border-2 border-yellow-300 bg-gradient-to-b from-amber-300 to-amber-600 p-0.5 shadow-[0_6px_16px_rgba(0,0,0,0.6)] rotate-3">
              <span className="absolute -top-2.5 -right-2 text-base sm:text-lg drop-shadow">
                👑
              </span>
              <img
                src="/images/logo-puppap-ai.png"
                alt="PUP PAP AI"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover rounded-[13px] bg-stone-950"
              />
            </div>
            <span className="mt-1 px-1.5 py-0.5 rounded-full bg-rose-600 border border-rose-300 text-[8.5px] sm:text-[10px] font-black text-white shadow-xs whitespace-nowrap">
              ลด {pricing.discountPercent}%
            </span>
          </div>
        </div>

        {/* Glowing Stage Ring + "▶ FLOW | Google Flow" Pill */}
        <div className="relative z-10 flex flex-col items-center -mt-1">
          <div className="puppap-poster-stage-ring px-4 py-1 rounded-full inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-950/95 via-stone-900/95 to-amber-950/95">
            <span className="w-4 h-4 rounded-full bg-amber-400 text-stone-950 text-[9px] font-black flex items-center justify-center shadow-xs">
              ▶
            </span>
            <span className="text-[11px] sm:text-xs font-black tracking-wide text-amber-200">
              FLOW
            </span>
            <span className="text-amber-500/60">|</span>
            <span className="text-[10px] sm:text-xs font-bold text-white">
              Google Flow + คอร์ส 22 บท
            </span>
          </div>
        </div>

        {/* Full-Width Glossy Banner Bar ("✨ ได้ทุกโปรแกรม คุ้มสุดๆ ✨") */}
        <div className="relative z-10 py-1.5 px-3 rounded-full bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 border-2 border-amber-300 text-center shadow-[0_4px_12px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)]">
          <div className="flex items-center justify-center gap-1.5 flex-wrap text-sm sm:text-lg font-black tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]">
            <span className="text-yellow-300 text-xs sm:text-sm">✦</span>
            <span className="text-white">ได้ทุกโปรแกรม + คอร์ส</span>
            <span className="text-yellow-300">คุ้มสุดๆ!</span>
            <span className="text-[10px] sm:text-xs font-extrabold text-amber-100 bg-black/35 px-2 py-0.5 rounded-full">
              ประหยัดทันที ฿{pricing.savingsFormatted} · คุ้มกว่าซื้อแยก 2 เท่า!
            </span>
          </div>
        </div>

        {/* Dynamic 1..N Vertical Columns + Lifetime Updates Ribbon + Thumbnail Strip */}
        <div className="relative z-10">
          <AllInOneToolGrid
            items={pricing.items}
            currentItemIndex={pricing.currentItemIndex}
            showThumbnailStrip={true}
            compact={isCompact}
            renderPosterFooterRibbon={true}
          />
        </div>

        {/* Layer 4: Primary Animated Gold Shimmer CTA */}
        <div className="relative z-10 pt-1 flex flex-col items-center gap-1">
          <Link
            href="/checkout/puppap-all-in-one"
            onClick={handleCtaClick}
            data-testid="all-in-one-cta-link"
            className={`puppap-gold-cta-animated w-full ${
              isCompact || isModal ? 'py-2.5 sm:py-3 text-sm sm:text-base' : 'py-3.5 text-base sm:text-lg'
            } px-5 rounded-2xl font-black inline-flex items-center justify-center gap-2 text-center`}
          >
            <span>👑 เหมาครบทั้ง {pricing.itemCount} รายการ เพียง ฿{pricing.packagePriceFormatted}</span>
            <span>→</span>
          </Link>
          <div className="text-[10.5px] sm:text-[11px] text-amber-200/90 font-semibold text-center">
            ⚡ สแกน PromptPay ปลดล็อกครบทุกตัวเข้าบัญชีทันที · เฉลี่ยเพียง ฿{pricing.unitCostAvg}/รายการ
          </div>
        </div>
      </div>
    </section>
  );
}
