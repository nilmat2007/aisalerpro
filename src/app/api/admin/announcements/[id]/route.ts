import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin_token')?.value

  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ announcement: data[0] })
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin_token')?.value

  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }



  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
