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
      const { data: userTool } = await supabase.from('user_tools').select('*').eq('user_id', user.id).eq('tool_id', tool.id).single()
      if (userTool) {
        hasAccess = true;
      } else {
        // เช็ค trial
        const { data: trial } = await supabase.from('user_trials').select('*').eq('user_id', user.id).eq('tool_id', tool.id).eq('status', 'active').maybeSingle()
        if (trial) {
          hasAccess = true;
          isTrial = true;
          trialFlowUrl = tool.trial_flow_url || '';
        }
      }
    }
  }

  return <ToolGuideClient slug={slug} hasAccess={hasAccess} loggedIn={loggedIn} isTrial={isTrial} trialFlowUrl={trialFlowUrl} />
}
