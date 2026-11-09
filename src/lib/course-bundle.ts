import { cache } from 'react'
import { supabase as defaultSupabaseAdmin } from '@/lib/supabase'
import { notifyBundleGrantFailure } from '@/lib/telegram'
import type { SupabaseClient } from '@supabase/supabase-js'

export const COURSE_BUNDLE_SLUGS = [
  'tiktok-ai-affiliate',
  'puppap-fashion-studio',
  'puppap-ugc-product',
] as const

export const COURSE_BUNDLE_BONUS_TOOL_SLUGS = [
  'puppap-fashion-studio',
  'puppap-ugc-product',
] as const

export const ALL_IN_ONE_SLUG = 'puppap-all-in-one' as const

/**
 * List of tool/course slugs explicitly excluded from the ฿999 All-in-One package.
 * Admin can also toggle `features.exclude_from_all_in_one = true` per tool in `/admin/tools`.
 */
export const EXCLUDED_FROM_ALL_IN_ONE_SLUGS: readonly string[] = []

export type CourseBundleSlug = (typeof COURSE_BUNDLE_SLUGS)[number]

export const COURSE_BUNDLE_GUIDE_DRIVE_URL =
  'https://drive.google.com/drive/folders/1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA?usp=drive_link'

export const VALID_REVOKE_REASONS = [
  'admin_revoke',
  'refund',
  'chargeback',
  'duplicate_cancel',
  'false_slip',
  'duplicate_test',
] as const

export type RevokeReason = (typeof VALID_REVOKE_REASONS)[number]

export type BundleErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_ALREADY_REJECTED'
  | 'ORDER_NOT_APPROVED'
  | 'INVALID_REVOKE_REASON'
  | 'LICENSE_KEY_NOT_FOUND'
  | 'TOOL_NOT_FOUND'
  | 'PROFILE_NOT_FOUND'
  | 'MAINTENANCE_MODE_ACTIVE'
  | 'ADVISORY_LOCK_TIMEOUT'
  | 'RPC_TIMEOUT'
  | 'HEAL_COOLDOWN_ACTIVE'
  | 'HEAL_CIRCUIT_OPEN'
  | 'RPC_INTERNAL_ERROR'

export const BUNDLE_ERROR_CATALOG: Record<
  BundleErrorCode,
  { httpStatus: number; messageTh: string }
> = {
  ORDER_NOT_FOUND: {
    httpStatus: 404,
    messageTh: 'ไม่พบข้อมูลคำสั่งซื้อในระบบ กรุณาตรวจสอบรหัสคำสั่งซื้ออีกครั้ง',
  },
  ORDER_ALREADY_REJECTED: {
    httpStatus: 409,
    messageTh: 'คำสั่งซื้อนี้ถูกปฏิเสธหรือยกเลิกสิทธิ์ไปแล้ว ไม่สามารถอนุมัติซ้ำได้',
  },
  ORDER_NOT_APPROVED: {
    httpStatus: 400,
    messageTh: 'สถานะคำสั่งซื้อนี้ไม่สามารถทำการยกเลิกสิทธิ์ได้',
  },
  INVALID_REVOKE_REASON: {
    httpStatus: 400,
    messageTh:
      'ระบุเหตุผลการยกเลิกคำสั่งซื้อไม่ถูกต้อง (ต้องเป็น admin_revoke, refund, chargeback หรือ duplicate_cancel)',
  },
  LICENSE_KEY_NOT_FOUND: {
    httpStatus: 404,
    messageTh: 'ไม่พบรหัสปลดล็อกนี้ในระบบ กรุณาตรวจสอบตัวอักษรอีกครั้ง',
  },
  TOOL_NOT_FOUND: {
    httpStatus: 404,
    messageTh: 'ไม่พบข้อมูลเครื่องมือในระบบ',
  },
  PROFILE_NOT_FOUND: {
    httpStatus: 404,
    messageTh: 'ไม่พบข้อมูลโปรไฟล์สมาชิกในระบบ',
  },
  MAINTENANCE_MODE_ACTIVE: {
    httpStatus: 503,
    messageTh: 'ระบบกำลังปรับปรุงฐานข้อมูลชั่วคราว กรุณารอประมาณ 2 นาทีแล้วลองใหม่อีกครั้งครับ',
  },
  ADVISORY_LOCK_TIMEOUT: {
    httpStatus: 409,
    messageTh:
      'ระบบกำลังประมวลผลรายการของคุณอยู่ กรุณารอสักครู่แล้วรีเฟรชหน้าเว็บ (ห้ามโอนเงินซ้ำ)',
  },
  RPC_TIMEOUT: {
    httpStatus: 503,
    messageTh:
      'ระบบใช้เวลาประมวลผลนานกว่าปกติและกำลังซิงก์สิทธิ์ให้อัตโนมัติ (กรุณาอย่าโอนเงินซ้ำ)',
  },
  HEAL_COOLDOWN_ACTIVE: {
    httpStatus: 429,
    messageTh: 'ระบบกำลังซิงก์สิทธิ์ให้คุณอยู่ กรุณารอประมาณ 30 วินาทีแล้วลองอีกครั้งครับ',
  },
  HEAL_CIRCUIT_OPEN: {
    httpStatus: 503,
    messageTh:
      'ระบบซิงก์สิทธิ์อัตโนมัติขัดข้องชั่วคราว กรุณาทักแชทติดต่อแอดมินเพื่อเปิดสิทธิ์ด่วนทันทีครับ',
  },
  RPC_INTERNAL_ERROR: {
    httpStatus: 500,
    messageTh:
      'ระบบได้รับข้อมูลการชำระเงินแล้วและกำลังซิงก์สิทธิ์ให้อัตโนมัติ (กรุณาอย่าโอนเงินซ้ำ)',
  },
}

export function isCourseBundleSlug(slug?: string | null): slug is CourseBundleSlug {
  if (!slug) return false
  return (COURSE_BUNDLE_SLUGS as readonly string[]).includes(slug)
}

export function isAllInOneSlug(slug?: string | null): boolean {
  if (!slug) return false
  return slug === ALL_IN_ONE_SLUG
}

