import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  type PublicTool,
  type Tool,
} from '@/lib/sanitize-tool'

export async function GET(): Promise<NextResponse<PublicTool[] | { error: string }>> {
  const { data, error } = await supabase
    .from('tools')
    .select(PUBLIC_TOOL_SELECT_COLUMNS)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tools = ((data || []) as unknown as Tool[]).map((tool) =>
    sanitizeToolForPublic(tool, {
      session: null,
      hasAccess: false,
      isTrial: false,
    })
  )

  return NextResponse.json(tools)
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const body = await request.json()
  const toolData = {
    ...body,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('tools')
    .insert(toolData)
    .select(PUBLIC_TOOL_SELECT_COLUMNS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sanitized = sanitizeToolForPublic(data as unknown as Tool, {
    session: auth.session,
    hasAccess: true,
    isTrial: false,
  })
  return NextResponse.json(sanitized, { status: 201 })
}
