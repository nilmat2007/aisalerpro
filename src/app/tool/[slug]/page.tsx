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

  if (user) {
    const { data: tool } = await supabase.from('tools').select('id').eq('slug', slug).single()
    if (tool) {
      const { data: userTool } = await supabase.from('user_tools').select('*').eq('user_id', user.id).eq('tool_id', tool.id).single()
      if (userTool) {
        hasAccess = true;
      }
    }
  }

  return <ToolGuideClient slug={slug} hasAccess={hasAccess} loggedIn={loggedIn} />
}
