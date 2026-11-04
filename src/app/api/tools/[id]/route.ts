import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  type PublicTool,
  type Tool,
} from '@/lib/sanitize-tool'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PublicTool | { error: string }>> {
  const resolvedParams = await params
  const session = await getSession()

  const { data, error } = await supabase
    .from('tools')
    .select(PUBLIC_TOOL_SELECT_COLUMNS)
    .eq('id', resolvedParams.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Tool not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  const hasAccess = Boolean(session?.is_admin)
  const sanitized = sanitizeToolForPublic(data as unknown as Tool, {
    session,
    hasAccess,
    isTrial: false,
  })

  return NextResponse.json(sanitized)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const resolvedParams = await params
    const body = await request.json()

    const { id, created_at, ...updateData } = body
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tools')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select(PUBLIC_TOOL_SELECT_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const sanitized = sanitizeToolForPublic(data as unknown as Tool, {
      session: auth.session,
      hasAccess: true,
      isTrial: false,
    })
    return NextResponse.json(sanitized)
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const resolvedParams = await params
  const { error } = await supabase
    .from('tools')
    .delete()
    .eq('id', resolvedParams.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
