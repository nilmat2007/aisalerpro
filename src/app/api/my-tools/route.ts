import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  type Tool,
} from '@/lib/sanitize-tool'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query user_tools joined with tools table using explicit allow-list
    const { data, error } = await supabase
      .from('user_tools')
      .select(`id, user_id, tool_id, license_key_id, activated_at, is_active, tools(${PUBLIC_TOOL_SELECT_COLUMNS})`)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const sanitizedData = (data || []).map((row: any) => ({
      ...row,
      tools: row.tools
        ? sanitizeToolForPublic(row.tools as unknown as Tool, {
            session: null,
            hasAccess: Boolean(row.is_active),
            isTrial: false,
          })
        : null,
    }))

    return NextResponse.json({ success: true, data: sanitizedData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
