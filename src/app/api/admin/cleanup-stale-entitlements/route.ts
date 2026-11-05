import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  approveOrderAndGrantBundle,
  BUNDLE_ERROR_CATALOG,
  extractRequestId,
  isPersistentGrantError,
  sanitizeRpcResponseForClient,
  type BundleErrorCode,
} from '@/lib/course-bundle'
import { notifyBundleGrantFailure } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

async function verifyAdminOrCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization')?.trim()
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  const adminAuth = await requireAdmin()
  return adminAuth.ok
}

export async function GET(request: Request) {
  const requestId = extractRequestId(request)
  const authorized = await verifyAdminOrCronAuth(request)
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', requestId },
      { status: 401, headers: { 'X-Request-Id': requestId } }
    )
  }

  try {
    const cutoffIso = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    // Read-only Dry-Run: inspect orphan activated keys (> 15 mins old) and stale pending orders
    const [{ data: activeKeys }, { data: userTools }, { data: activeOrders }, { data: staleOrders }] =
      await Promise.all([
        supabase
          .from('license_keys')
          .select('id, activated_by, tool_id, created_at, activated_at')
          .eq('status', 'activated')
          .not('activated_by', 'is', null)
          .lt('created_at', cutoffIso),
        supabase.from('user_tools').select('license_key_id').not('license_key_id', 'is', null),
        supabase
          .from('orders')
          .select('license_key_id, status')
          .in('status', ['approved', 'pending'])
          .not('license_key_id', 'is', null),
        supabase
          .from('orders')
          .select('id, user_id, user_email, tool_id, admin_note, created_at')
          .eq('status', 'pending')
          .ilike('admin_note', '%[GRANT_RETRY_NEEDED]%')
          .lt('created_at', cutoffIso),
      ])

    const referencedByUt = new Set((userTools || []).map((u) => u.license_key_id))
    const referencedByOrd = new Set((activeOrders || []).map((o) => o.license_key_id))

    const orphanKeys = (activeKeys || []).filter(
      (k) => !referencedByUt.has(k.id) && !referencedByOrd.has(k.id)
    )

    return NextResponse.json(
      {
        ok: true,
        dryRun: true,
        orphanKeysCount: orphanKeys.length,
        stalePendingOrdersCount: (staleOrders || []).length,
        stalePendingOrderIds: (staleOrders || []).map((o) => o.id),
        requestId,
      },
      { status: 200, headers: { 'X-Request-Id': requestId } }
    )
  } catch (err: any) {
    console.error('[GET /api/admin/cleanup-stale-entitlements] error:', err)
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

export async function POST(request: Request) {
  const requestId = extractRequestId(request)
  const authorized = await verifyAdminOrCronAuth(request)
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', requestId },
      { status: 401, headers: { 'X-Request-Id': requestId } }
    )
  }

  const startWallClock = Date.now()
  let totalUsersProcessed = 0
  let totalOrphanKeysRevoked = 0
  let remainingOrphanKeysCount = 0
  let stalePendingOrderIds: string[] = []
  let roundsExecuted = 0

  try {
    // Self-Draining Multi-Batch: up to 2 rounds if remainingOrphanKeysCount > 0 and elapsed < 5000ms
    for (let round = 1; round <= 2; round++) {
      roundsExecuted = round
      const { data, error } = await supabase.rpc('cleanup_stale_bundle_entitlements', {
        p_request_id: requestId,
      })

      if (error) {
        if (error.code === 'PGRST202' || error.code === '42883') {
          break
        }
        const errCode = (error.code === '57014' ? 'RPC_TIMEOUT' : 'RPC_INTERNAL_ERROR') as BundleErrorCode
        return NextResponse.json(
          {
            ok: false,
            error: errCode,
            message: BUNDLE_ERROR_CATALOG[errCode].messageTh,
            requestId,
          },
          { status: BUNDLE_ERROR_CATALOG[errCode].httpStatus, headers: { 'X-Request-Id': requestId } }
        )
      }

      const cleanRes = sanitizeRpcResponseForClient(
        data as any,
        requestId,
        'cleanup_stale_bundle_entitlements'
      )

      if (!cleanRes.ok) {
        const errCode = ((cleanRes as any).error || 'RPC_INTERNAL_ERROR') as BundleErrorCode
        const catalogEntry =
          BUNDLE_ERROR_CATALOG[errCode] || BUNDLE_ERROR_CATALOG.RPC_INTERNAL_ERROR
        const headers: Record<string, string> = { 'X-Request-Id': requestId }
        if (errCode === 'MAINTENANCE_MODE_ACTIVE') {
          headers['Retry-After'] = '120'
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

      totalUsersProcessed += Number((cleanRes as any).users_processed || 0)
      totalOrphanKeysRevoked += Number((cleanRes as any).orphan_keys_revoked || 0)
      remainingOrphanKeysCount = Number((cleanRes as any).remaining_orphan_keys_count || 0)
      if (round === 1 && Array.isArray((cleanRes as any).stale_pending_order_ids)) {
        stalePendingOrderIds = (cleanRes as any).stale_pending_order_ids
      }

      if (remainingOrphanKeysCount === 0 || Date.now() - startWallClock >= 5000) {
        break
      }
    }

    // Node.js Orchestrator for Stale Pending Orders Auto-Retry (1 independent transaction per order)
    let autoRetriedOrdersSucceeded = 0
    let autoRetriedOrdersFailed = 0
    let stalePendingOrdersExhausted = 0

    for (const orderId of stalePendingOrderIds) {
      if (Date.now() - startWallClock >= 7500) break

      const approveRes = await approveOrderAndGrantBundle({
        orderId,
        approvedBy: null,
        approvedByActor: 'system:cleanup_retry',
        requestId,
      })

      if (approveRes.ok) {
        autoRetriedOrdersSucceeded++
      } else {
        autoRetriedOrdersFailed++
        const errCode = approveRes.error || 'RPC_INTERNAL_ERROR'
        const persistent = isPersistentGrantError(errCode)

        const { data: ordRow } = await supabase
          .from('orders')
          .select('id, user_id, user_email, admin_note, grant_retry_count')
          .eq('id', orderId)
          .maybeSingle()

        const prevCount = Number((ordRow as any)?.grant_retry_count || 0)
        const nextCount = prevCount + 1
        const exhausted = persistent || nextCount >= 3

        const tag = persistent
          ? `[PERSISTENT_GRANT_ERROR:${errCode}]`
          : exhausted
            ? `[MANUAL_INTERVENTION_REQUIRED:${errCode}]`
            : `[AUTO_RETRY_COUNT:${nextCount}:${errCode}]`

        const updatedNote = ordRow?.admin_note
          ? `${ordRow.admin_note} | ${tag}`
          : tag

        await supabase
          .from('orders')
          .update({
            grant_retry_count: nextCount,
            grant_retry_exhausted: exhausted,
            last_grant_error: errCode,
            admin_note: updatedNote,
          })
          .eq('id', orderId)

        if (exhausted) {
          stalePendingOrdersExhausted++
          await notifyBundleGrantFailure({
            orderId,
            userId: ordRow?.user_id,
            userEmail: ordRow?.user_email,
            errorCode: persistent
              ? `PERSISTENT_GRANT_ERROR_${errCode}`
              : 'STALE_PENDING_ORDER_EXHAUSTED',
            errorMessage: persistent
              ? `Persistent error (${errCode}) — stopped retrying immediately.`
              : `Exhausted 3 auto-retries (last error: ${errCode}). Manual intervention required in /admin/orders.`,
            requestId,
            context: 'POST /api/admin/cleanup-stale-entitlements',
          })
        }
      }
    }

    // Backlog Escalation Alerts (Tier 1 > 100, Tier 2 > 500)
    if (remainingOrphanKeysCount > 500) {
      await notifyBundleGrantFailure({
        errorCode: 'CLEANUP_BACKLOG_CRITICAL',
        errorMessage: `Remaining orphan keys backlog is ${remainingOrphanKeysCount} (> 500). Consider increasing cleanup cron frequency to every 15 minutes.`,
        requestId,
        context: 'POST /api/admin/cleanup-stale-entitlements',
      })
    } else if (remainingOrphanKeysCount > 100) {
      await notifyBundleGrantFailure({
        errorCode: 'CLEANUP_BACKLOG_WARNING',
        errorMessage: `Remaining orphan keys backlog is ${remainingOrphanKeysCount} (> 100).`,
        requestId,
        context: 'POST /api/admin/cleanup-stale-entitlements',
      })
    }

    return NextResponse.json(
      {
        ok: true,
        roundsExecuted,
        usersProcessed: totalUsersProcessed,
        orphanKeysRevoked: totalOrphanKeysRevoked,
        remainingOrphanKeysCount,
        hasMore: remainingOrphanKeysCount > 0,
        stalePendingOrdersCount: stalePendingOrderIds.length,
        autoRetriedOrdersSucceeded,
        autoRetriedOrdersFailed,
        stalePendingOrdersExhausted,
        requestId,
      },
      { status: 200, headers: { 'X-Request-Id': requestId } }
    )
  } catch (err: any) {
    console.error('[POST /api/admin/cleanup-stale-entitlements] error:', err)
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
