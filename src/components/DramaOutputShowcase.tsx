'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_BASE =
  'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images/drama-showcase';

export interface DramaShowcaseItem {
  id: number;
  key: string;
  title: string;
  genreBadge: string;
  genreTitle: string;
  durationLabel: string;
  isHighlight?: boolean;
  videoUrl: string;
  posterUrl: string;
  drivePreviewUrl: string;
  synopsis: string;
  cameraNote: string;
  voiceNote: string;
  accentClass: string;
}

export const DRAMA_SHOWCASE_ITEMS: DramaShowcaseItem[] = [
  {
    id: 1,
    key: 'billionaire-revenge',
    title: 'เงาแค้นทายาทหมื่นล้าน',
    genreBadge: '💎 ไฮโซแก้แค้น',
    genreTitle: 'ดราม่าตระกูลไฮโซ / ทายาทหมื่นล้าน (CEO Revenge Drama)',
    durationLabel: '32 วิ • 4 ช็อต',
    isHighlight: true,
    videoUrl: `${STORAGE_BASE}/billionaire-revenge.mp4`,
    posterUrl: `${STORAGE_BASE}/billionaire-revenge-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1gORGi6jmtkFxP0TNzjT8_J4viFGWCvmO/preview',
    synopsis:
      'ฉากปะทะอารมณ์ในห้องทำงานตึกสูงยามค่ำคืน สลับมุมกล้องพระเอก-นางเอก 4 ช็อตต่อเนื่องโดยใบหน้าและชุดตรงกัน 100%',
    cameraNote: 'ARRI Alexa 85mm Anamorphic • สลับมุม Over-the-Shoulder & Extreme Close-Up',
    voiceNote: 'พากย์ไทยโทนเข้มข้นเชือดเฉือน + ลิปซิงค์ตรงจังหวะคำพูด',
    accentClass: 'from-amber-500 to-yellow-600 text-stone-950',
  },
  {
    id: 2,
    key: 'undercover-ceo',
    title: 'ประธานบริษัทปลอมตัวเป็น รปภ.',
    genreBadge: '👔 ละครคุณธรรม',
    genreTitle: 'ละครคุณธรรมสะท้อนสังคม (Undercover Boss Viral)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_BASE}/undercover-ceo.mp4`,
    posterUrl: `${STORAGE_BASE}/undercover-ceo-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/15YhMBan1BXWBUFqs4Ycnuzt9vSypw-jY/preview',
    synopsis:
      'พล็อตยอดฮิตติดเทรนด์ TikTok ประธานบริษัทปลอมตัวมาทดสอบจิตใจคน โทนภาพคมชัดสมจริงระดับละครทีวี',
    cameraNote: 'Medium Two-Shot 50mm • แสงธรรมชาติสมจริงระดับ DSLR',
    voiceNote: 'เสียงพากย์ไทยโทนสุขุม นุ่มลึก มีพลังสะกดคนดูตั้งแต่ 3 วินาทีแรก',
    accentClass: 'from-sky-500 to-blue-600 text-white',
  },
  {
    id: 3,
    key: 'wuxia-demon-lord',
    title: 'คมกระบี่ซ่อนรักประมุขมาร',
    genreBadge: '⚔️ จีนกำลังภายใน',
    genreTitle: 'ซีรีส์จีนกำลังภายใน / เทพเซียน (Wuxia & Xianxia)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_BASE}/wuxia-demon-lord.mp4`,
    posterUrl: `${STORAGE_BASE}/wuxia-demon-lord-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1egrL2CW1oBvD-jReSbHrhDV8JIgkcn8z/preview',
    synopsis:
      'คอสตูมจอมยุทธ์และประมุขมารสุดอลังการ เอฟเฟกต์สายลมและอารมณ์สายตาคมกริบเหมือนซีรีส์จีนฟอร์มยักษ์',
    cameraNote: 'Cinematic Low-Angle + Slow Push-In • โทนสีหม่นขรึมทรงพลัง',
    voiceNote: 'พากย์ไทยสไตล์ซีรีส์จีนยุทธภพ อารมณ์ดราม่าเข้มข้น',
    accentClass: 'from-rose-600 to-red-700 text-white',
  },
  {
    id: 4,
    key: 'joseon-crown-prince',
    title: 'อ้อมกอดซ่อนรักรัชทายาทโชซอน',
    genreBadge: '👑 พีเรียดเกาหลี',
    genreTitle: 'ซีรีส์พีเรียดเกาหลี โชซอน (K-Drama Royal Romance)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_BASE}/joseon-crown-prince.mp4`,
    posterUrl: `${STORAGE_BASE}/joseon-crown-prince-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1GmArz01dRXzYxQ3lymAFKhnmUX3o3uEF/preview',
    synopsis:
      'ฉากโรแมนติกในวังหลวงยุคโชซอน ชุดฮันบกประณีต แสงไฟตะเกียงอบอุ่นละมุนตาตามแบบฉบับ K-Drama',
    cameraNote: 'Soft Golden Hour Rim Light • Shallow Depth of Field หน้าชัดหลังละลาย',
    voiceNote: 'พากย์ไทยโทนอบอุ่นโรแมนติก ถ่ายทอดอารมณ์รักต้องห้าม',
    accentClass: 'from-purple-500 to-indigo-600 text-white',
  },
  {
    id: 5,
    key: 'campus-gear-love',
    title: 'เกียร์นี้มีไว้ล็อกนายตัวแสบ (EP.3)',
    genreBadge: '⚙️ วัยรุ่นวิศวะ',
    genreTitle: 'ซีรีส์วัยรุ่น / คณะวิศวะ (Campus & Youth Series)',
    durationLabel: '10 วิ • EP.3',
    videoUrl: `${STORAGE_BASE}/campus-gear-love.mp4`,
    posterUrl: `${STORAGE_BASE}/campus-gear-love-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1cjo_p8i66FpO2eE-Rf-vuHKUMaKWd9U3/preview',
    synopsis:
      'ซีรีส์วัยมหาลัยเสื้อช็อปวิศวะขวัญใจวัยรุ่น สีสันสดใส ท่าทางและสีหน้าตัวละครมีชีวิตชีวาเป็นธรรมชาติ',
    cameraNote: 'Handheld Dynamic Framing • โทนสีสดใสสไตล์ซีรีส์วัยรุ่นไทย',
    voiceNote: 'เสียงพูดไทยวัยรุ่นเป็นธรรมชาติ จังหวะปะทะคารมสนุกน่าติดตาม',
    accentClass: 'from-pink-500 to-rose-500 text-white',
  },
  {
    id: 6,
    key: 'isan-country-love',
    title: 'มนต์ฮักเถียงนาน้อย',
    genreBadge: '🌾 ลูกทุ่งไทบ้าน',
    genreTitle: 'ละครลูกทุ่งอีสานโรแมนติก (Isan Country Romance)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_BASE}/isan-country-love.mp4`,
    posterUrl: `${STORAGE_BASE}/isan-country-love-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1gwbEmGgIUEwPL7ICdp3tvzeZHHKe1zZ7/preview',
    synopsis:
      'บรรยากาศท้องทุ่งนาและเถียงนาน้อยยามเย็นสมจริง ถ่ายทอดวิถีชีวิตและความรักบ้านนาที่เข้าถึงผู้ชมทั่วประเทศ',
    cameraNote: 'Warm Sunset Backlight • องค์ประกอบภาพทุ่งนาไทยสมจริง',
    voiceNote: 'โทนเสียงอบอุ่นจริงใจ เข้ากับบรรยากาศละครลูกทุ่งไทบ้าน',
    accentClass: 'from-emerald-500 to-green-600 text-white',
  },
  {
    id: 7,
    key: 'room-404-horror',
    title: 'ห้อง 404 ห้ามทักยามวิกาล',
    genreBadge: '👻 สยองขวัญ',
    genreTitle: 'ซีรีส์ผี / หอพักอาถรรพ์ (Urban Horror Mystery)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_BASE}/room-404-horror.mp4`,
    posterUrl: `${STORAGE_BASE}/room-404-horror-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1EgOTyX3W1rBLwZi8e1LorbWGeWDk9svX/preview',
    synopsis:
      'บรรยากาศโถงทางเดินหอพักยามวิกาลสุดหลอน แสงไฟนีออนกระพริบและจังหวะสะดุ้งที่ดึงคนดูไม่ให้เลื่อนผ่าน',
    cameraNote: 'Low-Key Horror Lighting • Chiaroscuro Contrast เงาลึกชวนขนลุก',
    voiceNote: 'เสียงกระซิบและซาวด์บรรยากาศหลอนสมจริงระดับภาพยนตร์ผี',
    accentClass: 'from-slate-700 to-zinc-900 text-amber-300',
  },
  {
    id: 8,
    key: 'zombie-711-thriller',
    title: 'คืนคลั่งเซเว่นปิดตาย',
    genreBadge: '🧟 ซอมบี้ระทึกขวัญ',
    genreTitle: 'ระทึกขวัญ / เอาชีวิตรอด (Survival Action Thriller)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_BASE}/zombie-711-thriller.mp4`,
    posterUrl: `${STORAGE_BASE}/zombie-711-thriller-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1XZxKBbqUEvGh0qydKghcU2Z0klS3ZiQk/preview',
    synopsis:
      'ฉากหนีตายระทึกขวัญในร้านสะดวกซื้อยามค่ำคืน มุมกล้องแอ็กชันสั่นไหวสมจริงเหมือนหนังเอาชีวิตรอดเกาหลี',
    cameraNote: 'Action Tracking Shot • แสงไฟนีออนตัดเงามืดสร้างความกดดันสูงสุด',
    voiceNote: 'เสียงหอบหายใจและอารมณ์ตื่นตระหนกสมจริง ดึงยอดวิวสายหนังแอ็กชัน',
    accentClass: 'from-orange-600 to-red-600 text-white',
  },
];

interface DramaOutputShowcaseProps {
  isUnlocked?: boolean;
  priceFormatted?: string;
  checkoutHref?: string;
}

export default function DramaOutputShowcase({
  isUnlocked = false,
  priceFormatted = '599',
  checkoutHref = '/checkout/puppap-drama',
}: DramaOutputShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeItem = DRAMA_SHOWCASE_ITEMS[activeIndex] || DRAMA_SHOWCASE_ITEMS[0];

  useEffect(() => {
    setVideoError(false);
    const v = videoRef.current;
    if (!v) return;
    v.load();
    const playPromise = v.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [activeIndex]);

  const handleSelectDrama = (idx: number) => {
    setActiveIndex(idx);
    // Unmute automatically when user explicitly clicks a drama card
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + DRAMA_SHOWCASE_ITEMS.length) % DRAMA_SHOWCASE_ITEMS.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % DRAMA_SHOWCASE_ITEMS.length);
  };

  return (
    <section
      aria-label="โรงภาพยนตร์แสดงผลงานจริง 8 แนวละครสั้น AI จาก PUP PAP DRAMA"
      data-testid="drama-output-showcase"
      className="max-w-5xl mx-auto px-4 mb-10"
    >
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-b from-[#160b06] via-[#0e0a0f] to-[#140905] text-white border-2 border-amber-400/80 shadow-[0_16px_50px_rgba(0,0,0,0.65)] p-4 sm:p-6 md:p-8 space-y-6">
        {/* Ambient Cinema Spotlights */}
        <div className="pointer-events-none absolute -top-24 left-1/4 w-96 h-56 bg-rose-600/20 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 w-96 h-56 bg-amber-500/20 rounded-full blur-3xl" />

        {/* Cinema Stage Header */}
        <div className="relative z-10 text-center space-y-2.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/25 to-amber-500/20 border border-amber-400/60 text-amber-300 text-xs sm:text-sm font-bold shadow-sm">
            <span>🎬</span>
            <span>REAL AI SHORT-DRAMA SHOWCASE • ผลงานจริงจากเครื่องมือนี้ 100%</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
            ชมตัวอย่างละครสั้น AI ระดับมาสเตอร์พีซ{' '}
            <span className="text-amber-300 underline decoration-rose-500/80">
              ครบ 8 แนวไวรัลยอดฮิต
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            ทุกคลิปด้านล่างถูกสร้างจาก <strong className="text-amber-300">PUP PAP DRAMA</strong> — ล็อกใบหน้าตัวละครตรงกันทุกช็อต คุมมุมกล้องระดับภาพยนตร์ พร้อมเสียงพากย์ไทยอารมณ์สมจริงโดยไม่ต้องใช้คนแสดง
          </p>
        </div>

        {/* Main Interactive Split Cinema Stage */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (lg:col-span-5): 9:16 Vertical Cinema Screen + AI Director Recipe */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-3.5">
            {/* 9:16 Vertical Phone / Cinema Screen */}
            <div className="relative w-full max-w-[290px] sm:max-w-[315px] aspect-[9/16] rounded-[26px] overflow-hidden border-[3px] border-amber-400/90 bg-black shadow-[0_0_35px_rgba(245,158,11,0.28)] group">
              {/* Top Overlay Bar: Track Number + Genre Badge */}
              <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
                <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>
                    เรื่องที่ #{activeIndex + 1}/8 • {activeItem.durationLabel}
                  </span>
                </span>

                <span
                  className={`px-2.5 py-1 rounded-full bg-gradient-to-r ${activeItem.accentClass} text-[11px] font-bold shadow-md`}
                >
                  {activeItem.genreBadge}
                </span>
              </div>

              {/* Native HTML5 Fast-Streaming Video Player (with Drive iframe fallback) */}
              {!videoError ? (
                <video
                  ref={videoRef}
                  key={activeItem.videoUrl}
                  src={activeItem.videoUrl}
                  poster={activeItem.posterUrl}
                  playsInline
                  autoPlay
                  loop
                  muted={isMuted}
                  controls={false}
                  onClick={toggleMute}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-cover cursor-pointer"
                />
              ) : (
                <iframe
                  src={activeItem.drivePreviewUrl}
                  title={activeItem.title}
                  allow="autoplay; encrypted-media; fullscreen"
                  className="w-full h-full border-0"
                />
              )}

              {/* Bottom Gradient Overlay with Drama Title + Prominent Sound Toggle Button */}
              <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-12 pb-3.5 px-3.5 space-y-2.5">
                <div className="text-left">
                  <div className="text-[11px] font-semibold text-amber-300">
                    {activeItem.genreTitle}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                    “{activeItem.title}”
                  </h3>
                </div>

                {!videoError && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      data-testid="drama-showcase-sound-toggle"
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg ${
                        isMuted
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-stone-950 animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-300/50'
                      }`}
                    >
                      <span>{isMuted ? '🔊 แตะเปิดฟังเสียงพากย์ไทย AI' : '🔊 เปิดเสียงพากย์ไทยอยู่ (แตะเพื่อปิด)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const v = videoRef.current;
                        if (!v) return;
                        if (v.paused) {
                          v.play().catch(() => {});
                        } else {
                          v.pause();
                        }
                      }}
                      aria-label={isPlaying ? 'หยุดชั่วคราว' : 'เล่นต่อ'}
                      className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Prev / Next Navigation Pills */}
            <div className="flex items-center justify-between gap-2 w-full max-w-[315px]">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-stone-200 transition-colors cursor-pointer"
              >
                ◀ เรื่องก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
              >
                เรื่องถัดไป ▶
              </button>
            </div>

            {/* AI Director Recipe HUD Card */}
            <div className="w-full max-w-[340px] lg:max-w-none rounded-2xl bg-stone-900/90 border border-amber-400/35 p-3.5 text-left space-y-2 shadow-md">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🎛️</span>
                  <span>สูตรผู้กำกับ AI ที่ใช้เจนเรื่องนี้</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  เจนตามได้ทันที
                </span>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">{activeItem.synopsis}</p>

              <div className="space-y-1 pt-1 text-[11px] text-stone-300">
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-400 shrink-0">🎥</span>
                  <span>
                    <strong className="text-white">มุมกล้อง & แสง:</strong> {activeItem.cameraNote}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-400 shrink-0">🎙️</span>
                  <span>
                    <strong className="text-white">เสียง & อารมณ์:</strong> {activeItem.voiceNote}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (lg:col-span-7): 8-Genre Interactive Movie Poster Grid */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
              <div className="text-xs sm:text-sm font-bold text-amber-200 flex items-center gap-2">
                <span>🎞️</span>
                <span>คลิกเลือกชมผลงานจริงทั้ง 8 แนวละครฮิต (คลิกเพื่อเล่นพร้อมเสียง)</span>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">
                รองรับทุกแนวเรื่องในเครื่องมือเดียว
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {DRAMA_SHOWCASE_ITEMS.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectDrama(idx)}
                    data-testid={`drama-card-${item.key}`}
                    className={`group relative rounded-2xl overflow-hidden text-left transition-all cursor-pointer flex flex-col justify-between aspect-[9/14] bg-stone-950 ${
                      isSelected
                        ? 'ring-3 ring-amber-400 border-2 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.45)] -translate-y-1'
                        : 'border border-white/15 hover:border-amber-400/70 opacity-90 hover:opacity-100 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Poster Thumbnail */}
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Subtle Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/55" />

                    {/* Top Badges on Card */}
                    <div className="relative z-10 p-2 flex items-center justify-between gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${item.accentClass} text-[9.5px] font-bold leading-tight shadow-sm truncate`}
                      >
                        {item.genreBadge}
                      </span>

                      {item.isHighlight && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8.5px] font-bold shadow-xs shrink-0">
                          4 ช็อต
                        </span>
                      )}
                    </div>

                    {/* Center Play / Active Equalizer Badge */}
                    <div className="relative z-10 flex items-center justify-center">
                      <span
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-transform shadow-lg ${
                          isSelected
                            ? 'bg-amber-400 text-stone-950 scale-110'
                            : 'bg-black/65 text-white border border-white/30 group-hover:scale-110 group-hover:bg-rose-600'
                        }`}
                      >
                        {isSelected ? '🔊' : '▶'}
                      </span>
                    </div>

                    {/* Bottom Title & Status */}
                    <div className="relative z-10 p-2.5 space-y-1">
                      <div className="text-[9.5px] font-semibold text-amber-300/95">
                        #{idx + 1} • {item.durationLabel}
                      </div>
                      <div className="text-xs font-bold text-white leading-snug line-clamp-2">
                        {item.title}
                      </div>
                      <div
                        className={`text-[10px] font-bold pt-0.5 ${
                          isSelected ? 'text-emerald-400' : 'text-stone-300 group-hover:text-amber-300'
                        }`}
                      >
                        {isSelected ? '● กำลังเล่นเรื่องนี้' : '▶ คลิกเพื่อดูตัวอย่าง'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Conversion Strip Inside Showcase */}
            {!isUnlocked && (
              <div className="mt-2 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border border-amber-400/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left space-y-0.5">
                  <div className="text-xs sm:text-sm font-bold text-amber-200">
                    ✨ สร้างละครสั้น AI ภาพสวย ล็อกหน้าเป๊ะ + พากย์ไทยครบทั้ง 8 แนวได้ด้วยตัวเอง!
                  </div>
                  <div className="text-[11px] text-stone-300">
                    ปลดล็อกครั้งเดียวใช้งานได้ตลอดชีพ หรือเลือกแพ็กเหมาๆ 799 ได้ครบทุกโปรแกรมในเว็บ
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <Link
                    href={checkoutHref}
                    className="puppap-btn-primary puppap-cta-animated flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-center whitespace-nowrap shadow-lg"
                  >
                    🛒 ซื้อเครื่องมือนี้ ฿{priceFormatted} →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
