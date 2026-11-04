import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ToolGuideClient from './ToolGuideClient'
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  getToolFlowLink,
  getToolTrialFlowLink,
  type Tool,
} from '@/lib/sanitize-tool'

export const dynamic = 'force-dynamic'

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (slug === 'tiktok-ai-affiliate') {
    redirect('/course/tiktok-ai-affiliate')
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
    const { data: userTool } = await supabase
      .from('user_tools')
      .select('id, user_id, tool_id, is_active')
      .eq('user_id', user.id)
      .eq('tool_id', tool.id)
      .maybeSingle()

    if (userTool) {
      hasAccess = true
    } else if (user.email) {
      // Auto-heal if user has an activated license key or approved order for this tool under their email
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
        await supabase.from('user_tools').upsert(
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
      // เช็ค trial เฉพาะเครื่องมือที่เปิดใช้งานอยู่เท่านั้น
      const { data: trial } = await supabase
        .from('user_trials')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('tool_id', tool.id)
        .eq('status', 'active')
        .maybeSingle()
      if (trial) {
        hasAccess = true
        isTrial = true
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
    />
  )
}
