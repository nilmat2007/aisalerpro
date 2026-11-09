'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import CoursePosterLightbox from '@/components/CoursePosterLightbox';
import {
  getHeroVideoAbVariant,
  trackFunnelEvent,
} from '@/lib/meta-pixel';

declare global {
  interface Window {
    __puppapActiveVideoId?: string | null;
  }
}

interface CourseHeroVideoProps {
  pageContext?: 'home' | 'dashboard' | 'courses';
  posterSrc?: string;
  enrollHref?: string;
  hideEnrollCta?: boolean;
  className?: string;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

export default function CourseHeroVideo({
  pageContext = 'courses',
  posterSrc = '/images/poster-course-tiktok-ai.jpg',
  enrollHref = '/checkout/tiktok-ai-affiliate',
  hideEnrollCta = false,
  className = '',
}: CourseHeroVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isReducedMotionOrData, setIsReducedMotionOrData] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(22.4);
  const [activeCueText, setActiveCueText] = useState('');
  const [abVariant, setAbVariant] = useState<'video_A' | 'video_B'>('video_A');

  const hasAutoPlayedRef = useRef(false);
  const lastTimeRef = useRef(0);
  const watchedSecondsRef = useRef(0);
  const firedQuartilesRef = useRef<Set<number>>(new Set());

  const announceActiveMedia = useCallback((action: 'play' | 'unmute' | 'pause' | 'ended') => {
    if (typeof window === 'undefined') return;
    if (action === 'play' || action === 'unmute') {
      window.__puppapActiveVideoId = 'hero-intro';
      window.dispatchEvent(
        new CustomEvent('puppap-media-active', {
          detail: { playerId: 'hero-intro', action },
        })
      );
    } else if (window.__puppapActiveVideoId === 'hero-intro') {
      window.__puppapActiveVideoId = null;
    }
  }, []);

