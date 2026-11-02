'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPill, setShowPill] = useState(false);
  const isNavigatingRef = useRef(false);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const resetLoadingAttributes = () => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('a[data-nav-loading="true"]').forEach((el) => {
      el.removeAttribute('data-nav-loading');
    });
  };

  const finishNavigation = () => {
    clearAllTimers();
    resetLoadingAttributes();
    if (!isNavigatingRef.current) return;
    isNavigatingRef.current = false;
    setProgress(100);
    setShowPill(false);
    const doneTimer = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 220);
    timersRef.current.push(doneTimer);
  };

  // Complete navigation whenever route or query string changes
  useEffect(() => {
    finishNavigation();
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;

      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      // Only handle internal same-origin navigation
      if (url.origin !== window.location.origin) return;

      // Ignore if clicking link to exact current page + query
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      // Prevent rapid double-clicking on links while already navigating
      if (anchor.getAttribute('data-nav-loading') === 'true') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Mark clicked link immediately for visual feedback & anti-double-click
      resetLoadingAttributes();
      anchor.setAttribute('data-nav-loading', 'true');

      clearAllTimers();
      isNavigatingRef.current = true;
      setIsNavigating(true);
      setProgress(22);

      // Show friendly top pill immediately so user knows their tap registered
      const pillTimer = setTimeout(() => {
        if (isNavigatingRef.current) setShowPill(true);
      }, 60);

      const step1 = setTimeout(() => {
        if (isNavigatingRef.current) setProgress(55);
      }, 180);

      const step2 = setTimeout(() => {
        if (isNavigatingRef.current) setProgress(78);
      }, 500);

      const step3 = setTimeout(() => {
        if (isNavigatingRef.current) setProgress(90);
      }, 1200);

      // Safety fallback in case navigation is aborted
      const safetyTimer = setTimeout(() => {
        finishNavigation();
      }, 8000);

      timersRef.current.push(pillTimer, step1, step2, step3, safetyTimer);
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      clearAllTimers();
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <>
      {/* Top Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-[99999] h-1 pointer-events-none overflow-hidden bg-transparent"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)] transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Instant Floating Feedback Pill (Prevents users from thinking nothing happened) */}
      {showPill && (
        <div className="fixed top-3.5 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none animate-fade-in">
          <div className="px-4 py-2 rounded-full bg-[var(--bg-card)]/95 text-[var(--text-primary)] border-2 border-[var(--accent)] shadow-xl backdrop-blur-md flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <span className="w-4 h-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin shrink-0" />
            <span>กำลังเปิดหน้า... กรุณารอสักครู่</span>
          </div>
        </div>
      )}
    </>
  );
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
