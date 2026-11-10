import { createClient } from '@/lib/supabase/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import DashboardClient from './DashboardClient'
import { formatToolUpdateDate } from '@/lib/date-utils'
import ThemeToggle from '@/components/ThemeToggle'
import FlowToolCard from '@/components/FlowToolCard'
import CourseHeroVideo from '@/components/CourseHeroVideo'
import CourseCoreHighlights from '@/components/CourseCoreHighlights'
import Lesson21PreviewPlayer from '@/components/Lesson21PreviewPlayer'
import AllInOneUpsellBanner from '@/components/AllInOneUpsellBanner'
import { getPriceInfo } from '@/lib/price-utils'
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  type Tool,
} from '@/lib/sanitize-tool'
import {
  resolveUserBundleAccess,
  attemptCourseBundleHeal,
} from '@/lib/course-bundle'

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Landing Page (Parallelized queries)
    const [{ data: rawAllTools }, { data: settings }] = await Promise.all([
      supabase.from('tools').select(PUBLIC_TOOL_SELECT_COLUMNS).order('sort_order'),
      supabase
        .from('site_settings')
        .select('id, site_name, tagline, description, logo_url, og_image_url, favicon_url')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])
    const allTools = ((rawAllTools || []) as unknown as Tool[]).map((t) =>
      sanitizeToolForPublic(t, { session: null, hasAccess: false, isTrial: false })
    )
    const courseItem = (allTools || []).find(
      (t: any) => t.slug === 'tiktok-ai-affiliate' || t.category === 'course'
    )
    const coursePrice = getPriceInfo(
      courseItem?.price || '159',
      courseItem?.features || { original_price: '799' }
    )
    
    return (
      <div className="min-h-screen text-[var(--text-primary)] font-sans flex flex-col items-center transition-colors duration-200">
        
        {/* Top Navigation Bar สไตล์โมเดิร์นมาตรฐานสากล (Responsive 2-Row Mobile / 1-Row Desktop) */}
        <header className="w-full border-b border-[var(--border-light)] bg-[var(--bg-primary)]/90 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-3.5 sm:px-4 py-2.5 sm:py-3 space-y-2 md:space-y-0">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* ซ้าย: โลโก้ + ชื่อแบรนด์ (ไม่ตัดบรรทัดทับปุ่มบนมือถือ) */}
              <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
                <img 
                  src={settings?.logo_url || "/images/logo-puppap-ai.png"} 
                  alt="PUP PAP AI Logo" 
                  className="w-9 h-9 rounded-xl object-cover border-[1.5px] border-[var(--border)] bg-white shadow-sm group-hover:scale-105 transition-transform shrink-0"
                />
                <span className="text-base sm:text-lg md:text-xl font-black text-[var(--text-primary)] tracking-tight whitespace-nowrap">
                  {settings?.site_name || 'PUP PAP AI'}
                </span>
              </Link>

              {/* ขวา: แคตตาล็อก Flow + คอร์สเรียน (ซ่อนแถวบนในมือถือ ย้ายลงแถวล่างเพื่อไม่ให้เบียดชื่อแบรนด์) */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <Link 
                  href="/courses" 
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--accent)] bg-[var(--bg-deep)] border border-[var(--border-light)] hover:scale-105 transition-transform whitespace-nowrap"
                >
                  <span>🎓 คอร์สเรียน</span>
                </Link>
                <Link 
                  href="/flow-tools" 
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[var(--accent)] bg-[var(--accent-dim)] border border-[var(--border-accent)] hover:scale-105 transition-transform whitespace-nowrap"
                >
                  <span>✨ แคตตาล็อก Flow</span>
                </Link>
                <ThemeToggle variant="segmented" size="sm" />
                <Link 
                  href="/login" 
                  className="puppap-btn-primary px-3.5 sm:px-4 py-1.5 rounded-full text-xs md:text-sm shadow-sm whitespace-nowrap shrink-0"
                >
                  เข้าสู่ระบบ
                </Link>
              </div>
            </div>

            {/* แถบทางลัดสำหรับมือถือ (แสดงเฉพาะจอ < md เพื่อไม่ให้ปุ่มเบียดซ้อนชื่อแบรนด์) */}
            <div className="grid grid-cols-2 gap-2 md:hidden pt-1 border-t border-[var(--border-light)]/60">
              <Link 
                href="/courses" 
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-extrabold text-[var(--text-primary)] bg-[var(--bg-deep)] border border-[var(--border)] shadow-2xs active:scale-95 transition-transform whitespace-nowrap"
              >
                <span>🎓 คอร์สเรียน (฿{coursePrice.formattedPrice})</span>
              </Link>
              <Link 
                href="/flow-tools" 
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-extrabold text-[var(--accent)] bg-[var(--accent-dim)] border border-[var(--border-accent)] shadow-2xs active:scale-95 transition-transform whitespace-nowrap"
              >
                <span>✨ แคตตาล็อก Flow</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section กลางหน้า คลีน สบายตา */}
        <section className="w-full text-center pt-10 md:pt-16 pb-10 px-4 relative overflow-hidden flex flex-col items-center">
          
          {/* มาสค็อตหุ่นยนต์ 3D คุณภาพสูง */}
          <div className="relative group mb-6">
            <img 
              src={settings?.logo_url || "/images/logo-puppap-ai.png"} 
              alt="PUP PAP AI Mascot" 
              className="w-28 h-28 md:w-36 md:h-36 rounded-3xl object-cover border-[2px] border-[var(--border)] bg-white shadow-xl group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          
          {/* หัวข้อและสโลแกน */}
          <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight text-center">
            <span className="text-[var(--text-primary)]">
              {settings?.site_name || 'PUP PAP AI'}
            </span>
            <br/>
            <span className="text-xl md:text-2xl text-[var(--accent)] font-bold tracking-normal block mt-2">
              {settings?.tagline || 'คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม'}
            </span>
          </h1>
          
          <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-2xl mx-auto mb-6 text-center leading-relaxed">
            {settings?.description || 'คิดปุ๊บ คลิปปั๊บ สร้างและโพสต์วิดีโอ AI อัตโนมัติ ปักตะกร้าลง TikTok, Facebook Reels, และ Shopee Video'}
          </p>

          {/* Platform Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <span className="puppap-tab active">
              🎵 TikTok
            </span>
            <span className="puppap-tab">
              🎬 Reels
            </span>
            <span className="puppap-tab text-[#EE4D2D]">
              🛒 Shopee VDO
            </span>
            <span className="puppap-tab">
              ▶️ YouTube
            </span>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link href="/login" className="puppap-btn-primary px-8 py-3.5 rounded-full text-base md:text-lg shadow-md hover:scale-105 active:scale-95 text-center flex items-center gap-2">
              <span>⚡</span> เข้าสู่ระบบเพื่อใช้งาน
            </Link>
            <Link href="/courses" className="puppap-btn-secondary px-6 py-3.5 rounded-full text-base font-bold text-center flex items-center gap-2 hover:scale-105 transition-transform">
              <span>🎓</span>
              <span>คอร์สเรียนราคาเปิดตัว ฿{coursePrice.formattedPrice}</span>
              <span className="text-xs text-[var(--accent)] font-extrabold">(แถมฟรี 2 เครื่องมือ AI มูลค่ารวม ฿598)</span>
            </Link>
          </div>
        </section>

        {/* Featured Course Card with Full Poster + Giant Price + Animated Psychological CTA + Lesson 21 Preview */}
        <div className="max-w-6xl w-full mx-auto px-4 mb-10 space-y-6">
          <div className="puppap-card p-5 sm:p-8 border-2 border-[var(--border-accent)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-deep)] to-[var(--bg-card)] shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* ซ้าย (หรือด้านบนบนมือถือ): วิดีโอแนะนำคอร์สแนวตั้ง 9:16 (22 วิ) + ปุ่มซูมดูโปสเตอร์ 22 บทเรียน */}
            <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
              <CourseHeroVideo
                pageContext="home"
                posterSrc={courseItem?.poster_url || '/images/poster-course-tiktok-ai.jpg'}
                enrollHref="/checkout/tiktok-ai-affiliate"
              />
            </div>

            {/* ขวา (หรือด้านล่างบนมือถือ): รายละเอียด + กล่องราคายักษ์ + ปุ่มกดซื้อเคลื่อนไหว */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-5 text-center lg:text-left">
              <div className="space-y-3">
                <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-[var(--accent)] text-white shadow-xs">
                    🎓 คอร์สเรียนแนะนำ
                  </span>
                  <span className="px-3.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm puppap-badge-flash">
                    🔥 ราคาเปิดตัว ฿{coursePrice.formattedPrice}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    💡 ซื้อครั้งเดียวเรียนได้ตลอดชีพ (22 บทเรียน)
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight">
                  ปั้นนายหน้า TikTok ด้วย AI ปักตะกร้า
                </h2>

                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  คู่มือสร้างรายได้แบบจับมือทำ 22 บทเรียนเต็ม วิดีโอแนวนอน 16:9 คมชัด เรียนได้ทุกเพศทุกวัย แม้ไม่เก่งคอมพิวเตอร์ ทำตามได้บนมือถือเครื่องเดียว
                </p>

                {/* Core 8 Outcome-Focused Learning Highlights + “มือใหม่ก็ทำได้บนมือถือเครื่องเดียว” */}
                <CourseCoreHighlights pageContext="home" />
              </div>

              {/* Giant Price Box + Dual-Path Cluster (Buy + Syllabus Adjacent) */}
              <div className="space-y-3.5 pt-1">
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-primary)] border-2 border-[var(--border-accent)] text-center shadow-md relative overflow-hidden">
                  <div className="flex items-center justify-center gap-2.5 flex-wrap">
                    <span className="text-xs sm:text-sm text-[var(--text-secondary)] font-extrabold">
                      🎁 แถมฟรี 2 เครื่องมือ AI (แยกซื้อชิ้นละ ฿299)
                    </span>
                    <span className="px-3 py-0.5 rounded-full bg-rose-600 text-white text-xs sm:text-sm font-black puppap-badge-flash">
                      🔥 ลดพิเศษจากปกติ ฿{coursePrice.formattedOriginal} (ประหยัด ฿{coursePrice.savingsFormatted})
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-[var(--text-muted)] line-through">
                      ปกติ ฿{coursePrice.formattedOriginal}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[var(--text-secondary)]">
                      เหลือเพียง
                    </span>
                    <span className="text-5xl sm:text-6xl font-black text-[var(--accent)] tracking-tight leading-none puppap-price-hero">
                      ฿{coursePrice.formattedPrice}
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-[var(--text-secondary)]">
                      บาท
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm font-bold text-[var(--text-secondary)] mt-1">
                    ✅ จ่ายครั้งเดียวจบ · ไม่มีค่ารายเดือน · อัปเดตเนื้อหาใหม่ฟรีตลอดชีพ
                  </div>
                </div>

                {/* Strict Mobile Hierarchy: Primary on top (full width), Secondary Ghost/Outline below on <640px, side-by-side on sm+ */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                  <Link 
                    href="/checkout/tiktok-ai-affiliate" 
                    className="puppap-btn-primary puppap-cta-animated sm:flex-[1.5] min-h-[58px] sm:min-h-[64px] py-3.5 px-6 rounded-2xl text-center text-base sm:text-xl font-black flex items-center justify-center gap-2.5 shadow-xl"
                  >
                    <span>🛒 สมัครเรียนโปรพิเศษ ฿{coursePrice.formattedPrice}</span>
                    <span className="puppap-arrow-nudge text-xl sm:text-2xl">→</span>
                  </Link>
                  <Link 
                    href="/courses#curriculum" 
                    className="sm:flex-1 min-h-[42px] sm:min-h-[64px] py-2.5 px-4 rounded-2xl border-2 border-[var(--border-accent)] bg-transparent hover:bg-[var(--accent-dim)] text-[var(--text-primary)] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>📑 ดูสารบัญ 22 บท</span>
                    <span className="text-[var(--accent)]">→</span>
                  </Link>
                </div>

                {/* All-in-One 999 VIP Bundle Upsell Card (puppap-all-in-one) */}
                <AllInOneUpsellBanner
                  variant="compact"
                  tools={allTools}
                  currentToolSlug="tiktok-ai-affiliate"
                  source="home_banner"
                />

                <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 text-center">
                  ⚡ สแกน QR ปุ๊บ ระบบ AI ตรวจสลิปเปิดห้องเรียนให้ทันทีใน 5 วินาที
                </p>
              </div>
            </div>
          </div>

          {/* Embedded Lesson 21 ~1-Minute Preview + Adjacent Action Bar */}
          <Lesson21PreviewPlayer
            hasAccess={false}
            courseSlug="tiktok-ai-affiliate"
            priceFormatted={coursePrice.formattedPrice}
            curriculumHref="/courses#curriculum"
            compact
          />
        </div>

        {/* Tools Section */}
        <main className="max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
          <AllInOneUpsellBanner variant="hero" tools={allTools} source="home_banner" />

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2.5 text-[var(--text-primary)]">
                <span className="text-[var(--accent)]">❖</span> เครื่องมือ Flow พร้อมใช้งาน
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                สำหรับลูกค้าที่ซื้อแล้ว กดปุ่ม &quot;เข้าสู่ระบบเพื่อใช้งาน&quot; เพื่อเปิดเครื่องมือของคุณได้ทันที
              </p>
            </div>
            <Link 
              href="/flow-tools" 
              className="text-xs text-[var(--accent)] hover:underline font-bold flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)]"
            >
              <span>เปิดดูมุมมองแยกหมวดหมู่</span>
              <span>→</span>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTools
              ?.filter(
                (t: any) =>
                  t.is_active &&
                  t.category !== 'course' &&
                  t.slug !== 'tiktok-ai-affiliate' &&
                  t.slug !== 'puppap-all-in-one'
              )
              ?.map((tool: any) => (
                <FlowToolCard key={tool.id} tool={tool} hasAccess={false} isLoggedIn={false} />
              ))}
          </div>
        </main>
        
        <footer className="text-center py-12 text-[var(--text-muted)] text-sm border-t border-[var(--border-light)] w-full max-w-6xl mt-12">
          © 2026 PUP PAP AI — คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม
        </footer>
      </div>
    )
  }

  // Dashboard (Parallelized queries to eliminate sequential waterfall)
  const [
    { data: profile },
    { data: initialUserTools },
    { data: rawAllTools },
    { data: announcements },
    { data: userTrials },
    { data: rawOrders },
    { data: emailKeys },
    { data: approvedOrders },
    bundleAccess,
  ] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role, display_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('user_tools').select(`id, user_id, tool_id, license_key_id, activated_at, is_active, tools(${PUBLIC_TOOL_SELECT_COLUMNS})`).eq('user_id', user.id),
    supabase.from('tools').select(PUBLIC_TOOL_SELECT_COLUMNS).order('sort_order'),
    supabase.from('announcements').select('id, title, content, tool_id, badge_text, badge_color, status, created_at').eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('user_trials').select('id, user_id, tool_id, status, started_at').eq('user_id', user.id),
    supabase
      .from('orders')
      .select('id, user_id, tool_id, status, admin_note, created_at, tools(name, slug)')
      .eq('user_id', user.id)
      .in('status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(5),
    user.email
      ? supabase
          .from('license_keys')
          .select('id, tool_id, status')
          .in('status', ['activated', 'revoked'])
          .ilike('activated_email', user.email)
      : Promise.resolve({ data: [] as any[] }),
    user.email
      ? supabase
          .from('orders')
          .select('tool_id, license_key_id')
          .eq('status', 'approved')
          .ilike('user_email', user.email)
      : Promise.resolve({ data: [] as any[] }),
    resolveUserBundleAccess(supabaseAdmin, user.id, user.email || ''),
  ])

  let userTools = initialUserTools
  const ownedSet = new Set<string>([
    ...(userTools || []).filter((ut: any) => ut.is_active !== false).map((ut: any) => ut.tool_id),
    ...(bundleAccess?.ownedToolIds || []),
  ])

  // Auto-heal entitlements: Course Bundle + any non-bundle activated keys/orders
  if (user.email) {
    let healed = false
    if (bundleAccess?.needsBackgroundSync) {
      const healRes = await attemptCourseBundleHeal(supabaseAdmin, user.id, user.email)
      if (healRes.healed) healed = true
    }

    const allEmailKeys = emailKeys || []
    const activatedToolIds = new Set(
      allEmailKeys.filter((k: any) => k.status === 'activated').map((k: any) => k.tool_id)
    )
    const revokedKeyIds = new Set(
      allEmailKeys.filter((k: any) => k.status === 'revoked').map((k: any) => k.id)
    )
    const revokedToolIds = new Set(
      allEmailKeys
        .filter((k: any) => k.status === 'revoked' && !activatedToolIds.has(k.tool_id))
        .map((k: any) => k.tool_id)
    )

    for (const k of allEmailKeys) {
      if (k.status === 'activated' && k.tool_id && !ownedSet.has(k.tool_id)) {
        await supabaseAdmin.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: k.tool_id,
            license_key_id: k.id,
            activated_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        )
        ownedSet.add(k.tool_id)
        healed = true
      }
    }
    for (const o of approvedOrders || []) {
      const isRevokedOrder =
        (o.license_key_id && revokedKeyIds.has(o.license_key_id)) ||
        revokedToolIds.has(o.tool_id)
      if (!isRevokedOrder && o.tool_id && !ownedSet.has(o.tool_id)) {
        await supabaseAdmin.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: o.tool_id,
            license_key_id: o.license_key_id || null,
            activated_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        )
        ownedSet.add(o.tool_id)
        healed = true
      }
    }
    if (healed) {
      const refreshed = await supabaseAdmin.from('user_tools').select(`id, user_id, tool_id, license_key_id, activated_at, is_active, tools(${PUBLIC_TOOL_SELECT_COLUMNS})`).eq('user_id', user.id)
      userTools = refreshed.data || userTools
    }
  }

  // Only show pending/rejected banners for tools the user does NOT already own
  const userOrders = (rawOrders || []).filter((o: any) => !ownedSet.has(o.tool_id))
  const trialSet = new Set((userTrials || []).map((tr: any) => tr.tool_id))
  const allTools = ((rawAllTools || []) as unknown as Tool[]).map((t) =>
    sanitizeToolForPublic(t, {
      session: null,
      hasAccess: ownedSet.has(t.id),
      isTrial: trialSet.has(t.id),
    })
  )

  return (
    <DashboardClient 
      user={user} 
      profile={profile} 
      userTools={userTools || []} 
      allTools={allTools || []} 
      announcements={announcements || []} 
      userTrials={userTrials || []} 
      userOrders={userOrders} 
    />
  )
}
