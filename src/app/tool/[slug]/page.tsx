import { createClient } from '@/lib/supabase/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ToolGuideClient from './ToolGuideClient'
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  getToolFlowLink,
  getToolTrialFlowLink,
  type Tool,
} from '@/lib/sanitize-tool'
import {
  resolveUserBundleAccess,
  attemptCourseBundleHeal,
} from '@/lib/course-bundle'

export const dynamic = 'force-dynamic'

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (slug === 'tiktok-ai-affiliate') {
    redirect('/course/tiktok-ai-affiliate')
  }
  if (slug === 'puppap-all-in-one') {
    redirect('/checkout/puppap-all-in-one')
  }

  const supabase = await createClient()
  const [{ data: { user } }, { data: tool }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('tools')
      .select(PUBLIC_TOOL_SELECT_COLUMNS)
      .eq('slug', slug)
      .single(),
  ])

  if (!tool) {
    redirect('/store')
  }

  let hasAccess = false
  const loggedIn = !!user
  let isTrial = false

  if (user) {
    const ADMIN_EMAILS = ['nilmat2007@gmail.com', 'nilmat200757@gmail.com']
    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      hasAccess = true
    }

    const bundleAccess = await resolveUserBundleAccess(supabaseAdmin, user.id, user.email || '')
    if (bundleAccess.ownedToolIds.includes(tool.id)) {
      hasAccess = true
    }
    if (bundleAccess.needsBackgroundSync) {
      await attemptCourseBundleHeal(supabaseAdmin, user.id, user.email || '')
    }

    if (!hasAccess && user.email) {
      // Auto-heal if user has an activated license key or approved order for this specific tool under their email
      const [{ data: keysList }, { data: approvedOrder }] = await Promise.all([
        supabase
          .from('license_keys')
          .select('id, status')
          .eq('tool_id', tool.id)
          .in('status', ['activated', 'revoked'])
          .ilike('activated_email', user.email),
        supabase
          .from('orders')
          .select('id, license_key_id')
          .eq('tool_id', tool.id)
          .eq('status', 'approved')
          .ilike('user_email', user.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      const existingKey = (keysList || []).find((k: any) => k.status === 'activated')
      const revokedKeyIds = new Set(
        (keysList || []).filter((k: any) => k.status === 'revoked').map((k: any) => k.id)
      )
      const hasRevokedKeyOnly = !existingKey && revokedKeyIds.size > 0
      const validOrder =
        approvedOrder &&
        !hasRevokedKeyOnly &&
        (!approvedOrder.license_key_id || !revokedKeyIds.has(approvedOrder.license_key_id))
          ? approvedOrder
          : null

      if (existingKey || validOrder) {
        hasAccess = true
        await supabaseAdmin.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: tool.id,
            license_key_id: existingKey?.id || validOrder?.license_key_id || null,
            activated_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        )
      }
    }

    if (!hasAccess && tool.is_active && !tool.is_coming_soon) {
      // เช็ค trial เฉพาะเครื่องมือที่เปิดใช้งานอยู่เท่านั้น (7-day expiry check)
      const { data: trial } = await supabaseAdmin
        .from('user_trials')
        .select('*')
        .eq('user_id', user.id)
        .eq('tool_id', tool.id)
        .eq('status', 'active')
        .maybeSingle()
      if (trial) {
        const startMs = new Date(trial.started_at || trial.created_at || Date.now()).getTime()
        const expiresMs = trial.expires_at
          ? new Date(trial.expires_at).getTime()
          : startMs + 7 * 24 * 60 * 60 * 1000
        if (expiresMs > Date.now()) {
          hasAccess = true
          isTrial = true
        } else {
          await supabaseAdmin.from('user_trials').update({ status: 'expired' }).eq('id', trial.id)
        }
      }
    }
  }

  // Block public/non-owners from viewing or buying disabled / coming-soon tools
  if ((!tool.is_active || tool.is_coming_soon) && !hasAccess) {
    redirect('/store')
  }

  const sanitizedTool = sanitizeToolForPublic(tool as unknown as Tool, {
    session: null,
    hasAccess: hasAccess && !isTrial,
    isTrial,
  })

  return (
    <ToolGuideClient
      slug={slug}
      hasAccess={hasAccess}
      loggedIn={loggedIn}
      userEmail={user?.email || ''}
      isTrial={isTrial}
      trialFlowUrl={getToolTrialFlowLink(sanitizedTool)}
      initialFlowUrl={getToolFlowLink(sanitizedTool)}
      initialTutorialVideoUrl={sanitizedTool.demo_video_url ? String(sanitizedTool.demo_video_url) : ''}
    />
  )
}
