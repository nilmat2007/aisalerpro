import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const params = await props.params
  const { status, title, content, tool_id, badge_text, badge_color } = await request.json()

  const updateData: any = {}
  if (status !== undefined) updateData.status = status
  if (title !== undefined) updateData.title = title
  if (content !== undefined) updateData.content = content
  if (tool_id !== undefined) updateData.tool_id = tool_id === 'null' ? null : tool_id
  if (badge_text !== undefined) updateData.badge_text = badge_text
  if (badge_color !== undefined) updateData.badge_color = badge_color

  const { data, error } = await supabase
    .from('announcements')
    .update(updateData)
    .eq('id', params.id)
    .select('id, title, content, tool_id, badge_text, badge_color, status, created_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ announcement: data?.[0] })
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const params = await props.params

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