  // 1. Initialize persistent Hero A/B Variant (`puppap_hero_ab`) & check prefers-reduced-motion / saveData
  useEffect(() => {
    setAbVariant(getHeroVideoAbVariant());
    if (typeof window === 'undefined') return;

    const saveData = Boolean((navigator as any)?.connection?.saveData);
    const mqMotion =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const mqData =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-data: reduce)')
        : null;

    const updatePref = () => {
      setIsReducedMotionOrData(
        Boolean(saveData || mqMotion?.matches || mqData?.matches)
      );
    };
    updatePref();

    mqMotion?.addEventListener?.('change', updatePref);
    mqData?.addEventListener?.('change', updatePref);
    return () => {
      mqMotion?.removeEventListener?.('change', updatePref);
      mqData?.removeEventListener?.('change', updatePref);
    };
  }, []);

  // 2. Mutual Exclusion Listener: Pause immediately if `lesson-21-preview` starts playing/unmuting
  useEffect(() => {
    const handleOtherMediaActive = (e: Event) => {
      const custom = e as CustomEvent<{ playerId?: string; action?: string }>;
      if (custom.detail?.playerId && custom.detail.playerId !== 'hero-intro') {
        const video = videoRef.current;
        if (video && !video.paused) {
          video.pause();
          setIsPlaying(false);
        }
      }
    };
    window.addEventListener('puppap-media-active', handleOtherMediaActive);
    return () => {
      window.removeEventListener('puppap-media-active', handleOtherMediaActive);
    };
  }, []);

  // 3. Single Source of Truth for Captions (`/videos/course-hero-intro.th.vtt`)
  const syncCaptionTrackMode = useCallback((mutedState: boolean) => {
    const video = videoRef.current;
    if (!video || !video.textTracks || video.textTracks.length === 0) return;
    const track = video.textTracks[0];
    if (!track) return;

    track.mode = mutedState ? 'hidden' : 'showing';
    if (mutedState) {
      const cue =
        track.activeCues && track.activeCues.length > 0
          ? (track.activeCues[0] as VTTCue)
          : null;
      setActiveCueText(cue?.text || '');
    } else {
      setActiveCueText('');
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks || video.textTracks.length === 0) return;
    const track = video.textTracks[0];
    if (!track) return;

    syncCaptionTrackMode(isMuted);

    const handleCueChange = () => {
      if (!videoRef.current?.muted) {
        setActiveCueText('');
        return;
      }
      const active =
        track.activeCues && track.activeCues.length > 0
          ? (track.activeCues[0] as VTTCue)
          : null;
      setActiveCueText(active?.text || '');
    };

    track.addEventListener('cuechange', handleCueChange);
    return () => {
      track.removeEventListener('cuechange', handleCueChange);
    };
  }, [isMuted, syncCaptionTrackMode]);

  // 4. IntersectionObserver: Try-Unmuted-First Autoplay at >= 0.5, fallback to Muted Autoplay if blocked, pause when scrolled out (< 0.25)
  useEffect(() => {
    if (isReducedMotionOrData || hasVideoError) return;
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!hasAutoPlayedRef.current && video.paused && !isEnded) {
            hasAutoPlayedRef.current = true;
            // Tier 1: Try Unmuted Autoplay First (`muted = false`)
            video.muted = false;
            setIsMuted(false);
            syncCaptionTrackMode(false);
            announceActiveMedia('play');
            const p = video.play();
            if (p && typeof p.then === 'function') {
              p.then(() => {
                setIsPlaying(true);
                setIsAutoplayBlocked(false);
                trackFunnelEvent('hero_video_play', {
                  page: pageContext,
                  mode: 'autoplay_unmuted',
                  variant: getHeroVideoAbVariant(),
                });
              }).catch(() => {
                // Tier 2: Browser blocked cold unmuted autoplay -> Fallback immediately to Muted Autoplay
                video.muted = true;
                setIsMuted(true);
                syncCaptionTrackMode(true);
                video
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                    setIsAutoplayBlocked(false);
                    trackFunnelEvent('hero_video_play', {
                      page: pageContext,
                      mode: 'autoplay_muted_fallback',
                      variant: getHeroVideoAbVariant(),
                    });
                  })
                  .catch(() => {
                    // Tier 3: iOS Low Power Mode / strict block -> Show Poster + Play w/ Sound Button
                    announceActiveMedia('pause');
                    setIsAutoplayBlocked(true);
                    setIsPlaying(false);
                  });
              });
            }
          }
        } else if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
          if (!video.paused) {
            video.pause();
            setIsPlaying(false);
            announceActiveMedia('pause');
          }
        }
      },
      { threshold: [0, 0.25, 0.5] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [
    isReducedMotionOrData,
    hasVideoError,
    isEnded,
    pageContext,
    syncCaptionTrackMode,
    announceActiveMedia,
  ]);

  const handleUnmuteAndPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    setHasVideoError(false);
    setIsEnded(false);
    if (video.currentTime < 8 || video.ended) {
      video.currentTime = 0;
      lastTimeRef.current = 0;
    }
    video.muted = false;
    setIsMuted(false);
    syncCaptionTrackMode(false);
    announceActiveMedia('unmute');
    video
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsAutoplayBlocked(false);
      })
      .catch(() => {});
    trackFunnelEvent('hero_video_unmute', {
      page: pageContext,
      at_second: Math.round(video.currentTime),
      variant: abVariant,
    });
  };

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    setHasVideoError(false);
    if (video.paused || isEnded) {
      if (isEnded) {
        video.currentTime = 0;
        lastTimeRef.current = 0;
        setIsEnded(false);
      }
      if (isAutoplayBlocked || isReducedMotionOrData || !hasAutoPlayedRef.current) {
        video.muted = false;
        setIsMuted(false);
        syncCaptionTrackMode(false);
      }
      hasAutoPlayedRef.current = true;
      announceActiveMedia('play');
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsAutoplayBlocked(false);
          trackFunnelEvent('hero_video_play', {
            page: pageContext,
            mode: 'manual',
            variant: abVariant,
          });
        })
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          syncCaptionTrackMode(true);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
    } else {
      video.pause();
      setIsPlaying(false);
      announceActiveMedia('pause');
    }
  };

  const handleVideoSurfaceClick = () => {
    if (isPlaying && isMuted && !isEnded) {
      // If playing muted (fallback mode), tapping anywhere on the video surface immediately unmutes!
      handleUnmuteAndPlay();
      return;
    }
    handleTogglePlay();
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    syncCaptionTrackMode(nextMuted);
    if (!nextMuted) {
      announceActiveMedia('unmute');
      trackFunnelEvent('hero_video_unmute', {
        page: pageContext,
        at_second: Math.round(video.currentTime),
        variant: abVariant,
      });
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    const dur = video.duration && Number.isFinite(video.duration) ? video.duration : 22.4;

    const delta = cur - lastTimeRef.current;
    if (!video.seeking && delta > 0 && delta < 1.0) {
      watchedSecondsRef.current += delta;
    }
    lastTimeRef.current = cur;
    setCurrentTime(cur);

    if (video.muted && video.textTracks && video.textTracks[0]) {
      const track = video.textTracks[0];
      if (track.mode !== 'hidden') track.mode = 'hidden';
      const active =
        track.activeCues && track.activeCues.length > 0
          ? (track.activeCues[0] as VTTCue)
          : null;
      if ((active?.text || '') !== activeCueText) {
        setActiveCueText(active?.text || '');
      }
    }

    const watchedRatio = watchedSecondsRef.current / dur;
    if (watchedRatio >= 0.25 && !firedQuartilesRef.current.has(25)) {
      firedQuartilesRef.current.add(25);
      trackFunnelEvent('hero_video_25', { page: pageContext, variant: abVariant });
    }
    if (watchedRatio >= 0.5 && !firedQuartilesRef.current.has(50)) {
      firedQuartilesRef.current.add(50);
      trackFunnelEvent('hero_video_50', { page: pageContext, variant: abVariant });
    }
    if (watchedRatio >= 0.75 && !firedQuartilesRef.current.has(75)) {
      firedQuartilesRef.current.add(75);
      trackFunnelEvent('hero_video_75', { page: pageContext, variant: abVariant });
    }
  };

  const handleVideoEnded = () => {
    const video = videoRef.current;
    setIsPlaying(false);
    setIsEnded(true);
    announceActiveMedia('ended');
    const dur = video?.duration && Number.isFinite(video.duration) ? video.duration : 22.4;
    if (
      !video?.seeking &&
      watchedSecondsRef.current >= dur * 0.75 &&
      !firedQuartilesRef.current.has(100)
    ) {
      firedQuartilesRef.current.add(100);
      trackFunnelEvent('hero_video_complete', {
        page: pageContext,
        variant: abVariant,
      });
    }
  };

  // Full WAI-ARIA Slider Keyboard Handler (`ArrowLeft`, `ArrowRight`, `PageUp`, `PageDown`, `Home`, `End`)
  const handleSeekSliderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    let nextTime: number | null = null;
    if (e.key === 'ArrowRight') {
      nextTime = Math.min(duration, video.currentTime + 2);
    } else if (e.key === 'ArrowLeft') {
      nextTime = Math.max(0, video.currentTime - 2);
    } else if (e.key === 'PageUp') {
      nextTime = Math.min(duration, video.currentTime + 5);
    } else if (e.key === 'PageDown') {
      nextTime = Math.max(0, video.currentTime - 5);
    } else if (e.key === 'Home') {
      nextTime = 0;
    } else if (e.key === 'End') {
      nextTime = duration;
    }
    if (nextTime !== null) {
      e.preventDefault();
      video.currentTime = nextTime;
      lastTimeRef.current = nextTime;
      setCurrentTime(nextTime);
      if (isEnded && nextTime < duration) setIsEnded(false);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextTime = ratio * duration;
    video.currentTime = nextTime;
    lastTimeRef.current = nextTime;
    setCurrentTime(nextTime);
    if (isEnded) setIsEnded(false);
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const endOverlayCtaCopy =
    abVariant === 'video_A'
      ? '🛒 สมัครเรียนโปรพิเศษ ฿159 (จาก ฿799) →'
      : '📱 เริ่มทำตามบนมือถือ ฿159 →';

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-[200px] sm:max-w-[280px] lg:max-w-[340px] mx-auto space-y-2 ${className}`}
    >
      {/* 9:16 Vertical Video Frame (`max-h-[50vh]` on mobile so iPhone SE keeps >= 260px below; `lg:max-h-[80vh]` on desktop) */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full max-h-[50vh] sm:max-h-none lg:max-h-[80vh] aspect-[9/16] mx-auto rounded-2xl overflow-hidden border-2 border-[var(--border-accent)] shadow-xl bg-[#0F0F12] select-none"
      >
        <video
          ref={videoRef}
          src="/videos/course-hero-intro.mp4"
          poster="/images/course-hero-intro-poster.webp"
          width={720}
          height={1280}
          playsInline
          loop={false}
          muted={isMuted}
          preload={isReducedMotionOrData ? 'none' : 'metadata'}
          controls={false}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (d && Number.isFinite(d)) setDuration(d);
            syncCaptionTrackMode(isMuted);
          }}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => {
            setIsPlaying(true);
            announceActiveMedia('play');
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnded}
          onError={() => {
            setHasVideoError(true);
            setIsPlaying(false);
          }}
          onClick={handleVideoSurfaceClick}
          className="w-full h-full object-cover cursor-pointer"
        >
          <track
            ref={trackRef}
            kind="captions"
            src="/videos/course-hero-intro.th.vtt"
            srcLang="th"
            label="ภาษาไทย"
          />
        </video>

        {/* Top-Left Prominent Unmute Pill during Muted Autoplay */}
        {isPlaying && isMuted && !isEnded && !hasVideoError && (
          <button
            type="button"
            onClick={handleUnmuteAndPlay}
            aria-label="เปิดเสียงฟังคำแนะนำคอร์ส 22 วินาที"
            className="absolute top-2.5 left-2.5 right-2.5 z-20 px-2.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] sm:text-xs font-black border-2 border-white shadow-xl flex items-center justify-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95 puppap-badge-flash"
          >
            <span>🔊</span>
            <span className="truncate">แตะเพื่อเปิดเสียง (22 วิ)</span>
          </button>
        )}

        {/* High-Contrast Custom Muted Caption Bar (`isMuted === true`; reads from VTT activeCues) */}
        {isMuted && isPlaying && !isEnded && !hasVideoError && activeCueText && (
          <div
            role="region"
            aria-live="polite"
            aria-atomic="true"
            aria-label="คำบรรยายวิดีโอแนะนำคอร์สขณะปิดเสียง"
            className="absolute bottom-9 inset-x-2 z-20 pointer-events-none flex justify-center"
          >
            <div className="bg-black/85 text-white text-[12px] sm:text-sm font-bold px-2.5 py-1.5 rounded-xl border border-amber-400/50 shadow-lg text-center leading-snug">
              {activeCueText}
            </div>
          </div>
        )}

        {/* Paused / Reduced-Motion / iOS Low Power Mode Fallback Overlay */}
        {!isPlaying && !isEnded && !hasVideoError && (
          <div
            onClick={handleTogglePlay}
            className="absolute inset-0 z-20 bg-black/35 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center cursor-pointer group"
          >
            <button
              type="button"
              aria-label="เล่นวิดีโอแนะนำคอร์สพร้อมเสียงจริง (22 วินาที)"
              className="puppap-btn-primary puppap-cta-animated px-4 py-3 rounded-2xl text-xs sm:text-sm font-black shadow-2xl flex items-center gap-2 group-hover:scale-105 transition-transform cursor-pointer"
            >
              <span className="text-base sm:text-lg">▶</span>
              <span>แตะเพื่อเล่นวิดีโอแนะนำคอร์ส (22 วิ)</span>
            </button>
          </div>
        )}

        {/* Network / Video Load Error Fallback (`onError`) */}
        {hasVideoError && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center space-y-2.5 text-white">
            <img
              src={posterSrc}
              alt="โปสเตอร์คอร์สเรียน"
              className="w-24 h-32 object-cover rounded-lg border border-white/20 mx-auto"
            />
            <p className="text-xs font-bold text-amber-300">
              ⚠️ โหลดวิดีโอไม่สำเร็จชั่วคราว
            </p>
            <button
              type="button"
              onClick={() => {
                setHasVideoError(false);
                videoRef.current?.load();
                handleTogglePlay();
              }}
              className="puppap-btn-primary px-3 py-1.5 text-xs font-black rounded-xl cursor-pointer"
            >
              🔄 ลองโหลดอีกครั้ง
            </button>
          </div>
        )}

        {/* End-of-Video Conversion & Replay Overlay (`loop={false}`) */}
        {isEnded && !hasVideoError && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3.5 text-center text-white space-y-2.5 animate-fade-in">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] sm:text-xs font-black">
              ✨ มือใหม่ทำตามได้บนมือถือเครื่องเดียว
            </span>
            <p className="text-xs sm:text-sm font-extrabold leading-snug">
              เริ่มต้นสร้างรายได้ด้วย AI ปักตะกร้า ครบ 22 บทเรียนตลอดชีพ
            </p>

            {!hideEnrollCta && (
              <Link
                href={enrollHref}
                onClick={() =>
                  trackFunnelEvent('purchase_from_preview', {
                    page: pageContext,
                    source: 'hero_video_end_overlay',
                    variant: abVariant,
                    utm_content: `hero_${abVariant}`,
                  })
                }
                className="puppap-btn-primary puppap-cta-animated w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-xl"
              >
                <span>{endOverlayCtaCopy}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleUnmuteAndPlay}
              className="w-full py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isMuted ? '🔊 แตะฟังพร้อมเสียงจริง (22 วิ)' : '🔄 ดูคำแนะนำซ้ำอีกครั้ง'}</span>
            </button>
          </div>
        )}

        {/* Bottom Control Bar (Play/Pause + WAI-ARIA Slider + Time + Mute Toggle) */}
        {!isEnded && !hasVideoError && (
          <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2.5 pt-4 pb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'หยุดวิดีโอชั่วคราว' : 'เล่นวิดีโอแนะนำคอร์ส'}
              className="w-7 h-7 rounded bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center justify-center cursor-pointer shrink-0"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <div
              role="slider"
              tabIndex={0}
              aria-label="แถบเวลาวิดีโอแนะนำคอร์ส"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={`${Math.round(currentTime)} วินาที จาก ${Math.round(duration)} วินาที`}
              onKeyDown={handleSeekSliderKeyDown}
              onClick={handleProgressBarClick}
              className="flex-1 h-1.5 bg-white/25 rounded-full overflow-hidden cursor-pointer relative"
            >
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <span className="text-[10px] font-mono text-white/90 shrink-0">
              {formatTime(currentTime)}/{formatTime(duration)}
            </span>

            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'เปิดเสียงวิดีโอ' : 'ปิดเสียงวิดีโอ'}
              className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold cursor-pointer shrink-0"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        )}
      </div>

      {/* Secondary Trigger Button: Open Full 22-Lesson Infographic Poster Lightbox */}
      <CoursePosterLightbox
        src={posterSrc}
        enrollHref={enrollHref}
        hideEnrollCta={hideEnrollCta}
        trigger="button"
        onOpenLightbox={() =>
          trackFunnelEvent('hero_poster_zoom_click', {
            page: pageContext,
            variant: abVariant,
          })
        }
      />
    </div>
  );
}
