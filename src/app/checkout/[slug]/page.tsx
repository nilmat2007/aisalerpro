import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckoutClient from './CheckoutClient'

export const dynamic = 'force-dynamic';

export default async function CheckoutPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect(`/login?next=/checkout/${slug}`)
  
  const { data: tool } = await supabase.from('tools').select('*').eq('slug', slug).single()
  if (!tool) redirect('/store')

  // Check if user already owns this tool
  let alreadyOwned = false
  const { data: existingUserTool } = await supabase
    .from('user_tools')
    .select('id')
    .eq('user_id', user.id)
    .eq('tool_id', tool.id)
    .maybeSingle()

  if (existingUserTool) {
    alreadyOwned = true
  } else if (user.email) {
    // Also check if they have an activated key or approved order under their email
    const [{ data: existingKey }, { data: approvedOrder }] = await Promise.all([
      supabase
        .from('license_keys')
        .select('id')
        .eq('tool_id', tool.id)
        .eq('status', 'activated')
        .ilike('activated_email', user.email)
        .maybeSingle(),
      supabase
        .from('orders')
        .select('id, license_key_id')
        .eq('tool_id', tool.id)
        .eq('status', 'approved')
        .ilike('user_email', user.email)
        .maybeSingle(),
    ])

    if (existingKey || approvedOrder) {
      alreadyOwned = true
      await supabase.from('user_tools').upsert(
        {
          user_id: user.id,
          tool_id: tool.id,
          license_key_id: existingKey?.id || approvedOrder?.license_key_id || null,
          is_active: true,
        },
        { onConflict: 'user_id,tool_id' }
      )
    }
  }
  
  return (
    <CheckoutClient
      tool={tool}
      userEmail={user.email || ''}
      userId={user.id}
      alreadyOwned={alreadyOwned}
    />
  )
}
