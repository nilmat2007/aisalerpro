import { createClient } from '@/lib/supabase/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import CheckoutClient from './CheckoutClient'
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  type Tool,
} from '@/lib/sanitize-tool'
import {
  resolveUserBundleAccess,
  attemptCourseBundleHeal,
  getCourseBundleToolIds,
} from '@/lib/course-bundle'

export const dynamic = 'force-dynamic';

export default async function CheckoutPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect(`/login?next=/checkout/${slug}`)
  
  const { data: tool } = await supabase
    .from('tools')
    .select(PUBLIC_TOOL_SELECT_COLUMNS)
    .eq('slug', slug)
    .single()
  if (!tool) redirect('/store')

  // Check if user already owns this tool (including via Course Bundle)
  let alreadyOwned = false
  const bundleAccess = await resolveUserBundleAccess(supabaseAdmin, user.id, user.email || '')
  if (bundleAccess.ownedToolIds.includes(tool.id)) {
    alreadyOwned = true
  }
  if (bundleAccess.needsBackgroundSync) {
    await attemptCourseBundleHeal(supabaseAdmin, user.id, user.email || '')
  }

  if (!alreadyOwned && user.email) {
    // Also check if they have an activated key or approved order for this specific tool under their email
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
      alreadyOwned = true
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

  if (!alreadyOwned && (!tool.is_active || (tool.is_coming_soon && tool.slug !== 'tiktok-ai-affiliate'))) {
    redirect('/store')
  }

  // Check if user has a pending or recently rejected order for this tool (or bundle)
  let initialOrder: any = null
  if (!alreadyOwned) {
    const bundleInfo = await getCourseBundleToolIds(supabaseAdmin)
    const targetIds = bundleInfo.bundleIds.includes(tool.id) ? bundleInfo.bundleIds : [tool.id]
    const { data: latestOrder } = await supabase
      .from('orders')
      .select('id, status, slip_url, admin_note, created_at')
      .eq('user_id', user.id)
      .in('tool_id', targetIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOrder) {
      initialOrder = latestOrder
    }
  }

  const sanitizedTool = sanitizeToolForPublic(tool as unknown as Tool, {
    session: null,
    hasAccess: alreadyOwned,
    isTrial: false,
  })
  
  return (
    <CheckoutClient
      tool={sanitizedTool}
      userEmail={user.email || ''}
      userId={user.id}
      alreadyOwned={alreadyOwned}
      initialOrder={initialOrder}
    />
  )
}
