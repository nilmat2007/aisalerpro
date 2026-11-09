import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/require-admin'
import { syncAllInOneEntitlements } from '@/lib/course-bundle'
import {
  ADMIN_TOOL_SELECT_COLUMNS,
  PUBLIC_TOOL_SELECT_COLUMNS,
  mergePreservedSensitiveToolFields,
  sanitizeToolForPublic,
  type PublicTool,
  type Tool,
} from '@/lib/sanitize-tool'

function safeRevalidateToolPaths(slug?: string | null) {
  try {
    revalidatePath('/')
    revalidatePath('/store')
    revalidatePath('/flow-tools')
    revalidatePath('/courses')
    if (slug) {
      revalidatePath(`/tool/${slug}`)
      revalidatePath(`/course/${slug}`)
    }
  } catch {
    // No-op outside Next.js request context (e.g. unit tests)
  }
}

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

    const { id, created_at, ...rawUpdateData } = body
    rawUpdateData.updated_at = new Date().toISOString()

    // Belt-and-suspenders guard (paired with GET /api/tools?admin=1):
    // Fetch existing row before updating so any sanitized placeholder (e.g. video_url='locked',
    // prompts=null, or omitted guide_drive_url / demo_video_url) never overwrites real DB data.
    let existingTool: Record<string, any> | null = null
    try {
      const selectQuery: any = supabase.from('tools')?.select?.(ADMIN_TOOL_SELECT_COLUMNS)
      if (selectQuery && typeof selectQuery.eq === 'function') {
        const eqQuery = selectQuery.eq('id', resolvedParams.id)
        const res =
          typeof eqQuery?.maybeSingle === 'function'
            ? await eqQuery.maybeSingle()
            : typeof eqQuery?.single === 'function'
              ? await eqQuery.single()
              : null
        if (res?.data) {
          existingTool = res.data
        }
      }
    } catch {
      existingTool = null
    }

    const updateData = mergePreservedSensitiveToolFields(existingTool, rawUpdateData)

    const { data, error } = await supabase
      .from('tools')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select(PUBLIC_TOOL_SELECT_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Proactively sync All-in-One 999 members if tool was activated or included
    await syncAllInOneEntitlements(supabase)

    safeRevalidateToolPaths((data as any)?.slug || existingTool?.slug)

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
  safeRevalidateToolPaths()
  return NextResponse.json({ success: true })
}
