import React from 'react';
import Link from 'next/link';

interface AllInOneUpsellBannerProps {
  variant?: 'hero' | 'compact';
  toolCount?: number;
  ownsAllInOne?: boolean;
  className?: string;
}

export default function AllInOneUpsellBanner({
  variant = 'hero',
  toolCount = 6,
  ownsAllInOne = false,
  className = '',
}: AllInOneUpsellBannerProps) {
  const effectiveToolCount = Math.max(6, toolCount || 6);
  const separateToolsPrice = (effectiveToolCount * 299).toLocaleString('en-US');

  if (variant === 'compact') {
    return (
      <div
        className={`relative rounded-2xl overflow-hidden border-2 border-amber-400/90 bg-gradient-to-br from-stone-950 via-[#1F150B] to-stone-950 text-white p-4 sm:p-5 puppap-vip-card-glow text-left ${className}`}
      >
        {/* Top psychological ribbon */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5 pb-2.5 border-b border-amber-400/25">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 text-[11px] sm:text-xs font-black shadow-xs">
              👑 BEST VALUE · แพ็กเกจเหมาๆ ปุ๊บ ปั๊บ 999
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black puppap-badge-flash">
              🔥 ลด 67% · ประหยัดทันที ฿1,991!
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-300">
            ⚡ ตกเฉลี่ยชิ้นละ ~฿142 เท่านั้น
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            {/* Decoy Break-Even Math */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-200 text-xs font-extrabold">
              <span>💡</span>
              <span>
                คิดง่ายๆ: ซื้อแยกแค่ 3 เครื่องมือก็ <strong className="text-white underline decoration-rose-500">฿897</strong> แล้ว! เพิ่มอีกนิดได้ครบทั้งเว็บ
              </span>
            </div>

            <p className="text-sm sm:text-base font-black text-white leading-snug">
              ปลดล็อกครบทั้ง <span className="text-amber-300">เครื่องมือ AI ทั้ง {effectiveToolCount} ตัว (มูลค่า ฿{separateToolsPrice})</span> +{' '}
              <span className="text-emerald-300">คอร์สเรียน 22 บท (฿799)</span> +{' '}
              <span className="text-sky-300">อัปเดตเครื่องมือใหม่ในอนาคตฟรีตลอดชีพ!</span>
            </p>

            {/* Mini Value Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] font-bold text-stone-200">
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15">
                ✅ โฆษณาปักตะกร้า + ละครสั้น + พอดแคสต์ + แฟชั่น + UGC + โชว์สินค้า
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">
                ♾️ จ่ายครั้งเดียวจบ ไม่มีรายเดือน
              </span>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/10">
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-stone-400 font-semibold">
                มูลค่ารวม <span className="line-through text-rose-400 font-bold">฿2,990</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 leading-none">
                ฿999 <span className="text-xs font-bold text-stone-300">บาท</span>
              </div>
            </div>

            <Link
              href="/checkout/puppap-all-in-one"
              className="puppap-gold-cta-animated px-5 py-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shrink-0 shadow-xl"
            >
              <span>👑 เหมาครบทุกอย่าง ฿999</span>
              <span className="puppap-arrow-nudge text-base">→</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Hero Flagship Variant (for /flow-tools, /store, /dashboard)
  return (
    <section
      className={`relative rounded-3xl overflow-hidden border-2 border-amber-400 bg-gradient-to-br from-stone-950 via-[#1E140A] to-stone-950 text-white puppap-vip-card-glow ${className}`}
    >
      {/* Top Urgent Psychological Ribbon */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 px-4 sm:px-6 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-stone-950 text-amber-300 text-[11px] sm:text-xs font-black tracking-wide">
            👑 VIP ALL-IN-ONE PASS
          </span>
          <span className="text-xs sm:text-sm font-black">
            ดีลคุ้มที่สุดในเว็บ! ซื้อแยกแค่ 3 เครื่องมือก็ ฿897 แล้ว — เหมาหมดคุ้มกว่า 3 เท่า
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] sm:text-xs font-black shadow-xs">
          🔥 ลดโหด 67% · ประหยัดทันที ฿1,991!
        </span>
      </div>

      {/* Main 2-Column Body */}
      <div className="p-5 sm:p-7 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative">
        {/* Subtle Ambient Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-rose-500/15 blur-3xl"
        />

        {/* Left Column (7 cols): Headline + Break-Even Math + 3-Pillar Visual Value Stack */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                <span>🏆</span>
                <span>แพ็กเกจขายดีอันดับ 1 สำหรับสายปั้นช่อง & นายหน้า TikTok</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span>♾️</span>
                <span>สิทธิ์ใช้งานตลอดชีพ · ไม่มีรายเดือน</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
              แพ็กเกจเหมาๆ ปุ๊บ ปั๊บ{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                999.-
              </span>{' '}
              <span className="block sm:inline text-lg sm:text-2xl text-amber-100 font-extrabold">
                ปลดล็อกทุกเครื่องมือ AI + คอร์สเรียนครบจบในครั้งเดียว!
              </span>
            </h2>
          </div>

          {/* Decoy Effect & Break-Even Callout Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-l-4 border-amber-400 flex items-start gap-3">
            <span className="text-xl sm:text-2xl shrink-0 leading-none mt-0.5">💡</span>
            <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
              <strong className="text-amber-300 font-black">ทำไมคนส่วนใหญ่เลือกแพ็กนี้?</strong>{' '}
              เพราะซื้อแยกแค่ 3 เครื่องมือก็ <strong className="text-white underline decoration-rose-500 font-black">฿897</strong> แล้ว! เพิ่มเงินอีกแค่ร้อยเดียว (฿999) คุณได้ปลดล็อก{' '}
              <strong className="text-white font-black">ครบทุกเครื่องมือทั้งเว็บ + คอร์สเรียน 22 บท + อัปเดตเครื่องมือใหม่ฟรีในอนาคต</strong>
            </p>
          </div>

          {/* 3-Pillar Visual Value Stack Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Pillar 1 */}
            <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-amber-400/30 flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">🛠️</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-black">
                    มูลค่า ฿{separateToolsPrice}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-black text-white">
                  ครบทั้ง {effectiveToolCount} เครื่องมือ AI
                </h3>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  คลิปขายของ, ละครสั้น, พอดแคสต์, แฟชั่น, UGC และคลิปโชว์สินค้า (ปกติตัวละ ฿299)
                </p>
              </div>
              <div className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1">
                <span>✓</span>
                <span>ปลดล็อกครบทุกตัวทันที</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-amber-400/30 flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">🎓</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-black">
                    มูลค่า ฿799
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-black text-white">
                  คอร์สเรียน 22 บทเต็ม
                </h3>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  สอนจับมือทำบนมือถือตั้งแต่ศูนย์ ปั้นช่องนายหน้า TikTok + Prompt + คู่มือ PDF
                </p>
              </div>
              <div className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1">
                <span>✓</span>
                <span>ดูซ้ำได้ตลอดชีพ 24 ชม.</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-amber-400/30 flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">🚀</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[11px] font-black">
                    ฟรีในอนาคต!
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-black text-white">
                  อัปเดตเครื่องมือใหม่ฟรี
                </h3>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  เมื่อมี Flow Tool ใหม่ที่เข้าร่วมแพ็กเกจ ระบบปลดล็อกเข้าบัญชีให้อัตโนมัติทันที
                </p>
              </div>
              <div className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1">
                <span>✓</span>
                <span>ไม่ต้องเสียเงินซื้อซ้ำ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): VIP Ticket Price & Action Box */}
        <div className="lg:col-span-5 xl:col-span-4 relative z-10">
          <div className="rounded-3xl p-5 sm:p-6 bg-stone-950/90 border-2 border-amber-400/80 shadow-2xl text-center space-y-4">
            {/* Value Anchor Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black puppap-badge-flash">
                <span>🔥</span>
                <span>ประหยัดทันที ฿1,991 (ลด 67%)</span>
              </div>
              <div className="text-xs sm:text-sm text-stone-300 font-semibold pt-1">
                มูลค่ารวมเมื่อซื้อแยก{' '}
                <span className="line-through text-rose-400 font-extrabold text-sm sm:text-base">
                  ฿2,990 บาท
                </span>
              </div>
            </div>

            {/* Giant Hero Price */}
            <div className="py-2.5 px-4 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 border border-amber-400/30">
              <div className="text-xs font-bold text-amber-200">ราคาพิเศษเหมาครบทุกอย่าง</div>
              <div className="flex items-baseline justify-center gap-1.5 mt-0.5">
                <span className="text-5xl sm:text-6xl font-black text-amber-300 tracking-tight leading-none drop-shadow">
                  ฿999
                </span>
                <span className="text-base sm:text-lg font-extrabold text-stone-200">บาท</span>
              </div>
              <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-black text-emerald-300">
                ⚡ เฉลี่ยรายการละ ~฿142 เท่านั้น!
              </div>
            </div>

            {/* Primary Shimmer Gold CTA */}
            {ownsAllInOne ? (
              <div className="w-full py-4 px-6 rounded-2xl bg-emerald-700 text-white font-black text-sm sm:text-base shadow-lg flex items-center justify-center gap-2">
                <span>✅</span>
                <span>คุณปลดล็อกแพ็กเหมาๆ ครบแล้ว</span>
              </div>
            ) : (
              <Link
                href="/checkout/puppap-all-in-one"
                className="puppap-gold-cta-animated w-full min-h-[58px] py-3.5 px-6 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center gap-2 shadow-2xl"
              >
                <span>👑 เหมาครบทุกตัว ฿999 ทันที</span>
                <span className="puppap-arrow-nudge text-xl">→</span>
              </Link>
            )}

            {/* Instant Trust & Zero-Wait Guarantee */}
            <div className="space-y-1 text-[11px] sm:text-xs text-stone-300 font-semibold">
              <p className="text-emerald-300 font-bold">
                ⚡ สแกน QR ปุ๊บ AI ตรวจสลิปเปิดสิทธิ์ครบทุกตัวใน 5 วินาที
              </p>
              <p className="text-[11px] text-stone-400">
                ✓ จ่ายครั้งเดียวจบ · ไม่มีค่ารายเดือน · ใช้ได้ทุกอุปกรณ์
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