/**
 * Determines whether a tool/course row should be unlocked by the ฿999 All-in-One package
 * (including any future tools added to `public.tools`), unless explicitly excluded via
 * `features.exclude_from_all_in_one === true` or `EXCLUDED_FROM_ALL_IN_ONE_SLUGS`.
 */
export function isToolEligibleForAllInOne(tool: {
  id?: string | null
  slug?: string | null
  is_active?: boolean | null
  is_coming_soon?: boolean | null
  features?: any
} | null | undefined): boolean {
  if (!tool || !tool.slug) return false
  if (tool.is_active === false) return false
  if (
    tool.is_coming_soon === true &&
    tool.slug !== 'tiktok-ai-affiliate' &&
    tool.slug !== ALL_IN_ONE_SLUG
  ) {
    return false
  }
  if ((EXCLUDED_FROM_ALL_IN_ONE_SLUGS as readonly string[]).includes(tool.slug)) {
    return false
  }
  const feat =
    tool.features && typeof tool.features === 'object' && !Array.isArray(tool.features)
      ? tool.features
      : null
  if (feat?.exclude_from_all_in_one === true) {
    return false
  }
  return true
}

export async function getAllInOneEligibleTools(
  sb: SupabaseClient = defaultSupabaseAdmin
): Promise<{ id: string; slug: string; is_active?: boolean; is_coming_soon?: boolean; features?: any }[]> {
  try {
    const toolsTable: any = sb.from?.('tools')
    if (typeof toolsTable?.select !== 'function') return []
    const selectChain = toolsTable.select('id, slug, is_active, is_coming_soon, features')
    const eqChain = selectChain?.eq?.('is_active', true)
    let rows: any[] = []
    if (eqChain && typeof eqChain.then === 'function') {
      const { data } = await eqChain
      rows = Array.isArray(data) ? data : []
    } else if (Array.isArray((sb as any)?._state?.tools)) {
      rows = (sb as any)._state.tools
    }
    return rows.filter((t) => isToolEligibleForAllInOne(t))
  } catch {
    return []
  }
}

/**
 * Proactively syncs/backfills `user_tools` for all members who own `puppap-all-in-one`
 * whenever a new tool is created or updated in `/admin/tools` (unless excluded).
 */
export async function syncAllInOneEntitlements(
  sb: SupabaseClient = defaultSupabaseAdmin,
  specificUserId?: string
): Promise<{ syncedCount: number }> {
  try {
    const eligibleTools = await getAllInOneEligibleTools(sb)
    const allInOneTool = eligibleTools.find((t) => t.slug === ALL_IN_ONE_SLUG)
    if (!allInOneTool || eligibleTools.length === 0) {
      return { syncedCount: 0 }
    }

    const utQuery = sb
      .from('user_tools')
      .select('user_id, license_key_id')
      .eq('tool_id', allInOneTool.id)
      .eq('is_active', true)
    const ordQuery = sb
      .from('orders')
      .select('user_id, license_key_id')
      .eq('tool_id', allInOneTool.id)
      .eq('status', 'approved')

    const [{ data: utOwners }, { data: ordOwners }] = await Promise.all([
      specificUserId ? utQuery.eq('user_id', specificUserId) : utQuery,
      specificUserId ? ordQuery.eq('user_id', specificUserId) : ordQuery,
    ])

    const userToKeyMap = new Map<string, string | null>()
    for (const row of [...(utOwners || []), ...(ordOwners || [])]) {
      if (row?.user_id) {
        if (!userToKeyMap.has(row.user_id) || row.license_key_id) {
          userToKeyMap.set(row.user_id, row.license_key_id || null)
        }
      }
    }

    if (userToKeyMap.size === 0) {
      return { syncedCount: 0 }
    }

    let syncedCount = 0
    for (const [uid, keyId] of userToKeyMap.entries()) {
      for (const tool of eligibleTools) {
        await sb.from('user_tools').upsert(
          {
            user_id: uid,
            tool_id: tool.id,
            license_key_id: keyId,
            is_active: true,
            activated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,tool_id' }
        )
        syncedCount++
      }
      invalidateUserBundleCache(uid)
    }

    return { syncedCount }
  } catch {
    return { syncedCount: 0 }
  }
}

export function isValidRevokeReason(reason?: string | null): reason is RevokeReason {
  if (!reason) return false
  return (VALID_REVOKE_REASONS as readonly string[]).includes(reason)
}

export function isPersistentGrantError(errorCode?: string | null): boolean {
  if (!errorCode) return false
  return (
    errorCode === 'ORDER_NOT_FOUND' ||
    errorCode === 'ORDER_ALREADY_REJECTED' ||
    errorCode === 'TOOL_NOT_FOUND' ||
    errorCode === 'PROFILE_NOT_FOUND' ||
    errorCode === 'INVALID_USER_OR_TOOL' ||
    errorCode === 'FOREIGN_KEY_VIOLATION'
  )
}

export function extractRequestId(req?: Request | null, fallbackId?: string): string {
  if (fallbackId && fallbackId.trim()) return fallbackId.trim()
  if (req) {
    const xReqId = req.headers.get('x-request-id')?.trim()
    if (xReqId) return xReqId
    const xVercelId = req.headers.get('x-vercel-id')?.trim()
    if (xVercelId) return xVercelId
  }
  return crypto.randomUUID()
}

export function formatSharedKeyRevokeMessage(params: {
  revokeReason: RevokeReason | string
  orderId: string
  keptActiveViaOrderId: string
  audience: 'admin' | 'customer'
}): string {
  const shortOrderId = params.orderId.slice(0, 8)
  const shortSurvivingId = params.keptActiveViaOrderId.slice(0, 8)

  if (params.revokeReason === 'refund') {
    return params.audience === 'admin'
      ? `💸 บันทึกการคืนเงิน (Refund) สำหรับคำสั่งซื้อ #${shortOrderId} เรียบร้อยแล้ว — สิทธิ์ของลูกค้ายังคงเปิดใช้งานต่อเนื่องผ่านคำสั่งซื้อหลักหมายเลข #${shortSurvivingId}`
      : `💸 ดำเนินการคืนเงินสำหรับคำสั่งซื้อซ้ำ #${shortOrderId} เรียบร้อยแล้ว โดยสิทธิ์การใช้งานคอร์สและเครื่องมือ AI ทั้งหมดของคุณยังคงใช้งานได้ตามปกติผ่านคำสั่งซื้อ #${shortSurvivingId} ครับ`
  }

  if (params.revokeReason === 'chargeback') {
    return `⚠️ บันทึกข้อพิพาทการชำระเงิน (Chargeback) คำสั่งซื้อ #${shortOrderId} แล้ว — สมาชิกยังมีคำสั่งซื้ออื่นที่อนุมัติอยู่ (#${shortSurvivingId}) กรุณาตรวจสอบว่าต้องการระงับบัญชีเพิ่มเติมหรือไม่`
  }

  return params.audience === 'admin'
    ? `ℹ️ คำสั่งซื้อ #${shortOrderId} ถูกยกเลิกโดยแอดมินแล้ว แต่สมาชิกยังคงมีสิทธิ์ใช้งานต่อผ่านคำสั่งซื้อที่อนุมัติหมายเลข #${shortSurvivingId}`
    : `คำสั่งซื้อซ้ำ #${shortOrderId} ถูกยกเลิกแล้ว โดยสิทธิ์การใช้งานคอร์สและเครื่องมือ AI ทั้ง 3 รายการของคุณยังคงเปิดใช้งานตามปกติผ่านคำสั่งซื้อ #${shortSurvivingId} ครับ`
}

export function formatActorBadgeLabel(actor?: string | null): string {
  if (!actor) return '👤 อนุมัติโดยระบบ'
  if (actor === 'system:auto_slip') return '🤖 อนุมัติอัตโนมัติ (AI Slip)'
  if (actor.startsWith('telegram:')) return '✈️ อนุมัติผ่าน Telegram'
  if (actor === 'system:cleanup_retry') return '🔄 อนุมัติผ่านระบบ Auto-Retry'
  if (actor.startsWith('admin:')) return '👤 อนุมัติโดยแอดมิน'
  return '👤 อนุมัติโดยระบบ'
}

/**
 * Strips internal PostgreSQL diagnostics (_internal_sqlstate, _internal_sqlerrm, detail, sqlstate)
 * after logging them server-side so zero schema details ever leak to HTTP clients.
 */
export function sanitizeRpcResponseForClient<T extends Record<string, any>>(
  raw: T | null | undefined,
  requestId: string,
  rpcName: string
): Omit<T, '_internal_sqlstate' | '_internal_sqlerrm' | 'detail' | 'sqlstate'> & {
  requestId: string
} {
  const safeObj: Record<string, any> = { ...(raw || {}) }
  const internalSqlState = safeObj._internal_sqlstate || safeObj.sqlstate
  const internalSqlErrm = safeObj._internal_sqlerrm || safeObj.detail

  if (internalSqlState || internalSqlErrm) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'RPC_INTERNAL_DIAGNOSTIC',
        rpcName,
        requestId,
        sqlstate: internalSqlState,
        sqlerrm: internalSqlErrm,
        timestamp: new Date().toISOString(),
      })
    )
  }

  delete safeObj._internal_sqlstate
  delete safeObj._internal_sqlerrm
  delete safeObj.detail
  delete safeObj.sqlstate

  const resolvedReqId = safeObj.request_id || safeObj.requestId || requestId
  safeObj.requestId = resolvedReqId
  return safeObj as any
}

function generateLicenseCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'PHM-'
  for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  result += '-'
  for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  return result
}

// =============================================================================
// Versioned LRU Cache for Bundle Sync (MAX_CACHE_ENTRIES = 500, TTL = 60s)
// Scoped strictly to user_tools access via profiles.bundle_state_version
// =============================================================================
interface BundleSyncCacheEntry {
  version: number
  ownedToolIds: string[]
  ownedSlugs: string[]
  hasFullBundle: boolean
  cachedAt: number
}

const MAX_CACHE_ENTRIES = 500
const CACHE_TTL_MS = 60_000
export const BUNDLE_SYNC_CACHE = new Map<string, BundleSyncCacheEntry>()

export function getCachedBundleAccess(
  userId: string,
  currentVersion: number
): BundleSyncCacheEntry | null {
  const entry = BUNDLE_SYNC_CACHE.get(userId)
  if (!entry) return null
  if (entry.version !== currentVersion || Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    BUNDLE_SYNC_CACHE.delete(userId)
    return null
  }
  // Refresh LRU order
  BUNDLE_SYNC_CACHE.delete(userId)
  BUNDLE_SYNC_CACHE.set(userId, entry)
  return entry
}

export function setCachedBundleAccess(userId: string, entry: BundleSyncCacheEntry): void {
  if (BUNDLE_SYNC_CACHE.has(userId)) {
    BUNDLE_SYNC_CACHE.delete(userId)
  } else if (BUNDLE_SYNC_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = BUNDLE_SYNC_CACHE.keys().next().value
    if (oldestKey) BUNDLE_SYNC_CACHE.delete(oldestKey)
  }
  BUNDLE_SYNC_CACHE.set(userId, entry)
}

export function invalidateUserBundleCache(userId: string): void {
  BUNDLE_SYNC_CACHE.delete(userId)
}

export const invalidateBundleSyncCache = invalidateUserBundleCache

export async function getCourseBundleToolIds(
  sb: SupabaseClient = defaultSupabaseAdmin
): Promise<{ bundleIds: string[]; slugToId: Record<string, string> }> {
  try {
    const { data: tools } = await sb
      .from('tools')
      .select('id, slug')
      .in('slug', [...COURSE_BUNDLE_SLUGS])
    const slugToId: Record<string, string> = {}
    const bundleIds: string[] = []
    for (const t of tools || []) {
      if (t?.id && t?.slug) {
        slugToId[t.slug] = t.id
        bundleIds.push(t.id)
      }
    }
    return { bundleIds, slugToId }
  } catch {
    return { bundleIds: [], slugToId: {} }
  }
}

// =============================================================================
// Vercel-Safe Retry Helper (Retries ONLY ADVISORY_LOCK_TIMEOUT, Max 3 Attempts)
// =============================================================================
const LOCK_RETRY_DELAYS_MS = [150, 350] as const
const STATEMENT_TIMEOUT_MS = 3500
const RETRY_DEADLINE_MS = 7500

