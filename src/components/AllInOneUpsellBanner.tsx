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

  // Sync when server-passed tools prop changes
  useEffect(() => {
    if (Array.isArray(tools) && tools.length > 0) {
      setLiveTools(tools);
    }
  }, [tools]);

  // Fetch live tools in idle time only if no tools prop was passed
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
        // Fallback to DEFAULT_SHOWCASE_TOOLS inside getAllInOnePricing
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

  // Check dismiss state (24h localStorage or tab sessionStorage)
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
      // Ignore storage errors in private mode
    }
  }, [dismissPersistence, currentToolSlug]);

  // Fire upsell_shown_on_tool when rendered on a specific tool/checkout context
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
      className={`relative space-y-3 ${className}`}
    >
      {/* Layer 1: Contextual "ก่อนตัดสินใจ" Header (inspired by Reference Image 1) */}
      <div
        className="relative rounded-2xl bg-[var(--bg-surface)]/95 border border-[var(--border-accent)] px-4 py-3 text-center shadow-sm"
        data-testid="upsell-contextual-header"
      >
        {dismissPersistence !== 'none' && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="ซ่อนคำแนะนำโปรโมชันนี้ชั่วคราว"
            data-testid="dismiss-upsell-btn"
            className="absolute top-1.5 right-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}

        <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-600 dark:text-rose-400 tracking-wide">
          <span>💡</span>
          <span>ก่อนตัดสินใจ</span>
        </div>

        {pricing.isCurrentToolEligible && pricing.currentItem ? (
          pricing.shouldUseDiffFraming ? (
            <>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-black text-amber-900 dark:text-amber-300 leading-tight">
                เพิ่มอีกแค่ ฿{pricing.upgradeDiffFormatted} ได้ครบทั้ง {pricing.toolOnlyCount} โปรแกรม AI + คอร์สเรียน!
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] font-semibold">
                <strong className="text-[var(--text-primary)]">{pricing.currentItem.name}</strong> ที่คุณกำลังดูอยู่ คือ{' '}
                <span className="underline decoration-emerald-500 font-black text-emerald-700 dark:text-emerald-400">
                  รายการที่ #{pricing.currentItemIndex + 1} ใน {pricing.itemCount} รายการ
                </span>{' '}
                ของแพ็กเกจเหมาๆ ปุ๊บ ปั๊บ {pricing.packagePriceFormatted}
              </p>
            </>
          ) : (
            <>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-black text-amber-900 dark:text-amber-300 leading-tight">
                เหมาครบทั้ง {pricing.toolOnlyCount} โปรแกรม AI + คอร์สเรียน 22 บท เพียง ฿{pricing.packagePriceFormatted}!
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] font-semibold">
                รวม <strong className="text-[var(--text-primary)]">{pricing.currentItem.name}</strong> (รายการที่ #{pricing.currentItemIndex + 1}) ไว้ในแพ็กแล้ว — ประหยัดกว่าซื้อแยกทันที{' '}
                <strong className="text-rose-600 dark:text-rose-400">฿{pricing.savingsFormatted}</strong>
              </p>
            </>
          )
        ) : (
          <>
            <h3 className="mt-0.5 text-lg sm:text-2xl font-black text-amber-900 dark:text-amber-300 leading-tight">
              เหมาครบทั้ง {pricing.toolOnlyCount} โปรแกรม AI + คอร์สเรียน 22 บท เพียง ฿{pricing.packagePriceFormatted}!
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] font-semibold">
              ไม่ต้องซื้อแยกทีละตัว (มูลค่ารวม ฿{pricing.totalSeparateFormatted}) — จ่ายครั้งเดียวได้ครบทั้ง {pricing.itemCount} รายการในภาพด้านล่างทันที
            </p>
          </>
        )}
      </div>

      {/* Layer 2 & 3: HTML Visual Poster Showcase Card (Minimal Reading, Maximum Visual Memory) */}
      <div className="puppap-vip-card-glow relative rounded-3xl overflow-hidden bg-gradient-to-b from-stone-950 via-[#161109] to-stone-950 text-white border-2 border-amber-400 shadow-2xl p-3.5 sm:p-5 space-y-3.5">
        {/* Ambient radial gold & crimson spotlights */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-44 bg-amber-400/20 rounded-full blur-3xl" />

        {/* Poster Top Header: 3D Gold Title & Giant 999 Price + Rule-of-100 Savings Hook */}
        <div className="relative z-10 text-center space-y-1.5">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/95 border border-rose-300/50 text-[11px] sm:text-xs font-black text-white shadow-md">
            <span>🔥 ประหยัดทันที ฿{pricing.savingsFormatted}</span>
            <span>·</span>
            <span>ลด {pricing.discountPercent}% (คุ้มกว่าซื้อแยก 2 เท่า!)</span>
          </div>

          <div className="pt-0.5">
            <div className="text-sm sm:text-base font-black text-amber-200 tracking-wide uppercase">
              👑 แพ็กเหมาๆ ปุ๊บ ปั๊บ VIP ALL-IN-ONE
            </div>
            <div className="flex items-baseline justify-center gap-2 flex-wrap mt-0.5">
              <span
                className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-500 drop-shadow-[0_3px_10px_rgba(245,158,11,0.45)] tracking-tight"
                data-testid="poster-package-price"
              >
                {pricing.packagePriceFormatted}
              </span>
              <span className="text-lg sm:text-xl font-black text-white">บาท</span>
              <span
                className="px-2 py-0.5 rounded-lg bg-stone-900/90 border border-white/15 text-xs sm:text-sm text-stone-300 line-through font-bold"
                data-testid="poster-separate-total"
              >
                ปกติรวม ฿{pricing.totalSeparateFormatted}
              </span>
            </div>
          </div>

          {/* Center Value Ribbon (Matches "ได้ทุกโปรแกรม คุ้มสุดๆ" from Reference Image 1) */}
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500/25 via-amber-400/35 to-amber-500/25 border border-amber-300/60 text-xs sm:text-sm font-black text-amber-200 shadow-inner">
            <span>✨ ได้ครบทุกโปรแกรม + คอร์สเรียน ({pricing.itemCount} รายการ)</span>
            <span className="hidden sm:inline text-amber-300">·</span>
            <span className="hidden sm:inline text-emerald-300">
              ⚡ เฉลี่ยเพียง ฿{pricing.unitCostAvg}/รายการ
            </span>
          </div>
        </div>

        {/* Dynamic 1..N Visual Cards + Bottom Interactive Thumbnail Strip */}
        <div className="relative z-10 pt-1">
          <AllInOneToolGrid
            items={pricing.items}
            currentItemIndex={pricing.currentItemIndex}
            showThumbnailStrip={true}
            compact={isCompact}
          />
        </div>

        {/* Bottom Lifetime Free Updates Ribbon (Matches "อัปเดทและเติมโปรแกรมให้ตลอดชีพ" from Reference Image 1) */}
        <div className="relative z-10 py-1.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-emerald-900/80 to-emerald-950/90 border border-emerald-400/50 text-center shadow-md">
          <span className="text-xs sm:text-sm font-black text-emerald-200">
            ♾️ อัปเดตและเติมโปรแกรม AI ใหม่ให้ฟรีตลอดชีพ (ไม่มีค่ารายเดือน)
          </span>
        </div>

        {/* Layer 4: Primary Animated Gold Shimmer CTA */}
        <div className="relative z-10 pt-0.5 flex flex-col items-center gap-1.5">
          <Link
            href="/checkout/puppap-all-in-one"
            onClick={handleCtaClick}
            data-testid="all-in-one-cta-link"
            className={`puppap-gold-cta-animated w-full ${
              isCompact || isModal ? 'py-3 text-sm sm:text-base' : 'py-3.5 sm:py-4 text-base sm:text-lg'
            } px-6 rounded-2xl font-black inline-flex items-center justify-center gap-2 text-center`}
          >
            <span>👑 เหมาครบทั้ง {pricing.itemCount} รายการ เพียง ฿{pricing.packagePriceFormatted}</span>
            <span>→</span>
          </Link>
          <div className="text-[11px] text-amber-200/85 font-semibold text-center">
            ⚡ สแกน PromptPay ปลดล็อกครบทุกตัวเข้าบัญชีทันที · เฉลี่ยเพียง ฿{pricing.unitCostAvg}/รายการ
          </div>
        </div>
      </div>
    </section>
  );
}
