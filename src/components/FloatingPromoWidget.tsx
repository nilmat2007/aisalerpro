'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import AllInOneUpsellBanner from '@/components/AllInOneUpsellBanner';
import {
  ALL_IN_ONE_SLUG,
  COURSE_BUNDLE_BONUS_TOOL_SLUGS,
  getAllInOnePricing,
} from '@/lib/all-in-one-pricing';
import { trackFunnelEvent } from '@/lib/meta-pixel';

const BAR_DISMISS_STORAGE_KEY = 'puppap_floating_promo_dismiss_ts';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

export function isFloatingPromoExcludedPath(pathname: string | null): boolean {
  if (!pathname) return true;
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/checkout')
  ) {
    return true;
  }
  return false;
}

export default function FloatingPromoWidget() {
  const pathname = usePathname();
  const [tools, setTools] = useState<any[] | null>(null);
  const [ownsAllInOne, setOwnsAllInOne] = useState(false);
  const [widgetState, setWidgetState] = useState<'hidden' | 'pill' | 'bar'>('hidden');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all_in_one_999' | 'course_159'>('all_in_one_999');

  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const isExcluded = isFloatingPromoExcludedPath(pathname);

  const inferredToolSlug = React.useMemo(() => {
    if (!pathname) return null;
    if (pathname.startsWith('/tool/')) {
      return pathname.split('/')[2] || null;
    }
    if (pathname.startsWith('/course/') || pathname === '/courses') {
      return 'tiktok-ai-affiliate';
    }
    return null;
  }, [pathname]);

  const pricing = getAllInOnePricing(tools, inferredToolSlug);

  // Fetch tools & ownership in idle callback (Safari-safe fallback)
  useEffect(() => {
    if (isExcluded || typeof window === 'undefined') return;

    let cancelled = false;
    const schedule =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : (cb: () => void) => window.setTimeout(cb, 1200);

    const handle = schedule(async () => {
      try {
        const [toolsRes, myToolsRes] = await Promise.allSettled([
          fetch('/api/tools'),
          fetch('/api/my-tools'),
        ]);

        if (cancelled) return;

        if (toolsRes.status === 'fulfilled' && toolsRes.value.ok) {
          const toolsData = await toolsRes.value.json();
          if (!cancelled && Array.isArray(toolsData) && toolsData.length > 0) {
            setTools(toolsData);
          }
        }

        if (myToolsRes.status === 'fulfilled' && myToolsRes.value.ok) {
          const myData = await myToolsRes.value.json();
          const ownedSlugs: string[] = Array.isArray(myData?.ownedSlugs)
            ? myData.ownedSlugs
            : Array.isArray(myData?.tools)
              ? myData.tools.map((t: any) => t.slug)
              : [];
          if (
            !cancelled &&
            (Boolean(myData?.hasFullBundle) || ownedSlugs.includes(ALL_IN_ONE_SLUG))
          ) {
            setOwnsAllInOne(true);
          }
        }
      } catch {
        // Non-blocking fallback
      }
    });

    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function') {
        try {
          window.cancelIdleCallback(handle as number);
        } catch {
          clearTimeout(handle as number);
        }
      } else {
        clearTimeout(handle as number);
      }
    };
  }, [isExcluded]);

  // Smart Trigger: Show after 25% scroll OR 3.5 seconds
  useEffect(() => {
    if (isExcluded || ownsAllInOne || pricing.isEmpty || typeof window === 'undefined') {
      return;
    }

    let triggered = false;
    const activateWidget = () => {
      if (triggered) return;
      triggered = true;

      let recentlyDismissed = false;
      try {
        const rawTs = localStorage.getItem(BAR_DISMISS_STORAGE_KEY);
        if (rawTs) {
          const ts = Number(rawTs);
          if (Number.isFinite(ts) && Date.now() - ts < DISMISS_DURATION_MS) {
            recentlyDismissed = true;
          } else {
            localStorage.removeItem(BAR_DISMISS_STORAGE_KEY);
          }
        }
      } catch {
        // Ignore storage errors
      }

      if (recentlyDismissed) {
        setWidgetState('pill');
        trackFunnelEvent('promo_pill_shown', {
          source: 'floating_bar',
          currentToolSlug: inferredToolSlug,
          itemCount: pricing.itemCount,
        });
      } else {
        setWidgetState('bar');
        trackFunnelEvent('promo_bar_expanded', {
          source: 'floating_bar',
          currentToolSlug: inferredToolSlug,
          itemCount: pricing.itemCount,
        });
      }
    };

    const handleScroll = () => {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 100 && window.scrollY / scrollHeight >= 0.25) {
        activateWidget();
      }
    };

    const timer = window.setTimeout(activateWidget, 3500);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isExcluded, ownsAllInOne, pricing.isEmpty, inferredToolSlug, pricing.itemCount]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    trackFunnelEvent('promo_modal_closed', {
      source: 'floating_modal',
      currentToolSlug: inferredToolSlug,
      tab: activeTab,
    });
    window.setTimeout(() => {
      triggerButtonRef.current?.focus();
    }, 0);
  }, [inferredToolSlug, activeTab]);

  // Modal accessibility: Initial focus on <h2 ref={headingRef} tabIndex={-1} id="promo-modal-title">, Focus Trap & Escape
  useEffect(() => {
    if (!isModalOpen) return;

    const focusTimer = window.setTimeout(() => {
      headingRef.current?.focus();
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, closeModal]);

  if (isExcluded || ownsAllInOne || pricing.isEmpty || widgetState === 'hidden') {
    return null;
  }

  const handleOpenModal = (fromPill = false) => {
    if (fromPill) {
      trackFunnelEvent('promo_pill_expanded', {
        source: 'floating_bar',
        currentToolSlug: inferredToolSlug,
        itemCount: pricing.itemCount,
      });
    }
    setIsModalOpen(true);
    trackFunnelEvent('promo_modal_opened', {
      source: 'floating_modal',
      currentToolSlug: inferredToolSlug,
      tab: activeTab,
      itemCount: pricing.itemCount,
    });
  };

  const handleDismissBarToPill = () => {
    setWidgetState('pill');
    try {
      localStorage.setItem(BAR_DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors
    }
    trackFunnelEvent('promo_bar_dismissed', {
      source: 'floating_bar',
      currentToolSlug: inferredToolSlug,
      itemCount: pricing.itemCount,
    });
  };

  const handleSwitchTab = (tab: 'all_in_one_999' | 'course_159') => {
    setActiveTab(tab);
    trackFunnelEvent('promo_modal_tab_switch', {
      source: 'floating_modal',
      currentToolSlug: inferredToolSlug,
      tab,
    });
  };

  const bonusTools = pricing.items.filter((it) =>
    (COURSE_BUNDLE_BONUS_TOOL_SLUGS as readonly string[]).includes(it.slug)
  );

  return (
    <>
      {/* State 1: Minimized Pill (Bottom-Right) */}
      {widgetState === 'pill' && !isModalOpen && (
        <div
          className="fixed right-3 bottom-3 z-40 pb-[env(safe-area-inset-bottom,0px)]"
          data-testid="promo-pill"
        >
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => handleOpenModal(true)}
            aria-label={`เปิดดูโปรโมชันแพ็กเหมาๆ ${pricing.packagePriceFormatted} บาท ได้ครบ ${pricing.itemCount} รายการ`}
            className="puppap-gold-cta-animated min-h-[44px] px-3.5 py-2 rounded-full shadow-2xl border-2 border-amber-200 flex items-center gap-2 text-xs sm:text-sm font-black cursor-pointer"
          >
            <span>👑 โปรเหมา ฿{pricing.packagePriceFormatted}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
              ครบ {pricing.itemCount} ตัว
            </span>
          </button>
        </div>
      )}

      {/* State 2: Expanded Floating Promo Bar */}
      {widgetState === 'bar' && !isModalOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 px-2.5 sm:px-4 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] pt-1 pointer-events-none"
          data-testid="promo-bar"
        >
          <div className="pointer-events-auto max-w-3xl mx-auto rounded-2xl bg-gradient-to-r from-stone-950 via-[#1b1408] to-stone-950 text-white border-2 border-amber-400 shadow-[0_-6px_30px_rgba(0,0,0,0.55)] px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2">
            {/* Left: Mini Stacked Tool Thumbnails + Offer Copy */}
            <button
              ref={triggerButtonRef}
              type="button"
              onClick={() => handleOpenModal(false)}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group flex-1"
            >
              <div className="hidden xs:flex -space-x-2 shrink-0">
                {pricing.items.slice(0, 4).map((it, idx) => (
                  <div
                    key={it.slug || idx}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-amber-300 bg-stone-900 overflow-hidden flex items-center justify-center text-xs shadow-sm"
                  >
                    {it.logoUrl || it.posterUrl ? (
                      <img
                        src={(it.logoUrl || it.posterUrl)!}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{it.icon}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-rose-600 text-[10px] font-black text-white">
                    HOT
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-300 truncate group-hover:underline">
                    👑 โปรเหมาๆ ฿{pricing.packagePriceFormatted} ได้ครบ {pricing.itemCount} รายการ!
                  </span>
                </div>
                <div className="text-[11px] text-stone-300 truncate">
                  {pricing.shouldUseDiffFraming && pricing.currentItem
                    ? `เพิ่มอีกแค่ ฿${pricing.upgradeDiffFormatted} จากตัวนี้ · ประหยัดทันที ฿${pricing.savingsFormatted}`
                    : `ปกติรวม ฿${pricing.totalSeparateFormatted} · ประหยัดทันที ฿${pricing.savingsFormatted} (คอร์ส ฿${pricing.coursePriceFormatted})`}
                </div>
              </div>
            </button>

            {/* Right: Quick Action Buttons + 44x44 Dismiss */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenModal(false)}
                data-testid="promo-bar-open-modal-btn"
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/50 text-amber-200 text-[11px] sm:text-xs font-black cursor-pointer"
              >
                ดูรูปโปร ({pricing.itemCount})
              </button>

              <Link
                href="/checkout/puppap-all-in-one"
                onClick={() =>
                  trackFunnelEvent('all_in_one_cta_click', {
                    source: 'floating_bar',
                    currentToolSlug: inferredToolSlug,
                    itemCount: pricing.itemCount,
                    upgradeDiffAmount: pricing.upgradeDiffAmount,
                    utm_content: 'all_in_one_floating_bar',
                  })
                }
                data-testid="promo-bar-buy-link"
                className="puppap-gold-cta-animated px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap"
              >
                เหมา ฿{pricing.packagePriceFormatted} →
              </Link>

              <button
                type="button"
                onClick={handleDismissBarToPill}
                aria-label="ย่อแถบโปรโมชัน"
                data-testid="promo-bar-dismiss-btn"
                className="min-w-[44px] min-h-[44px] -mr-1 flex items-center justify-center rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 3: Conditional Modal (2 Tabs: 👑 แพ็กเหมาๆ 999 & 🎓 คอร์สเรียน ฿159 แถม 2 Tools) */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-modal-title"
          data-testid="promo-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[var(--bg-primary)] border-2 border-amber-400 shadow-2xl p-3.5 sm:p-5 space-y-3.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
          >
            {/* Modal Top Header + Accessible Focus Target Heading + 44x44 Close Button */}
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-light)] pb-2.5">
              <h2
                ref={headingRef}
                id="promo-modal-title"
                tabIndex={-1}
                className="text-base sm:text-lg font-black text-[var(--text-primary)] outline-none flex items-center gap-1.5"
              >
                <span>🔥</span>
                <span>โปรโมชันพิเศษ PUP PAP AI</span>
              </h2>

              <button
                type="button"
                onClick={closeModal}
                aria-label="ปิดหน้าต่างโปรโมชัน"
                data-testid="promo-modal-close-btn"
                className="min-w-[44px] min-h-[44px] rounded-full bg-[var(--bg-deep)] hover:bg-rose-500/15 text-[var(--text-primary)] font-black flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 2-Tab Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border-light)]">
              <button
                type="button"
                onClick={() => handleSwitchTab('all_in_one_999')}
                data-testid="promo-tab-all-in-one"
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  activeTab === 'all_in_one_999'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                👑 แพ็กเหมาๆ ฿{pricing.packagePriceFormatted} (ครบ {pricing.itemCount} ตัว)
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('course_159')}
                data-testid="promo-tab-course-159"
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  activeTab === 'course_159'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                🎓 คอร์สเรียน ฿{pricing.coursePriceFormatted} (แถม 2 Tools)
              </button>
            </div>

            {/* Tab 1 Content: Visual Layer All-in-One 999 Showcase */}
            {activeTab === 'all_in_one_999' ? (
              <AllInOneUpsellBanner
                variant="modal"
                tools={tools}
                currentToolSlug={inferredToolSlug}
                source="floating_modal"
              />
            ) : (
              /* Tab 2 Content: Course ฿159 Poster + Free 2 AI Tools (Dynamic Bonus Value) */
              <div
                className="rounded-3xl bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-white border-2 border-rose-500/80 p-4 sm:p-5 space-y-4 text-center"
                data-testid="promo-course-159-panel"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-xs font-black text-white">
                  <span>🎁 โปรเริ่มต้นสุดคุ้ม · แถมฟรี 2 โปรแกรม AI มูลค่ารวม ฿{pricing.courseBonusToolsFormatted}!</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center text-left">
                  {/* Left: Course 159 Square Poster */}
                  <div className="sm:col-span-5 max-w-[240px] sm:max-w-none mx-auto w-full">
                    <div className="aspect-square rounded-2xl overflow-hidden border-2 border-amber-400/70 shadow-xl bg-stone-950">
                      <img
                        src="/images/poster-course-tiktok-ai.jpg"
                        alt="คอร์สนายหน้า TikTok ด้วย AI ปักตะกร้า (22 บทเรียน)"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Right: Price + Dynamic 2 Bonus Tools Visual Cards */}
                  <div className="sm:col-span-7 space-y-3">
                    <div className="text-center sm:text-left">
                      <h3 className="text-base sm:text-lg font-black text-amber-300 leading-snug">
                        คอร์สนายหน้า TikTok ด้วย AI ปักตะกร้า (22 บทเรียน)
                      </h3>
                      <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                          ฿{pricing.coursePriceFormatted}
                        </span>
                        <span className="text-xs sm:text-sm text-stone-400 line-through font-bold">
                          จากปกติ ฿799
                        </span>
                        <span className="text-[11px] font-bold text-amber-200">
                          • เรียนซ้ำได้ตลอดชีพ
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {bonusTools.map((bt, idx) => (
                        <div
                          key={bt.slug}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-stone-900/90 border border-amber-400/35"
                        >
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-950 border border-white/15 shrink-0 flex items-center justify-center">
                            {bt.posterUrl ? (
                              <img
                                src={bt.posterUrl}
                                alt={bt.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xl">{bt.icon}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-black text-emerald-400">
                              🎁 แถมฟรีตัวที่ #{idx + 1} (มูลค่า {bt.priceLabel})
                            </div>
                            <div className="text-xs sm:text-sm font-black text-white truncate">
                              {bt.name}
                            </div>
                            <div className="text-[11px] text-stone-300 truncate">
                              {bt.shortTitle}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  href="/checkout/tiktok-ai-affiliate"
                  onClick={closeModal}
                  data-testid="promo-course-159-cta"
                  className="puppap-btn-primary w-full py-3.5 px-6 rounded-2xl text-sm sm:text-base font-black inline-flex items-center justify-center gap-2"
                >
                  <span>🎓 สมัครคอร์ส 22 บท + รับฟรี 2 โปรแกรม AI เพียง ฿{pricing.coursePriceFormatted}</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
