'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CoursePosterLightboxProps {
  src?: string;
  alt?: string;
  enrollHref?: string;
  hideEnrollCta?: boolean;
  compact?: boolean;
  className?: string;
}

export default function CoursePosterLightbox({
  src = '/images/poster-course-tiktok-ai.jpg',
  alt = 'โปสเตอร์คอร์สเรียน นายหน้า TikTok ด้วย AI ปักตะกร้า ครบ 22 บทเรียน',
  enrollHref = '/checkout/tiktok-ai-affiliate',
  hideEnrollCta = false,
  compact = false,
  className = '',
}: CoursePosterLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`group relative overflow-hidden rounded-xl border-2 border-[var(--accent)]/60 bg-black/5 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] text-left cursor-pointer ${className}`}
          title="แตะเพื่อขยายดูโปสเตอร์คอร์สเรียนเต็มจอ"
        >
          <img
            src={src}
            alt={alt}
            loading="eager"
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
            <span>🔍</span>
            <span>ขยาย</span>
          </span>
        </button>
      ) : (
        <div className={`relative group ${className}`}>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full relative block overflow-hidden rounded-2xl border-2 border-[var(--border)] shadow-xl bg-[var(--bg-deep)] transition-all duration-300 hover:border-[var(--accent)] hover:shadow-2xl cursor-pointer text-left"
            aria-label="แตะเพื่อซูมดูโปสเตอร์คอร์สเรียนและสารบัญ 22 บทเรียนเต็มจอ"
          >
            <img
              src={src}
              alt={alt}
              loading="eager"
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.015]"
            />

            {/* Top-left floating authenticity pill */}
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] sm:text-xs font-extrabold border border-white/20 shadow-md flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ครบ 5 โมดูล · 22 บทเรียน</span>
            </div>

            {/* Bottom-right click-to-zoom prompt */}
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-white/25 shadow-lg flex items-center gap-1.5 transition-transform group-hover:scale-105">
              <span>🔍</span>
              <span>แตะเพื่อซูมดู 22 บทเรียน</span>
            </div>
          </button>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 overflow-y-auto animate-fade-in"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="โปสเตอร์คอร์สเรียนขนาดเต็มจอ"
        >
          {/* Top close bar */}
          <div
            className="w-full max-w-3xl flex items-center justify-between py-2 px-3 rounded-xl bg-white/10 border border-white/15 text-white mb-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs sm:text-sm font-bold flex items-center gap-2 truncate">
              <span>🎓</span>
              <span className="truncate">คอร์สเรียน นายหน้า TikTok ด้วย AI ปักตะกร้า (22 บทเรียน)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-black transition-colors shrink-0 cursor-pointer"
            >
              ✕ ปิดหน้าต่าง
            </button>
          </div>

          {/* Poster full view */}
          <div
            className="w-full max-w-2xl my-auto overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="w-full h-auto object-contain max-h-[75vh] sm:max-h-[78vh] mx-auto"
            />
          </div>

          {/* Sticky bottom conversion bar inside Lightbox */}
          {!hideEnrollCta && (
            <div
              className="w-full max-w-2xl mt-3 p-3 sm:p-4 rounded-2xl bg-[#18181E] border-2 border-rose-500/60 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-white">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 line-through">ปกติ ฿990</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black puppap-badge-flash">
                      🔥 ลด 70% วันนี้
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 leading-none mt-0.5">
                    ฿299 <span className="text-xs font-bold text-zinc-300">บาท · เรียนได้ตลอดชีพ</span>
                  </div>
                </div>
              </div>

              <Link
                href={enrollHref}
                onClick={() => setIsOpen(false)}
                className="puppap-btn-primary puppap-cta-animated w-full sm:w-auto px-7 py-3.5 text-base sm:text-lg font-black flex items-center justify-center gap-2 shadow-xl"
              >
                <span>🛒 สมัครเรียนทันที ฿299</span>
                <span className="puppap-arrow-nudge">→</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
