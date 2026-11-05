import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  attemptCourseBundleHeal,
  recordBundleHealFailure,
  BUNDLE_ERROR_CATALOG,
  extractRequestId,
  type BundleErrorCode,
} from '@/lib/course-bundle'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const requestId = extractRequestId(request)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED', requestId },
        { status: 401, headers: { 'X-Request-Id': requestId } }
      )
    }

    const result = await attemptCourseBundleHeal({
      userId: user.id,
      requestId,
      timeoutMs: 3000,
    })

    if (!result.ok) {
      const errCode = ((result as any).error || 'RPC_INTERNAL_ERROR') as BundleErrorCode
      const catalogEntry =
        BUNDLE_ERROR_CATALOG[errCode] || BUNDLE_ERROR_CATALOG.RPC_INTERNAL_ERROR

      if (
        errCode !== 'HEAL_COOLDOWN_ACTIVE' &&
        errCode !== 'HEAL_CIRCUIT_OPEN' &&
        errCode !== 'MAINTENANCE_MODE_ACTIVE'
      ) {
        await recordBundleHealFailure({
          userId: user.id,
          userEmail: user.email,
          errorDetail: errCode,
          requestId,
        })
      }

      const headers: Record<string, string> = { 'X-Request-Id': requestId }
      if (errCode === 'MAINTENANCE_MODE_ACTIVE') {
        headers['Retry-After'] = '120'
      } else if (errCode === 'HEAL_COOLDOWN_ACTIVE') {
        headers['Retry-After'] = '30'
      }

      return NextResponse.json(
        {
          ok: false,
          error: errCode,
          message: catalogEntry.messageTh,
          requestId,
        },
        { status: catalogEntry.httpStatus, headers }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        eligible: (result as any).eligible ?? false,
        healedCount: (result as any).healed_count ?? 0,
        bundleStateVersion: (result as any).bundle_state_version ?? 0,
        requestId,
      },
      { status: 200, headers: { 'X-Request-Id': requestId } }
    )
  } catch (err: any) {
    console.error(
      JSON.stringify({
        level: 'error',
        route: 'POST /api/bundle/sync',
        requestId,
        message: err?.message || 'Unknown error',
      })
    )
    return NextResponse.json(
      {
        ok: false,
        error: 'RPC_INTERNAL_ERROR',
        message: BUNDLE_ERROR_CATALOG.RPC_INTERNAL_ERROR.messageTh,
        requestId,
      },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    )
  }
}
