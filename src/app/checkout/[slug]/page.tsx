import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckoutClient from './CheckoutClient'

export default async function CheckoutPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  const { data: tool } = await supabase.from('tools').select('*').eq('slug', slug).single()
  if (!tool) redirect('/store')
  
  return <CheckoutClient tool={tool} userEmail={user.email || ''} userId={user.id} />
}
