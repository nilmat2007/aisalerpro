import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, updated_at, display_name, avatar_url, is_blocked, last_login_at, user_tools(id, user_id, tool_id, license_key_id, activated_at, is_active, tools(name, slug))')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ members: data })
}
