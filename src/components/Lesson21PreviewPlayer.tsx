'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  getPreviewAbVariant,
  trackPreviewEvent,
} from '@/lib/meta-pixel';

interface Lesson21PreviewPlayerProps {
  hasAccess?: boolean;
  courseSlug?: string;
  priceFormatted?: string;
  promptCount?: number;
  curriculumHref?: string;
  onScrollToCurriculum?: () => void;
  externalPlayTrigger?: number;
  compact?: boolean;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

export default function Lesson21PreviewPlayer({
  hasAccess = false,
  courseSlug = 'tiktok-ai-affiliate',
  priceFormatted = '299',
  promptCount = 5,
  curriculumHref = '/courses#curriculum',
  onScrollToCurriculum,
  externalPlayTrigger = 0,
  compact = false,
}: Lesson21PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(63);
  const [activeCueText, setActiveCueText] = useState('');
  const [abVariant, setAbVariant] = useState<'A' | 'B'>('A');

  const hasAutoPlayedRef = useRef(false);
  const lastTimeRef = useRef(0);
  const watchedSecondsRef = useRef(0);
  const firedQuartilesRef = useRef<Set<number>>(new Set());

  // 1. Initialize persistent A/B Variant & check prefers-reduced-motion
  useEffect(() => {
    setAbVariant(getPreviewAbVariant());
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mq.addEventListener?.('change', onChange);
      return () => mq.removeEventListener?.('change', onChange);
    }
  }, []);

  // 2. Single Source of Truth for Captions (`textTrack.cues` from `/videos/lesson-21-preview.th.vtt`)
  //    - When `isMuted === true`: set `track.mode = 'hidden'` (suppresses browser native caption box,
  //      while keeping `activeCues` live for our High-Contrast Muted Caption Bar -> zero double captions!)
  //    - When `isMuted === false`: set `track.mode = 'showing'` and hide Custom Muted Caption Bar.
  const syncCaptionTrackMode = useCallback((mutedState: boolean) => {
    const video = videoRef.current;
    if (!video || !video.textTracks || video.textTracks.length === 0) return;
    const track = video.textTracks[0];
    if (!track) return;

    track.mode = mutedState ? 'hidden' : 'showing';
    if (mutedState) {
      const cue = track.activeCues && track.activeCues.length > 0
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
      const active = track.activeCues && track.activeCues.length > 0
        ? (track.activeCues[0] as VTTCue)
        : null;
      setActiveCueText(active?.text || '');
    };

    track.addEventListener('cuechange', handleCueChange);
    return () => {
      track.removeEventListener('cuechange', handleCueChange);
    };
  }, [isMuted, syncCaptionTrackMode]);