async function invokeWithLockRetry<T extends { ok?: boolean; error?: string }>(
  invokeOnce: () => Promise<T>,
  options?: { deadlineMs?: number }
): Promise<T> {
  const deadlineMs = options?.deadlineMs ?? RETRY_DEADLINE_MS
  const startedAt = Date.now()

  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await invokeOnce()
    if (result.ok || result.error !== 'ADVISORY_LOCK_TIMEOUT' || attempt === 3) {
      return result
    }
    const delayMs = LOCK_RETRY_DELAYS_MS[attempt - 1]
    // Conservative check accounting for next attempt's full statement_timeout (3500ms)
    if (Date.now() - startedAt + delayMs + STATEMENT_TIMEOUT_MS >= deadlineMs) {
      return result
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  return invokeOnce()
}

// =============================================================================
// 1. approveOrderAndGrantBundle
// =============================================================================
export interface ApproveBundleResult {
  ok: boolean
  error?: BundleErrorCode | string
  already_approved?: boolean
  repaired?: boolean
  reused_existing_key?: boolean
  is_bundle?: boolean
  license_key_id?: string | null
  key_code?: string | null
  approved_by_actor?: string
  granted_slugs?: string[]
  requestId: string
}

export async function approveOrderAndGrantBundle(params: {
  orderId: string
  approvedBy?: string | null
  approvedByActor?: string | null
  requestId?: string
  supabaseClient?: SupabaseClient
}): Promise<ApproveBundleResult> {
  const sb = params.supabaseClient || defaultSupabaseAdmin
  const requestId = extractRequestId(null, params.requestId)
  const actor =
    params.approvedByActor?.trim() ||
    (params.approvedBy ? `admin:${params.approvedBy}` : 'system:auto_slip')

  const rawResult = await invokeWithLockRetry(async () => {
    const { data, error } = await sb.rpc('approve_order_and_grant_bundle', {
      p_order_id: params.orderId,
      p_approved_by: params.approvedBy || null,
      p_approved_by_actor: actor,
      p_request_id: requestId,
    })

    if (error) {
      // If RPC function is not yet deployed on remote DB (PGRST202 / 42883), execute safe fallback
      if (
        error.code === 'PGRST202' ||
        error.code === '42883' ||
        error.message?.includes('Could not find the function')
      ) {
        return fallbackApproveOrderAndGrantBundle({
          sb,
          orderId: params.orderId,
          approvedBy: params.approvedBy || null,
          actor,
          requestId,
        })
      }

      if (error.code === '55P03') {
        return { ok: false, error: 'ADVISORY_LOCK_TIMEOUT', request_id: requestId }
      }
      if (error.code === '57014') {
        return { ok: false, error: 'RPC_TIMEOUT', request_id: requestId }
      }
      return {
        ok: false,
        error: 'RPC_INTERNAL_ERROR',
        request_id: requestId,
        _internal_sqlstate: error.code,
        _internal_sqlerrm: error.message,
      }
    }

    return (data || { ok: false, error: 'RPC_INTERNAL_ERROR', request_id: requestId }) as any
  })

  const sanitized = sanitizeRpcResponseForClient(rawResult, requestId, 'approve_order_and_grant_bundle')
  return sanitized as ApproveBundleResult
}

async function fallbackApproveOrderAndGrantBundle(params: {
  sb: SupabaseClient
  orderId: string
  approvedBy: string | null
  actor: string
  requestId: string
}): Promise<Record<string, any>> {
  const { sb, orderId, approvedBy, actor, requestId } = params

  const { data: order, error: orderErr } = await sb
    .from('orders')
    .select('id, user_id, user_email, tool_id, license_key_id, status, admin_note')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order || !order.user_id) {
    return { ok: false, error: 'ORDER_NOT_FOUND', request_id: requestId }
  }

  if (order.status === 'rejected') {
    return { ok: false, error: 'ORDER_ALREADY_REJECTED', request_id: requestId }
  }

  const { data: orderedTool } = await sb
    .from('tools')
    .select('id, slug')
    .eq('id', order.tool_id)
    .maybeSingle()

  if (!orderedTool) {
    return { ok: false, error: 'TOOL_NOT_FOUND', request_id: requestId }
  }

  const isAllInOne = isAllInOneSlug(orderedTool.slug)
  const isBundle = isAllInOne || isCourseBundleSlug(orderedTool.slug)
  let targetTools: { id: string; slug: string }[] = [orderedTool]

  if (isAllInOne) {
    const eligibleTools = await getAllInOneEligibleTools(sb)
    if (eligibleTools.length > 0) {
      const seenIds = new Set<string>()
      targetTools = []
      for (const t of [orderedTool, ...eligibleTools]) {
        if (t?.id && !seenIds.has(t.id)) {
          seenIds.add(t.id)
          targetTools.push({ id: t.id, slug: t.slug })
        }
      }
    }
  } else if (isBundle) {
    const { data: bTools } = await sb
      .from('tools')
      .select('id, slug')
      .in('slug', [...COURSE_BUNDLE_SLUGS])
      .eq('is_active', true)
    if (bTools && bTools.length > 0) {
      targetTools = bTools
    }
  }

  if (order.status === 'approved') {
    let keyCode: string | null = null
    if (order.license_key_id) {
      const { data: k } = await sb
        .from('license_keys')
        .select('key_code')
        .eq('id', order.license_key_id)
        .maybeSingle()
      keyCode = k?.key_code || null
    }

    for (const t of targetTools) {
      await sb.from('user_tools').upsert(
        {
          user_id: order.user_id,
          tool_id: t.id,
          license_key_id: order.license_key_id,
          is_active: true,
          activated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tool_id' }
      )
    }
    invalidateUserBundleCache(order.user_id)
    return {
      ok: true,
      already_approved: true,
      repaired: true,
      is_bundle: isBundle,
      license_key_id: order.license_key_id,
      key_code: keyCode,
      granted_slugs: targetTools.map((t) => t.slug),
      request_id: requestId,
    }
  }

  // Check for existing active key for same (user_id, tool_id) to dedup concurrent tabs
  const { data: existingActiveKey } = await sb
    .from('license_keys')
    .select('id, key_code')
    .eq('activated_by', order.user_id)
    .eq('tool_id', order.tool_id)
    .eq('status', 'activated')
    .order('activated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let keyId = existingActiveKey?.id || null
  let keyCode = existingActiveKey?.key_code || null
  const reusedExistingKey = !!keyId

  if (!keyId) {
    keyCode = generateLicenseCode()
    const { data: newKey, error: kErr } = await sb
      .from('license_keys')
      .insert({
        tool_id: order.tool_id,
        key_code: keyCode,
        status: 'activated',
        activated_at: new Date().toISOString(),
        activated_by: order.user_id,
        activated_email: order.user_email,
        note: isAllInOne
          ? 'All-in-One 999 Auto-Unlock (Course + All Eligible Tools)'
          : isBundle
          ? 'Course Bundle Auto-Unlock (3 Items)'
          : 'Single Tool Order',
      })
      .select('id, key_code')
      .single()

    if (kErr || !newKey) {
      return {
        ok: false,
        error: 'RPC_INTERNAL_ERROR',
        request_id: requestId,
        _internal_sqlstate: kErr?.code,
        _internal_sqlerrm: kErr?.message,
      }
    }
    keyId = newKey.id
    keyCode = newKey.key_code
  }

  const appendTag = `[APPROVED at ${new Date().toISOString()} by ${actor}]`
  const updatedNote = order.admin_note?.trim()
    ? `${order.admin_note.trim()} | ${appendTag}`
    : appendTag

  await sb
    .from('orders')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
      license_key_id: keyId,
      admin_note: updatedNote,
    })
    .eq('id', orderId)

  for (const t of targetTools) {
    await sb.from('user_tools').upsert(
      {
        user_id: order.user_id,
        tool_id: t.id,
        license_key_id: keyId,
        is_active: true,
        activated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,tool_id' }
    )
  }

  await sb
    .from('user_trials')
    .update({ status: 'converted' })
    .eq('user_id', order.user_id)
    .in(
      'tool_id',
      targetTools.map((t) => t.id)
    )
    .eq('status', 'active')

  invalidateUserBundleCache(order.user_id)

  return {
    ok: true,
    already_approved: false,
    reused_existing_key: reusedExistingKey,
    is_bundle: isBundle,
    license_key_id: keyId,
    key_code: keyCode,
    approved_by_actor: actor,
    granted_slugs: targetTools.map((t) => t.slug),
    request_id: requestId,
  }
}

// =============================================================================
// 2. revokeCourseBundleEntitlements
// =============================================================================
export interface RevokeBundleResult {
  ok: boolean
  success?: boolean
  error?: BundleErrorCode | string
  already_revoked?: boolean
  revoke_reason?: RevokeReason | string
  kept_active_via_order_id?: string | null
  keptActiveViaOrderId?: string | null
  revoked_slugs?: string[]
  revokedToolIds?: string[]
  retained_slugs?: string[]
  requestId: string
}

export async function revokeCourseBundleEntitlements(
  arg1:
    | {
        orderId: string
        adminId?: string | null
        reason?: string | null
        adminNote?: string | null
        revokeReason?: string | null
        requestId?: string
        supabaseClient?: SupabaseClient
      }
    | SupabaseClient,
  arg2?: {
    orderId: string
    adminId?: string | null
    reason?: string | null
    adminNote?: string | null
    revokeReason?: string | null
    requestId?: string
  }
): Promise<RevokeBundleResult> {
  const params = arg2
    ? { ...arg2, supabaseClient: arg1 as SupabaseClient }
    : (arg1 as {
        orderId: string
        adminId?: string | null
        reason?: string | null
        adminNote?: string | null
        revokeReason?: string | null
        requestId?: string
        supabaseClient?: SupabaseClient
      })
  const sb = params.supabaseClient || defaultSupabaseAdmin
  const requestId = extractRequestId(null, params.requestId)
  const rawReason = params.revokeReason ?? 'admin_revoke'
  const normalizedReason =
    rawReason === 'false_slip'
      ? 'admin_revoke'
      : rawReason === 'duplicate_test'
      ? 'duplicate_cancel'
      : rawReason

  if (!isValidRevokeReason(rawReason)) {
    return {
      ok: false,
      success: false,
      error: 'INVALID_REVOKE_REASON',
      requestId,
    }
  }

  const noteText = params.reason ?? params.adminNote ?? null

  const rawResult = await invokeWithLockRetry(async () => {
    const { data, error } = await sb.rpc('revoke_order_and_bundle', {
      p_order_id: params.orderId,
      p_admin_id: params.adminId || null,
      p_reason: noteText,
      p_revoke_reason: normalizedReason,
      p_request_id: requestId,
    })

    if (error) {
      if (
        error.code === 'PGRST202' ||
        error.code === '42883' ||
        error.message?.includes('Could not find the function')
      ) {
        return fallbackRevokeOrderAndBundle({
          sb,
          orderId: params.orderId,
          adminId: params.adminId || null,
          reason: noteText,
          revokeReason: normalizedReason as RevokeReason,
          requestId,
        })
      }

      if (error.code === '55P03') {
        return { ok: false, error: 'ADVISORY_LOCK_TIMEOUT', request_id: requestId }
      }
      if (error.code === '57014') {
        return { ok: false, error: 'RPC_TIMEOUT', request_id: requestId }
      }
      return {
        ok: false,
        error: 'RPC_INTERNAL_ERROR',
        request_id: requestId,
        _internal_sqlstate: error.code,
        _internal_sqlerrm: error.message,
      }
    }

    return (data || { ok: false, error: 'RPC_INTERNAL_ERROR', request_id: requestId }) as any
  })

  const sanitized = sanitizeRpcResponseForClient(rawResult, requestId, 'revoke_order_and_bundle') as any
  return {
    ...sanitized,
    success: Boolean(sanitized.ok),
    keptActiveViaOrderId: sanitized.kept_active_via_order_id ?? null,
    revokedToolIds: sanitized.revoked_slugs ?? [],
  }
}

async function fallbackRevokeOrderAndBundle(params: {
  sb: SupabaseClient
  orderId: string
  adminId: string | null
  reason: string | null
  revokeReason: RevokeReason
  requestId: string
}): Promise<Record<string, any>> {
  const { sb, orderId, adminId, reason, revokeReason, requestId } = params

  const { data: order } = await sb
    .from('orders')
    .select('id, user_id, tool_id, license_key_id, status, admin_note')
    .eq('id', orderId)
    .maybeSingle()

  if (!order || !order.user_id) {
    return { ok: false, error: 'ORDER_NOT_FOUND', request_id: requestId }
  }

  if (order.status === 'rejected') {
    return {
      ok: true,
      already_revoked: true,
      revoke_reason: revokeReason,
      kept_active_via_order_id: null,
      request_id: requestId,
    }
  }

  if (order.status !== 'approved' && order.status !== 'pending') {
    return { ok: false, error: 'ORDER_NOT_APPROVED', request_id: requestId }
  }

  let survivingSharedOrderId: string | null = null
  if (order.license_key_id) {
    const { data: sharedOrd } = await sb
      .from('orders')
      .select('id')
      .eq('license_key_id', order.license_key_id)
      .neq('id', orderId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()
    survivingSharedOrderId = sharedOrd?.id || null
  }

  const cleanNote = (reason || '')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\|/g, '/')
    .trim()
    .slice(0, 500)

  const appendTag = `[REVOKED:${revokeReason} at ${new Date().toISOString()} by ${adminId || 'system'}${cleanNote ? `: ${cleanNote}` : ''}]`
  const updatedNote = order.admin_note?.trim()
    ? `${order.admin_note.trim()} | ${appendTag}`
    : appendTag

  await sb
    .from('orders')
    .update({
      status: 'rejected',
      admin_note: updatedNote,
    })
    .eq('id', orderId)

  if (survivingSharedOrderId) {
    return {
      ok: true,
      already_revoked: false,
      revoke_reason: revokeReason,
      kept_active_via_order_id: survivingSharedOrderId,
      revoked_slugs: [],
      request_id: requestId,
    }
  }

  if (order.license_key_id) {
    await sb.from('license_keys').update({ status: 'revoked' }).eq('id', order.license_key_id)
  }

  const { data: orderedTool } = await sb
    .from('tools')
    .select('id, slug')
    .eq('id', order.tool_id)
    .maybeSingle()

  const isAllInOne = isAllInOneSlug(orderedTool?.slug)
  const isBundle = isAllInOne || isCourseBundleSlug(orderedTool?.slug)
  let targetTools: { id: string; slug: string }[] = orderedTool ? [orderedTool] : []
  if (isAllInOne) {
    const eligibleTools = await getAllInOneEligibleTools(sb)
    if (eligibleTools.length > 0) {
      const seenIds = new Set<string>()
      targetTools = []
      for (const t of [...(orderedTool ? [orderedTool] : []), ...eligibleTools]) {
        if (t?.id && !seenIds.has(t.id)) {
          seenIds.add(t.id)
          targetTools.push({ id: t.id, slug: t.slug })
        }
      }
    }
  } else if (isBundle) {
    const { data: bTools } = await sb
      .from('tools')
      .select('id, slug')
      .in('slug', [...COURSE_BUNDLE_SLUGS])
      .eq('is_active', true)
    if (bTools) targetTools = bTools
  }

  const bundleIds = targetTools.map((t) => t.id)
  const revokedSlugs: string[] = []
  const retainedSlugs: string[] = []

  for (const t of targetTools) {
    const { data: survivingKey } = await sb
      .from('license_keys')
      .select('id')
      .eq('activated_by', order.user_id)
      .eq('status', 'activated')
      .in('tool_id', isBundle ? bundleIds : [t.id])
      .neq('id', order.license_key_id || '00000000-0000-0000-0000-000000000000')
      .limit(1)
      .maybeSingle()

    if (survivingKey) {
      await sb
        .from('user_tools')
        .update({ license_key_id: survivingKey.id, is_active: true })
        .eq('user_id', order.user_id)
        .eq('tool_id', t.id)
      retainedSlugs.push(t.slug)
    } else {
      await sb.from('user_tools').delete().eq('user_id', order.user_id).eq('tool_id', t.id)
      revokedSlugs.push(t.slug)
    }
  }

  invalidateUserBundleCache(order.user_id)

  return {
    ok: true,
    already_revoked: false,
    revoke_reason: revokeReason,
    kept_active_via_order_id: null,
    revoked_slugs: revokedSlugs,
    retained_slugs: retainedSlugs,
    request_id: requestId,
  }
}

// =============================================================================
// 3. attemptCourseBundleHeal & recordBundleHealFailure
// =============================================================================
export async function attemptCourseBundleHeal(
  arg1:
    | {
        userId: string
        requestId?: string
        supabaseClient?: SupabaseClient
        timeoutMs?: number
      }
    | SupabaseClient,
  arg2?: string,
  arg3?: string
) {
  const params =
    typeof arg2 === 'string'
      ? { supabaseClient: arg1 as SupabaseClient, userId: arg2, requestId: arg3 }
      : (arg1 as {
          userId: string
          requestId?: string
          supabaseClient?: SupabaseClient
          timeoutMs?: number
        })
  const sb = params.supabaseClient || defaultSupabaseAdmin
  const requestId = extractRequestId(null, params.requestId)
  const timeoutMs = params.timeoutMs ?? 1500

  let timer: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<{ ok: false; error: 'RPC_TIMEOUT'; requestId: string }>(
    (resolve) => {
      timer = setTimeout(() => {
        resolve({ ok: false, error: 'RPC_TIMEOUT', requestId })
      }, timeoutMs)
    }
  )

  const rpcPromise = (async () => {
    if (typeof sb.rpc !== 'function') {
      return fallbackHealUserBundle(sb, params.userId, requestId)
    }
    const { data, error } = await sb.rpc('attempt_course_bundle_heal', {
      p_user_id: params.userId,
      p_request_id: requestId,
    })

    if (error) {
      if (
        error.code === 'PGRST202' ||
        error.code === '42883' ||
        error.message?.includes('Could not find the function')
      ) {
        return fallbackHealUserBundle(sb, params.userId, requestId)
      }
      return {
        ok: false,
        error: error.code === '55P03' ? 'ADVISORY_LOCK_TIMEOUT' : 'RPC_INTERNAL_ERROR',
        request_id: requestId,
        _internal_sqlstate: error.code,
        _internal_sqlerrm: error.message,
      }
    }

    return data || { ok: false, error: 'RPC_INTERNAL_ERROR', request_id: requestId }
  })()

  try {
    const winner = await Promise.race([rpcPromise, timeoutPromise])
    const sanitized = sanitizeRpcResponseForClient(winner as any, requestId, 'attempt_course_bundle_heal') as any
    const healed = Boolean(sanitized.ok && sanitized.healed_count > 0)
    if (healed) {
      invalidateUserBundleCache(params.userId)
    }
    return {
      ...sanitized,
      healed,
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function fallbackHealUserBundle(sb: SupabaseClient, userId: string, requestId: string) {
  // 1. Check All-in-One 999 Package Eligibility first (Future-proof unlock of all eligible tools)
  const eligibleAllInOneTools = await getAllInOneEligibleTools(sb)
  const allInOneTool = eligibleAllInOneTools.find((t) => t.slug === ALL_IN_ONE_SLUG)

  if (allInOneTool && eligibleAllInOneTools.length > 0) {
    const allEligibleIds = eligibleAllInOneTools.map((t) => t.id)
    const [{ data: aioUt }, { data: aioOrders }, { data: aioKeys }] = await Promise.all([
      sb
        .from('user_tools')
        .select('id, tool_id, license_key_id, is_active')
        .eq('user_id', userId)
        .in('tool_id', allEligibleIds),
      sb
        .from('orders')
        .select('id, tool_id, license_key_id, status')
        .eq('user_id', userId)
        .in('tool_id', [allInOneTool.id])
        .eq('status', 'approved'),
      sb
        .from('license_keys')
        .select('id, status')
        .eq('activated_by', userId)
        .in('tool_id', [allInOneTool.id]),
    ])

    const aioRevokedKeyIds = new Set(
      (aioKeys || []).filter((k) => k.status === 'revoked').map((k) => k.id)
    )
    const validAioUt = (aioUt || []).find(
      (u) =>
        u.tool_id === allInOneTool.id &&
        u.is_active &&
        (!u.license_key_id || !aioRevokedKeyIds.has(u.license_key_id))
    )
    const validAioOrd = (aioOrders || []).find(
      (o) => !o.license_key_id || !aioRevokedKeyIds.has(o.license_key_id)
    )

    if (validAioUt || validAioOrd) {
      const qualifyingKeyId = validAioUt?.license_key_id || validAioOrd?.license_key_id || null
      const activeToolIds = new Set(
        (aioUt || []).filter((u) => u.is_active).map((u) => u.tool_id)
      )

      let healedCount = 0
      for (const et of eligibleAllInOneTools) {
        if (!activeToolIds.has(et.id)) {
          await sb.from('user_tools').upsert(
            {
              user_id: userId,
              tool_id: et.id,
              license_key_id: qualifyingKeyId,
              is_active: true,
              activated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,tool_id' }
          )
          healedCount++
        }
      }

      return {
        ok: true,
        eligible: true,
        is_all_in_one: true,
        healed_count: healedCount,
        request_id: requestId,
      }
    }
  }

  // 2. Course Bundle (3 items) Heal
  const { data: bTools } = await sb
    .from('tools')
    .select('id, slug')
    .in('slug', [...COURSE_BUNDLE_SLUGS])
    .eq('is_active', true)

  if (!bTools || bTools.length === 0) {
    return { ok: true, eligible: false, healed_count: 0, request_id: requestId }
  }

  const bundleIds = bTools.map((t) => t.id)
  const [{ data: existingUt }, { data: approvedOrders }, { data: keys }] = await Promise.all([
    sb
      .from('user_tools')
      .select('id, tool_id, license_key_id, is_active')
      .eq('user_id', userId)
      .in('tool_id', bundleIds),
    sb
      .from('orders')
      .select('id, tool_id, license_key_id, status')
      .eq('user_id', userId)
      .in('tool_id', bundleIds)
      .eq('status', 'approved'),
    sb.from('license_keys').select('id, status').eq('activated_by', userId).in('tool_id', bundleIds),
  ])

  const revokedKeyIds = new Set((keys || []).filter((k) => k.status === 'revoked').map((k) => k.id))

  const validUt = (existingUt || []).find(
    (u) => u.is_active && (!u.license_key_id || !revokedKeyIds.has(u.license_key_id))
  )
  const validOrd = (approvedOrders || []).find(
    (o) => !o.license_key_id || !revokedKeyIds.has(o.license_key_id)
  )

  if (!validUt && !validOrd) {
    return { ok: true, eligible: false, healed_count: 0, request_id: requestId }
  }

  const qualifyingKeyId = validUt?.license_key_id || validOrd?.license_key_id || null
  const activeToolIds = new Set(
    (existingUt || []).filter((u) => u.is_active).map((u) => u.tool_id)
  )

  let healedCount = 0
  for (const bt of bTools) {
    if (!activeToolIds.has(bt.id)) {
      await sb.from('user_tools').upsert(
        {
          user_id: userId,
          tool_id: bt.id,
          license_key_id: qualifyingKeyId,
          is_active: true,
          activated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tool_id' }
      )
      healedCount++
    }
  }

  return { ok: true, eligible: true, healed_count: healedCount, request_id: requestId }
}

export async function recordBundleHealFailure(params: {
  userId: string
  userEmail?: string | null
  errorDetail?: string
  requestId?: string
  supabaseClient?: SupabaseClient
}) {
  const sb = params.supabaseClient || defaultSupabaseAdmin
  const requestId = extractRequestId(null, params.requestId)

  const { data, error } = await sb.rpc('record_bundle_heal_failure', {
    p_user_id: params.userId,
    p_error_detail: params.errorDetail || null,
    p_request_id: requestId,
  })

  if (error) {
    return {
      ok: false,
      error: 'RPC_INTERNAL_ERROR',
      requestId,
    }
  }

  const sanitized = sanitizeRpcResponseForClient(data as any, requestId, 'record_bundle_heal_failure')

  if ((sanitized as any).should_alert) {
    await notifyBundleGrantFailure({
      userId: params.userId,
      userEmail: params.userEmail,
      errorCode: 'HEAL_CIRCUIT_OPEN',
      errorMessage: `Auto-heal failed ${(sanitized as any).fail_count || 3} times in 1h (${params.errorDetail || 'unknown'})`,
      requestId,
      context: 'recordBundleHealFailure (6h re-alert window)',
    })
  }

  return sanitized
}

// =============================================================================
// 4. resolveUserBundleAccess (Wrapped in React.cache() for Server Components)
// =============================================================================
export interface ResolvedBundleAccess {
  ownedToolIds: string[]
  ownedSlugs: string[]
  hasFullBundle: boolean
  healed: boolean
  needsBackgroundSync?: boolean
}

export const resolveUserBundleAccess = cache(
  async (
    arg1: string | SupabaseClient,
    arg2?: string,
    arg3?: string
  ): Promise<ResolvedBundleAccess> => {
    const sb: SupabaseClient = typeof arg1 === 'string' ? defaultSupabaseAdmin : arg1
    const userId: string = typeof arg1 === 'string' ? arg1 : arg2 || ''
    const requestId = extractRequestId(null, typeof arg1 === 'string' ? arg2 : arg3)

    if (!userId) {
      return {
        ownedToolIds: [],
        ownedSlugs: [],
        hasFullBundle: false,
        healed: false,
        needsBackgroundSync: false,
      }
    }

    try {
      const profilesTable: any = sb.from?.('profiles')
      const toolsTable: any = sb.from?.('tools')

      const [profileRes, bundleToolsRes] = await Promise.all([
        typeof profilesTable?.select === 'function'
          ? profilesTable
              .select('id, bundle_state_version')
              .eq('id', userId)
              .maybeSingle?.() ?? Promise.resolve({ data: null })
          : Promise.resolve({ data: null }),
        typeof toolsTable?.select === 'function'
          ? toolsTable
              .select('id, slug')
              .in?.('slug', [...COURSE_BUNDLE_SLUGS])
              ?.eq?.('is_active', true) ?? Promise.resolve({ data: [] })
          : Promise.resolve({ data: [] }),
      ])

      const profile = profileRes?.data || null
      const bundleTools = Array.isArray(bundleToolsRes?.data) ? bundleToolsRes.data : []

      const stateVersion = Number(profile?.bundle_state_version || 0)
      const cached = getCachedBundleAccess(userId, stateVersion)
      if (cached) {
        return {
          ownedToolIds: cached.ownedToolIds,
          ownedSlugs: cached.ownedSlugs,
          hasFullBundle: cached.hasFullBundle,
          healed: false,
          needsBackgroundSync: false,
        }
      }

      const utTable: any = sb.from?.('user_tools')
      const utRes =
        typeof utTable?.select === 'function'
          ? await (utTable
              .select('tool_id, is_active, license_key_id')
              .eq?.('user_id', userId)
              ?.eq?.('is_active', true) ?? Promise.resolve({ data: [] }))
          : { data: [] }

      const userTools = Array.isArray(utRes?.data) ? utRes.data : []
      const ownedSet = new Set<string>(userTools.map((ut: any) => String(ut.tool_id)))
      const bTools = bundleTools || []
      const bundleMap = new Map<string, string>(bTools.map((t: any) => [String(t.id), String(t.slug)]))

      const ownedBundleCount = bTools.filter((t: any) => ownedSet.has(t.id)).length
      let healed = false

      // Check All-in-One 999 ownership & future-proof tool eligibility
      const eligibleAllInOneTools = await getAllInOneEligibleTools(sb)
      const allInOneTool = eligibleAllInOneTools.find((t) => t.slug === ALL_IN_ONE_SLUG)
      const ownsAllInOne = Boolean(allInOneTool && ownedSet.has(allInOneTool.id))
      const missingAllInOneCount = ownsAllInOne
        ? eligibleAllInOneTools.filter((t) => !ownedSet.has(t.id)).length
        : 0

      if (ownsAllInOne) {
        for (const et of eligibleAllInOneTools) {
          bundleMap.set(String(et.id), String(et.slug))
        }
      }

      // If user owns All-in-One with new unhealed tools OR owns 1-2 of the 3 course bundle items
      if (
        (ownsAllInOne && missingAllInOneCount > 0) ||
        (bTools.length === 3 && ownedBundleCount < 3)
      ) {
        const healRes = await attemptCourseBundleHeal({
          userId,
          requestId,
          supabaseClient: sb,
          timeoutMs: 1500,
        })

        if (healRes.ok && (healRes as any).eligible) {
          healed = (healRes as any).healed_count > 0
          if ((healRes as any).is_all_in_one || ownsAllInOne) {
            for (const et of eligibleAllInOneTools) {
              ownedSet.add(et.id)
              bundleMap.set(String(et.id), String(et.slug))
            }
          } else {
            for (const bt of bTools) {
              ownedSet.add(bt.id)
            }
          }
        }
      }

      // Guarantee instant runtime access to all eligible tools if user owns All-in-One
      if (ownsAllInOne) {
        for (const et of eligibleAllInOneTools) {
          ownedSet.add(et.id)
        }
      }

      const ownedToolIds = Array.from(ownedSet)
      const ownedSlugs = ownedToolIds
        .map((id) => bundleMap.get(id))
        .filter((s): s is string => !!s)
      const hasFullBundle = bTools.length === 3 && bTools.every((bt: any) => ownedSet.has(bt.id))

      setCachedBundleAccess(userId, {
        version: healed ? stateVersion + 1 : stateVersion,
        ownedToolIds,
        ownedSlugs,
        hasFullBundle,
        cachedAt: Date.now(),
      })

      return {
        ownedToolIds,
        ownedSlugs,
        hasFullBundle,
        healed,
        needsBackgroundSync: ownedBundleCount > 0 && !hasFullBundle,
      }
    } catch {
      return {
        ownedToolIds: [],
        ownedSlugs: [],
        hasFullBundle: false,
        healed: false,
        needsBackgroundSync: false,
      }
    }
  }
)
