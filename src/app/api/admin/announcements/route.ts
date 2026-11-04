import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, tool_id, badge_text, badge_color, status, created_at, tools(name, slug)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ announcements: data })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { title, content, tool_id, badge_text, badge_color } = await request.json()

  const insertData: any = {
    title,
    content,
    tool_id: tool_id === 'null' ? null : tool_id,
    badge_text,
    badge_color,
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert(insertData)
    .select('id, title, content, tool_id, badge_text, badge_color, status, created_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ announcement: data?.[0] })
}
