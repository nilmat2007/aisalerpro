import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ToolGuideClient from './ToolGuideClient'

export const dynamic = 'force-dynamic'

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hasAccess = false;
  let loggedIn = !!user;
  let isTrial = false;
  let trialFlowUrl = '';

  if (user) {
    const { data: tool } = await supabase.from('tools').select('id, trial_flow_url').eq('slug', slug).single()
    if (tool) {
      const { data: userTool } = await supabase
        .from('user_tools')
        .select('*')
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

      if (!hasAccess) {
        // เช็ค trial
        const { data: trial } = await supabase
          .from('user_trials')
          .select('*')
          .eq('user_id', user.id)
          .eq('tool_id', tool.id)
          .eq('status', 'active')
          .maybeSingle()
        if (trial) {
          hasAccess = true
          isTrial = true
          trialFlowUrl = tool.trial_flow_url || ''
        }
      }
    }
  }

  return (
    <ToolGuideClient
      slug={slug}
      hasAccess={hasAccess}
      loggedIn={loggedIn}
      userEmail={user?.email || ''}
      isTrial={isTrial}
      trialFlowUrl={trialFlowUrl}
    />
  )
}