  // 3. IntersectionObserver (threshold: 0.5) for Muted Autoplay when scrolled into view
  useEffect(() => {
    if (isReducedMotion || hasVideoError) return;
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!hasAutoPlayedRef.current && video.paused && !isEnded) {
            hasAutoPlayedRef.current = true;
            video.muted = true;
            setIsMuted(true);
            syncCaptionTrackMode(true);
            const p = video.play();
            if (p && typeof p.then === 'function') {
              p.then(() => {
                setIsPlaying(true);
                setIsAutoplayBlocked(false);
                trackPreviewEvent('preview_play', {
                  mode: 'autoplay_muted',
                  variant: getPreviewAbVariant(),
                });
              }).catch(() => {
                // iOS Safari Low Power Mode or strict autoplay block -> show Poster + Center Play Button
                setIsAutoplayBlocked(true);
                setIsPlaying(false);
              });
            }
          }
        } else if (!entry.isIntersecting && !video.paused && video.muted) {
          // Pause muted background playback when scrolled out of view to save mobile battery
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: [0, 0.5] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isReducedMotion, hasVideoError, isEnded, syncCaptionTrackMode]);

  // 4. External trigger (when user clicks "ดูตัวอย่างบทที่ 21" button in Hero or Curriculum row)
  useEffect(() => {
    if (!externalPlayTrigger) return;
    const video = videoRef.current;
    if (!video) return;
    setHasVideoError(false);
    setIsEnded(false);
    video.currentTime = 0;
    lastTimeRef.current = 0;
    video.muted = false;
    setIsMuted(false);
    syncCaptionTrackMode(false);
    video
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsAutoplayBlocked(false);
        trackPreviewEvent('preview_play', {
          mode: 'external_trigger_unmuted',
          variant: abVariant,
        });
        trackPreviewEvent('preview_unmute', {
          source: 'external_trigger',
          variant: abVariant,
        });
      })
      .catch(() => {
        setIsAutoplayBlocked(true);
      });
  }, [externalPlayTrigger, abVariant, syncCaptionTrackMode]);

  const handleUnmuteAndRestart = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsEnded(false);
    // If still in the first 18 seconds of muted hook, restart from 0:00 so they hear the full intro
    if (video.currentTime < 18) {
      video.currentTime = 0;
      lastTimeRef.current = 0;
    }
    video.muted = false;
    setIsMuted(false);
    syncCaptionTrackMode(false);
    video
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsAutoplayBlocked(false);
      })
      .catch(() => {});
    trackPreviewEvent('preview_unmute', {
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
      // If user manually taps the big Play button from fallback state, play with sound!
      if (isAutoplayBlocked || isReducedMotion || !hasAutoPlayedRef.current) {
        video.muted = false;
        setIsMuted(false);
        syncCaptionTrackMode(false);
      }
      hasAutoPlayedRef.current = true;
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsAutoplayBlocked(false);
          trackPreviewEvent('preview_play', {
            mode: 'manual',
            variant: abVariant,
          });
        })
        .catch(() => {
          // Retry muted if unmuted play was rejected
          video.muted = true;
          setIsMuted(true);
          syncCaptionTrackMode(true);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    syncCaptionTrackMode(nextMuted);
    if (!nextMuted) {
      trackPreviewEvent('preview_unmute', {
        at_second: Math.round(video.currentTime),
        variant: abVariant,
      });
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    const dur = video.duration && Number.isFinite(video.duration) ? video.duration : 63.18;

    // Anti-scrub guard: only accumulate genuine playback deltas (< 1.0s)
    const delta = cur - lastTimeRef.current;
    if (!video.seeking && delta > 0 && delta < 1.0) {
      watchedSecondsRef.current += delta;
    }
    lastTimeRef.current = cur;
    setCurrentTime(cur);

    // Sync active VTT cue when muted in case browser cuechange event is delayed
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

    // Quartile milestones based on genuine watched time
    const watchedRatio = watchedSecondsRef.current / dur;
    if (watchedRatio >= 0.25 && !firedQuartilesRef.current.has(25)) {
      firedQuartilesRef.current.add(25);
      trackPreviewEvent('preview_25', { variant: abVariant });
    }
    if (watchedRatio >= 0.5 && !firedQuartilesRef.current.has(50)) {
      firedQuartilesRef.current.add(50);
      trackPreviewEvent('preview_50', { variant: abVariant });
    }
    if (watchedRatio >= 0.75 && !firedQuartilesRef.current.has(75)) {
      firedQuartilesRef.current.add(75);
      trackPreviewEvent('preview_75', { variant: abVariant });
    }
  };

  const handleVideoEnded = () => {
    const video = videoRef.current;
    setIsPlaying(false);
    setIsEnded(true);
    const dur = video?.duration && Number.isFinite(video.duration) ? video.duration : 63.18;
    // Anti-scrub guard: only fire preview_100 if user genuinely watched >= 75% of the video
    if (!video?.seeking && watchedSecondsRef.current >= dur * 0.75 && !firedQuartilesRef.current.has(100)) {
      firedQuartilesRef.current.add(100);
      trackPreviewEvent('preview_100', { variant: abVariant });
    }
  };

  const handleSeekSliderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(duration, video.currentTime + 5);
      lastTimeRef.current = video.currentTime;
      setCurrentTime(video.currentTime);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
      lastTimeRef.current = video.currentTime;
      setCurrentTime(video.currentTime);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = ratio * duration;
    lastTimeRef.current = video.currentTime;
    setCurrentTime(video.currentTime);
    if (isEnded) setIsEnded(false);
  };

  const handleCurriculumClick = (e: React.MouseEvent) => {
    trackPreviewEvent('curriculum_click_from_preview', { variant: abVariant });
    if (onScrollToCurriculum) {
      e.preventDefault();
      onScrollToCurriculum();
    }
  };

  const isPast30s = currentTime >= 30 && !hasAccess;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const checkoutHref = `/checkout/${courseSlug}`;
  const fullLesson21Href = `/course/${courseSlug}?lesson=21`;

  // Single-Variable A/B Test ONLY on the End-of-Preview Cliffhanger Overlay CTA
  const overlayCtaCopy =
    abVariant === 'A'
      ? `🛒 สมัครเรียนเพื่อดูต่อจนจบ ฿${priceFormatted} (พร้อม ${promptCount} Prompt อนิเมะ 2D) →`
      : `🛒 สมัครเรียนราคาเปิดตัว ฿${priceFormatted} (แถมฟรี 2 เครื่องมือ AI มูลค่า ฿598) →`;

  return (
    <div
      ref={containerRef}
      id="preview-lesson-21"
      className={`puppap-card overflow-hidden border-2 border-[var(--border-accent)] bg-[var(--bg-card)] shadow-xl ${
        compact ? 'p-3.5 sm:p-5' : 'p-4 sm:p-6'
      } space-y-4`}
    >
      {/* 1. Header Framing Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black puppap-badge-flash">
              🎬 ตัวอย่างการสอนจริง • บทที่ 21 (ดูฟรี 1 นาทีแรก)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-bold">
              📋 แจกฟรี {promptCount} Prompt พร้อมตัวแปรในบทนี้
            </span>
          </div>
          <h3 className="text-base sm:text-xl font-black text-[var(--text-primary)] leading-snug">
            วิธีทำคลิปแอนิเมชั่น การ์ตูน 2D บนมือถือ{' '}
            <span className="text-xs sm:text-sm font-bold text-[var(--text-muted)]">
              (ตัวอย่าง 1 นาที จากบทเรียนเต็ม 06:06 นาที)
            </span>
          </h3>
        </div>

        <div className="text-[11px] text-[var(--text-muted)] font-medium shrink-0">
          *โควตาฟรีของ Google Flow ขึ้นอยู่กับเงื่อนไขบัญชี Google ณ ปัจจุบัน
        </div>
      </div>

      {/* 2. 16:9 Video Container (aspect-video + explicit 1280x720 poster = 0 CLS) */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#0F0F12] border-2 border-[var(--border)] shadow-lg select-none"
      >
        <video
          ref={videoRef}
          src="/videos/lesson-21-preview.mp4"
          poster="/images/lesson-21-preview-poster.webp"
          width={1280}
          height={720}
          playsInline
          muted={isMuted}
          preload="metadata"
          controls={false}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (d && Number.isFinite(d)) setDuration(d);
            syncCaptionTrackMode(isMuted);
          }}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnded}
          onError={() => {
            setHasVideoError(true);
            setIsPlaying(false);
          }}
          className="w-full h-full object-cover cursor-pointer"
          onClick={handleTogglePlay}
        >
          <track
            ref={trackRef}
            kind="captions"
            src="/videos/lesson-21-preview.th.vtt"
            srcLang="th"
            label="ภาษาไทย"
          />
        </video>

        {/* Top-Right Live Timer Pill */}
        {!isEnded && !hasVideoError && (
          <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-extrabold border border-white/20 flex items-center gap-1.5 pointer-events-none">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              ⏱️ ตัวอย่างฟรี {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Prominent One-Tap Unmute Pill during Muted Autoplay */}
        {isPlaying && isMuted && !isEnded && !hasVideoError && (
          <button
            type="button"
            onClick={handleUnmuteAndRestart}
            aria-label="เปิดเสียงคำบรรยายภาษาไทย"
            className="absolute top-3 left-3 z-20 px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-black border-2 border-white shadow-xl flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 puppap-badge-flash"
          >
            <span className="text-base">🔊</span>
            <span>แตะเพื่อเปิดเสียงฟังคำบรรยายจริง</span>
          </button>
        )}

        {/* High-Contrast Custom Muted Caption Bar (Rendered ONLY when isMuted === true; reads from VTT activeCues) */}
        {isMuted && isPlaying && !isEnded && !hasVideoError && activeCueText && (
          <div
            role="region"
            aria-live="polite"
            aria-atomic="true"
            aria-label="คำบรรยายวิดีโอขณะปิดเสียง"
            className="absolute bottom-11 inset-x-3 sm:inset-x-8 z-20 pointer-events-none flex justify-center"
          >
            <div className="px-3.5 py-2 rounded-xl bg-black/90 text-white text-xs sm:text-sm font-bold border border-amber-400/50 shadow-xl text-center max-w-2xl leading-relaxed">
              {activeCueText}
            </div>
          </div>
        )}

        {/* Fallback Play Overlay when Paused / Reduced-Motion / iOS Low Power Mode Autoplay Blocked */}
        {!isPlaying && !isEnded && !hasVideoError && (
          <div
            onClick={handleTogglePlay}
            className="absolute inset-0 z-20 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center cursor-pointer group"
          >
            <button
              type="button"
              aria-label="เล่นวิดีโอตัวอย่างบทที่ 21 พร้อมเสียงบรรยาย"
              className="puppap-btn-primary puppap-cta-animated px-6 py-4 rounded-2xl text-sm sm:text-lg font-black shadow-2xl flex items-center gap-3 group-hover:scale-105 transition-transform cursor-pointer"
            >
              <span className="text-xl sm:text-2xl">▶</span>
              <span>แตะเพื่อดูตัวอย่างบทที่ 21 (1 นาที • พร้อมเสียงจริง)</span>
            </button>
            <p className="mt-2.5 text-xs font-bold text-white/90 bg-black/70 px-3 py-1 rounded-full border border-white/15">
              🎓 ดูวิธีเปลี่ยนรูปถ่ายตัวเองเป็นการ์ตูนอนิเมะ 2D บนมือถือแบบจับมือทำ
            </p>
          </div>
        )}

        {/* Network / Video Load Error Fallback (`onError`) */}
        {hasVideoError && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center space-y-3 text-white">
            <p className="text-sm sm:text-base font-bold text-amber-300">
              ⚠️ โหลดวิดีโอตัวอย่างไม่สำเร็จเนื่องจากสัญญาณอินเทอร์เน็ตขัดข้อง
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setHasVideoError(false);
                  videoRef.current?.load();
                  handleTogglePlay();
                }}
                className="puppap-btn-primary px-4 py-2.5 text-xs sm:text-sm font-black cursor-pointer"
              >
                🔄 ลองโหลดวิดีโออีกครั้ง
              </button>
              <a
                href={curriculumHref}
                onClick={handleCurriculumClick}
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs sm:text-sm font-bold"
              >
                📑 เลื่อนดูสารบัญทั้ง 22 บทเรียน ↓
              </a>
            </div>
          </div>
        )}

        {/* End-of-Preview Cliffhanger Conversion Overlay (`isEnded`) */}
        {isEnded && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center text-white animate-fade-in">
            <div className="max-w-lg space-y-3">
              <span className="inline-block px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black">
                {hasAccess
                  ? '✅ จบตัวอย่าง 1 นาทีแรกของบทที่ 21'
                  : '🔒 จบตัวอย่างฟรี 1 นาทีแรกของบทที่ 21!'}
              </span>

              <h4 className="text-lg sm:text-2xl font-black leading-snug text-white">
                {hasAccess
                  ? 'คุณมีสิทธิ์เรียนบทที่ 21 แบบเต็ม (06:06 นาที) พร้อมคัดลอก 5 Prompt แล้ว!'
                  : 'อยากดูวิธีวางคำสั่งที่ 1–4 เปลี่ยนรูปถ่ายเป็นอนิเมะ 2D + สร้างแผ่น Storyboard 12 ช่องต่อจนจบไหม?'}
              </h4>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {hasAccess
                  ? 'กดปุ่มด้านล่างเพื่อเข้าสู่ห้องเรียนและคัดลอกคำสั่งสำเร็จรูปไปทำตามบนมือถือได้ทันที'
                  : 'ปลดล็อกดูต่อจนจบครบทั้ง 22 บทเรียนตลอดชีพ + รับฟรี 2 เครื่องมือ AI Flow Tools (มูลค่ารวม ฿598)'}
              </p>

              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
                {hasAccess ? (
                  <Link
                    href={fullLesson21Href}
                    className="puppap-btn-primary px-6 py-3.5 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-xl"
                  >
                    <span>▶ เข้าเรียนบทที่ 21 แบบเต็มทันที</span>
                    <span>→</span>
                  </Link>
                ) : (
                  <Link
                    href={checkoutHref}
                    onClick={() =>
                      trackPreviewEvent('overlay_cta_click', {
                        variant: abVariant,
                        utm_content: `preview_l21_overlay_${abVariant}`,
                      })
                    }
                    className="puppap-btn-primary puppap-cta-animated px-6 py-3.5 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-2xl"
                  >
                    <span>{overlayCtaCopy}</span>
                  </Link>
                )}

                <a
                  href={curriculumHref}
                  onClick={handleCurriculumClick}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/25 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  <span>📑 ดูสารบัญ 22 บท</span>
                </a>
              </div>

              <div className="pt-1 flex items-center justify-center gap-4 text-xs text-zinc-400">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="hover:text-white underline cursor-pointer"
                >
                  🔄 ดูตัวอย่างซ้ำอีกครั้ง
                </button>
                {!hasAccess && (
                  <Link
                    href={`/course/${courseSlug}?lesson=1`}
                    className="hover:text-emerald-300 text-emerald-400 font-semibold underline"
                  >
                    🎁 หรือดูบทที่ 1 เต็มบทฟรี
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom Bottom Control Bar (Play/Pause + Accessible Slider + Mute/Unmute) */}
        {!isEnded && !hasVideoError && (
          <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pt-4 pb-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'หยุดวิดีโอชั่วคราว' : 'เล่นวิดีโอตัวอย่าง'}
              className="text-white hover:text-amber-300 text-sm font-black px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer shrink-0"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <div
              role="slider"
              tabIndex={0}
              aria-label="แถบเวลาวิดีโอตัวอย่างบทที่ 21"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={`${formatTime(currentTime)} จาก ${formatTime(duration)}`}
              onKeyDown={handleSeekSliderKeyDown}
              onClick={handleProgressBarClick}
              className="flex-1 h-2 bg-white/25 rounded-full overflow-hidden cursor-pointer relative group"
            >
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <span className="text-[11px] font-mono text-white/90 shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'เปิดเสียงคำบรรยาย' : 'ปิดเสียงคำบรรยาย'}
              className="text-white hover:text-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer shrink-0"
            >
              {isMuted ? '🔇 เปิดเสียง' : '🔊 เสียงเปิดอยู่'}
            </button>
          </div>
        )}
      </div>

      {/* 3. Single Permanent Action Bar Below Video (Highlights dynamically at 30s — zero duplicate bars!) */}
      <div
        className={`rounded-2xl p-3.5 sm:p-4 transition-all duration-500 ${
          isPast30s
            ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border-2 border-amber-500 ring-2 ring-amber-400/50 shadow-lg'
            : 'bg-[var(--bg-deep)] border border-[var(--border-light)]'
        }`}
      >
        <div className="text-xs sm:text-sm font-extrabold text-center sm:text-left mb-2.5 flex items-center justify-center sm:justify-between flex-wrap gap-1.5">
          {hasAccess ? (
            <span className="text-emerald-700 dark:text-emerald-400">
              ✅ คุณมีสิทธิ์เรียนคอร์สนี้แล้ว — กดเข้าเรียนบทที่ 21 แบบเต็ม (06:06 นาที) พร้อมคัดลอก {promptCount} Prompt ได้เลย
            </span>
          ) : isPast30s ? (
            <span className="text-rose-700 dark:text-amber-300">
              🔥 ชอบคลิปอนิเมะ 2D เมื่อกี้ไหม? ปลดล็อกวิธีทำครบทุกสเต็ป + คัดลอก {promptCount} Prompt สำเร็จรูปได้ทันที!
            </span>
          ) : (
            <span className="text-[var(--text-secondary)]">
              💡 <strong className="text-[var(--text-primary)]">ราคาเปิดตัว ฿{priceFormatted}</strong> (เรียนครบ 22 บทตลอดชีพ + แถมฟรี 2 เครื่องมือ AI มูลค่ารวม ฿598)
            </span>
          )}
        </div>

        {/* Strict Mobile Button Hierarchy: Stacked vertically on mobile (< 640px) with Primary Filled on top, Secondary Ghost/Outline (35% thinner) below */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          {hasAccess ? (
            <Link
              href={fullLesson21Href}
              className="puppap-btn-primary min-h-[54px] sm:min-h-[58px] px-6 py-3.5 rounded-2xl text-base sm:text-lg font-black shadow-lg flex items-center justify-center gap-2 flex-1"
            >
              <span>▶ เรียนต่อบทที่ 21 แบบเต็ม (พร้อม {promptCount} Prompt)</span>
              <span className="puppap-arrow-nudge">→</span>
            </Link>
          ) : (
            <Link
              href={checkoutHref}
              onClick={() =>
                trackPreviewEvent(
                  isPast30s ? 'sticky_30s_cta_click' : 'purchase_from_preview',
                  {
                    variant: abVariant,
                    utm_content: isPast30s ? 'preview_l21_30s' : 'preview_l21_bar',
                  }
                )
              }
              className="puppap-btn-primary puppap-cta-animated min-h-[56px] sm:min-h-[60px] px-6 py-3.5 rounded-2xl text-base sm:text-lg font-black shadow-xl flex items-center justify-center gap-2 flex-1"
            >
              <span>🛒 สมัครเรียนราคาเปิดตัว ฿{priceFormatted} (แถมฟรี 2 เครื่องมือ AI)</span>
              <span className="puppap-arrow-nudge text-xl">→</span>
            </Link>
          )}

          {/* Secondary Ghost/Outline Button (35% thinner height: min-h-[40px] vs 60px) placed right next to Primary */}
          <a
            href={curriculumHref}
            onClick={handleCurriculumClick}
            className="min-h-[40px] sm:min-h-[44px] px-4 py-2 rounded-xl bg-transparent hover:bg-[var(--accent-dim)] text-[var(--text-primary)] border-[1.5px] border-[var(--border)] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <span>📑 ดูสารบัญทั้ง 22 บทเรียน ↓</span>
          </a>
        </div>
      </div>
    </div>
  );
}
