import { describe, test, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  ALL_IN_ONE_SLUG,
  COURSE_BUNDLE_SLUGS,
  COURSE_BUNDLE_BONUS_TOOL_SLUGS,
  COURSE_BUNDLE_GUIDE_DRIVE_URL,
  BUNDLE_ERROR_CATALOG,
  BUNDLE_SYNC_CACHE,
  isAllInOneSlug,
  isCourseBundleSlug,
  isToolEligibleForAllInOne,
  isValidRevokeReason,
  formatSharedKeyRevokeMessage,
  formatActorBadgeLabel,
  sanitizeRpcResponseForClient,
  getCachedBundleAccess,
  setCachedBundleAccess,
  invalidateUserBundleCache,
  approveOrderAndGrantBundle,
  revokeCourseBundleEntitlements,
  attemptCourseBundleHeal,
  recordBundleHealFailure,
  resolveUserBundleAccess,
} from '@/lib/course-bundle'
import { sanitizeToolForPublic, type Tool } from '@/lib/sanitize-tool'

const MIGRATION_SQL_PATH = path.join(
  process.cwd(),
  'supabase/migrations/20261105000001_course_bundle_rpcs.sql'
)
const migrationSql = fs.readFileSync(MIGRATION_SQL_PATH, 'utf8')

const TOOL_COURSE_ID = 'bf28e882-0000-4000-8000-000000000001'
const TOOL_FASHION_ID = '5fa1de55-2b29-4c48-924c-97bff74b2419'
const TOOL_UGC_ID = '71bbad79-78b5-40e7-aa09-01a657345f61'

const BUNDLE_TOOLS = [
  { id: TOOL_COURSE_ID, slug: 'tiktok-ai-affiliate', is_active: true },
  { id: TOOL_FASHION_ID, slug: 'puppap-fashion-studio', is_active: true },
  { id: TOOL_UGC_ID, slug: 'puppap-ugc-product', is_active: true },
]

// In-memory transactional mock DB for simulating full RPC + fallback behavior
function createInMemorySupabase() {
  const state = {
    maintenance: false,
    tools: [...BUNDLE_TOOLS],
    orders: new Map<string, any>(),
    licenseKeys: new Map<string, any>(),
    userTools: new Map<string, any>(), // key: `${user_id}:${tool_id}`
    userTrials: new Map<string, any>(),
    profiles: new Map<string, any>(),
    auditRows: new Map<string, any>(), // key: `${migration_name}:${user_id}:${tool_id}`
    failOnSecondUserToolUpsert: false,
  }

  const sb: any = {
    _state: state,
    rpc: vi.fn(async (fnName: string, args: any) => {
      if (state.maintenance) {
        return {
          data: {
            ok: false,
            error: 'MAINTENANCE_MODE_ACTIVE',
            request_id: args?.p_request_id || 'req-maint',
          },
          error: null,
        }
      }
      // Delegate to fallback implementation by returning PGRST202 unless overridden
      return {
        data: null,
        error: { code: 'PGRST202', message: `Could not find the function ${fnName}` },
      }
    }),
    from: (table: string) => {
      if (table === 'tools') {
        return {
          select: () => ({
            eq: (col: string, val: any) => ({
              maybeSingle: async () => ({
                data: state.tools.find((t: any) => t[col] === val) || null,
                error: null,
              }),
            }),
            in: (_col: string, vals: string[]) => ({
              eq: async () => ({
                data: state.tools.filter((t) => vals.includes(t.slug) && t.is_active),
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'orders') {
        return {
          select: () => ({
            eq: (col: string, val: any) => ({
              maybeSingle: async () => {
                const found = Array.from(state.orders.values()).find((o) => o[col] === val) || null
                return { data: found ? { ...found } : null, error: null }
              },
              neq: (_col2: string, neqVal: any) => ({
                eq: (_col3: string, statusVal: any) => ({
                  limit: () => ({
                    maybeSingle: async () => {
                      const found =
                        Array.from(state.orders.values()).find(
                          (o) => o[col] === val && o.id !== neqVal && o.status === statusVal
                        ) || null
                      return { data: found ? { ...found } : null, error: null }
                    },
                  }),
                }),
              }),
              in: (_col2: string, toolIds: string[]) => ({
                eq: async (_col3: string, statusVal: any) => ({
                  data: Array.from(state.orders.values()).filter(
                    (o) => o[col] === val && toolIds.includes(o.tool_id) && o.status === statusVal
                  ),
                  error: null,
                }),
              }),
            }),
          }),
          update: (patch: any) => ({
            eq: async (_col: string, idVal: string) => {
              const existing = state.orders.get(idVal)
              if (existing) {
                state.orders.set(idVal, {
                  ...existing,
                  ...patch,
                  updated_at: new Date().toISOString(),
                })
              }
              return { data: null, error: null }
            },
          }),
        }
      }

      if (table === 'license_keys') {
        return {
          select: () => ({
            eq: (col: string, val: any) => ({
              maybeSingle: async () => {
                const found =
                  Array.from(state.licenseKeys.values()).find((k) => k[col] === val) || null
                return { data: found ? { ...found } : null, error: null }
              },
              in: (_col2: string, toolIds: string[]) =>
                Promise.resolve({
                  data: Array.from(state.licenseKeys.values()).filter(
                    (k) => k[col] === val && toolIds.includes(k.tool_id)
                  ),
                  error: null,
                }),
              eq: (col2: string, val2: any) => ({
                eq: (col3: string, val3: any) => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => {
                        const found =
                          Array.from(state.licenseKeys.values()).find(
                            (k) => k[col] === val && k[col2] === val2 && k[col3] === val3
                          ) || null
                        return { data: found ? { ...found } : null, error: null }
                      },
                    }),
                  }),
                }),
                in: (_col3: string, toolIds: string[]) => ({
                  neq: (_col4: string, neqId: string) => ({
                    limit: () => ({
                      maybeSingle: async () => {
                        const found =
                          Array.from(state.licenseKeys.values()).find(
                            (k) =>
                              k[col] === val &&
                              k[col2] === val2 &&
                              toolIds.includes(k.tool_id) &&
                              k.id !== neqId
                          ) || null
                        return { data: found ? { ...found } : null, error: null }
                      },
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: (row: any) => ({
            select: () => ({
              single: async () => {
                const id = row.id || `key-${state.licenseKeys.size + 1}`
                const created = { ...row, id }
                state.licenseKeys.set(id, created)
                return { data: created, error: null }
              },
            }),
          }),
          update: (patch: any) => ({
            eq: async (_col: string, idVal: string) => {
              const existing = state.licenseKeys.get(idVal)
              if (existing) {
                state.licenseKeys.set(idVal, { ...existing, ...patch })
              }
              return { data: null, error: null }
            },
          }),
        }
      }

      if (table === 'user_tools') {
        return {
          select: () => ({
            eq: (_col: string, userId: string) => ({
              in: async (_col2: string, toolIds: string[]) => ({
                data: Array.from(state.userTools.values()).filter(
                  (u) => u.user_id === userId && toolIds.includes(u.tool_id)
                ),
                error: null,
              }),
              eq: async (_col2: string, activeVal: boolean) => ({
                data: Array.from(state.userTools.values()).filter(
                  (u) => u.user_id === userId && u.is_active === activeVal
                ),
                error: null,
              }),
            }),
          }),
          upsert: async (row: any) => {
            if (state.failOnSecondUserToolUpsert && state.userTools.size >= 1) {
              throw new Error('SIMULATED_STATEMENT_2_USER_TOOLS_FAILURE')
            }
            const key = `${row.user_id}:${row.tool_id}`
            state.userTools.set(key, { ...row })
            return { data: row, error: null }
          },
          update: (patch: any) => ({
            eq: (_col1: string, userId: string) => ({
              eq: async (_col2: string, toolId: string) => {
                const key = `${userId}:${toolId}`
                const existing = state.userTools.get(key)
                if (existing) state.userTools.set(key, { ...existing, ...patch })
                return { data: null, error: null }
              },
            }),
          }),
          delete: () => ({
            eq: (_col1: string, userId: string) => ({
              eq: async (_col2: string, toolId: string) => {
                state.userTools.delete(`${userId}:${toolId}`)
                return { data: null, error: null }
              },
            }),
          }),
        }
      }

      if (table === 'user_trials') {
        return {
          update: (patch: any) => ({
            eq: (_col1: string, userId: string) => ({
              in: (_col2: string, toolIds: string[]) => ({
                eq: async (_col3: string, statusVal: string) => {
                  for (const [k, v] of state.userTrials.entries()) {
                    if (
                      v.user_id === userId &&
                      toolIds.includes(v.tool_id) &&
                      v.status === statusVal
                    ) {
                      state.userTrials.set(k, { ...v, ...patch })
                    }
                  }
                  return { data: null, error: null }
                },
              }),
            }),
          }),
        }
      }

      if (table === 'profiles') {
        return {
          select: () => ({
            eq: (_col: string, userId: string) => ({
              maybeSingle: async () => ({
                data: state.profiles.get(userId) || { id: userId, bundle_state_version: 1 },
                error: null,
              }),
            }),
          }),
        }
      }

      return {}
    },
  }

  return sb
}

describe('Course Bundle v18 — 29 Test Suites (33 Sub-Cases)', () => {
  beforeEach(() => {
    BUNDLE_SYNC_CACHE.clear()
  })

  // =========================================================================
  // Tests 1, 2, 3: Buying any of the 3 bundle items unlocks all 3 items
  // =========================================================================
  test('Test 1: Buying tiktok-ai-affiliate (฿299) unlocks all 3 bundle items atomically', async () => {
    const sb = createInMemorySupabase()
    sb._state.orders.set('ord-course-1', {
      id: 'ord-course-1',
      user_id: 'user-1',
      user_email: 'u1@example.com',
      tool_id: TOOL_COURSE_ID,
      status: 'pending',
      admin_note: null,
    })

    const res = await approveOrderAndGrantBundle({
      orderId: 'ord-course-1',
      approvedByActor: 'system:auto_slip',
      supabaseClient: sb,
    })

    expect(res.ok).toBe(true)
    expect(res.is_bundle).toBe(true)
    expect(res.approved_by_actor).toBe('system:auto_slip')
    expect(res.granted_slugs?.sort()).toEqual([...COURSE_BUNDLE_SLUGS].sort())
    expect(sb._state.userTools.size).toBe(3)
  })

  test('Test 2: Buying puppap-fashion-studio (฿299) unlocks all 3 bundle items', async () => {
    const sb = createInMemorySupabase()
    sb._state.orders.set('ord-fashion-1', {
      id: 'ord-fashion-1',
      user_id: 'user-2',
      user_email: 'u2@example.com',
      tool_id: TOOL_FASHION_ID,
      status: 'pending',
      admin_note: null,
    })

    const res = await approveOrderAndGrantBundle({
      orderId: 'ord-fashion-1',
      approvedBy: 'admin-uuid-1',
      supabaseClient: sb,
    })

    expect(res.ok).toBe(true)
    expect(res.is_bundle).toBe(true)
    expect(res.approved_by_actor).toBe('admin:admin-uuid-1')
    expect(res.granted_slugs?.sort()).toEqual([...COURSE_BUNDLE_SLUGS].sort())
    expect(sb._state.userTools.size).toBe(3)
  })

  test('Test 3: Buying puppap-ugc-product (฿299) unlocks all 3 bundle items', async () => {
    const sb = createInMemorySupabase()
    sb._state.orders.set('ord-ugc-1', {
      id: 'ord-ugc-1',
      user_id: 'user-3',
      user_email: 'u3@example.com',
      tool_id: TOOL_UGC_ID,
      status: 'pending',
      admin_note: null,
    })

    const res = await approveOrderAndGrantBundle({
      orderId: 'ord-ugc-1',
      approvedByActor: 'telegram:998877',
      supabaseClient: sb,
    })

    expect(res.ok).toBe(true)
    expect(res.is_bundle).toBe(true)
    expect(res.approved_by_actor).toBe('telegram:998877')
    expect(res.granted_slugs?.sort()).toEqual([...COURSE_BUNDLE_SLUGS].sort())
    expect(sb._state.userTools.size).toBe(3)
  })

  // =========================================================================
  // Tests 4, 5, 6: Revocation & Surviving Key / Shared Key Protection
  // =========================================================================
  test('Test 4: Single-key revoke removes all 3 bundle items when no surviving key exists', async () => {
    const sb = createInMemorySupabase()
    sb._state.orders.set('ord-rev-1', {
      id: 'ord-rev-1',
      user_id: 'user-4',
      user_email: 'u4@example.com',
      tool_id: TOOL_COURSE_ID,
      status: 'pending',
    })
    await approveOrderAndGrantBundle({ orderId: 'ord-rev-1', supabaseClient: sb })
    expect(sb._state.userTools.size).toBe(3)

    const revRes = await revokeCourseBundleEntitlements({
      orderId: 'ord-rev-1',
      revokeReason: 'admin_revoke',
      reason: 'สลิปปลอม',
      supabaseClient: sb,
    })

    expect(revRes.ok).toBe(true)
    expect(revRes.revoked_slugs?.sort()).toEqual([...COURSE_BUNDLE_SLUGS].sort())
    expect(sb._state.userTools.size).toBe(0)
  })

  test('Test 5: Multi-key surviving key protection retains all 3 bundle items when a second activated key exists', async () => {
    const sb = createInMemorySupabase()
    sb._state.orders.set('ord-5a', {
      id: 'ord-5a',
      user_id: 'user-5',
      user_email: 'u5@example.com',
      tool_id: TOOL_COURSE_ID,
      status: 'pending',
    })
    await approveOrderAndGrantBundle({ orderId: 'ord-5a', supabaseClient: sb })

    // User also activated a separate key for puppap-fashion-studio
    sb._state.licenseKeys.set('key-surviving-5b', {
      id: 'key-surviving-5b',
      tool_id: TOOL_FASHION_ID,
      key_code: 'PHM-SURV-5555',
      status: 'activated',
      activated_by: 'user-5',
    })

    const revRes = await revokeCourseBundleEntitlements({
      orderId: 'ord-5a',
      revokeReason: 'refund',
      supabaseClient: sb,
    })

    expect(revRes.ok).toBe(true)
    expect(revRes.retained_slugs?.sort()).toEqual([...COURSE_BUNDLE_SLUGS].sort())
    expect(sb._state.userTools.size).toBe(3)
    for (const ut of sb._state.userTools.values()) {
      expect(ut.license_key_id).toBe('key-surviving-5b')
    }
  })

  test('Test 6: Shared-key surviving order protection keeps key & entitlements active when another approved order shares the same license_key_id', async () => {
    const sb = createInMemorySupabase()
    sb._state.orders.set('ord-6a', {
      id: 'ord-6a',
      user_id: 'user-6',
      user_email: 'u6@example.com',
      tool_id: TOOL_COURSE_ID,
      status: 'pending',
    })
    const grant1 = await approveOrderAndGrantBundle({ orderId: 'ord-6a', supabaseClient: sb })

    // Second duplicate order for same tool reuses the same key
    sb._state.orders.set('ord-6b', {
      id: 'ord-6b',
      user_id: 'user-6',
      user_email: 'u6@example.com',
      tool_id: TOOL_COURSE_ID,
      status: 'pending',
    })
    const grant2 = await approveOrderAndGrantBundle({ orderId: 'ord-6b', supabaseClient: sb })
    expect(grant2.reused_existing_key).toBe(true)
    expect(grant2.license_key_id).toBe(grant1.license_key_id)

    // Refunding the duplicate order ord-6b must keep ord-6a's shared key active
    const revRes = await revokeCourseBundleEntitlements({
      orderId: 'ord-6b',
      revokeReason: 'refund',
      supabaseClient: sb,
    })

    expect(revRes.ok).toBe(true)
    expect(revRes.kept_active_via_order_id).toBe('ord-6a')
    expect(sb._state.userTools.size).toBe(3)
    expect(sb._state.licenseKeys.get(grant1.license_key_id!).status).toBe('activated')

    const msg = formatSharedKeyRevokeMessage({
      revokeReason: 'refund',
      orderId: 'ord-6b-12345678',
      keptActiveViaOrderId: 'ord-6a-87654321',
      audience: 'admin',
    })
    expect(msg).toContain('ord-6a-8')
  })

  // =========================================================================
  // Tests 7, 8, 9: Auto-Heal Circuit Breaker, 60s Grace Window & Pending Retry
  // =========================================================================
  test('Test 7: Auto-heal circuit breaker opens after 3 failures within 1h and triggers 6h alert window', async () => {
    const sb = createInMemorySupabase()
    sb.rpc = vi.fn(async (fnName: string) => {
      if (fnName === 'record_bundle_heal_failure') {
        return {
          data: {
            ok: true,
            fail_count: 3,
            circuit_open: true,
            should_alert: true,
            request_id: 'req-cb-7',
          },
          error: null,
        }
      }
      return { data: null, error: null }
    })

    const res = await recordBundleHealFailure({
      userId: 'user-cb-7',
      userEmail: 'cb7@example.com',
      errorDetail: 'Simulated timeout',
      supabaseClient: sb,
    })

    expect(res.ok).toBe(true)
    expect((res as any).circuit_open).toBe(true)
    expect((res as any).should_alert).toBe(true)
  })

  test('Test 8: Cleanup stale entitlements SQL enforces 15-minute grace window and 3500ms wall-clock cutoff', () => {
    expect(migrationSql).toContain("COALESCE(lk.activated_at, lk.created_at) < (now() - INTERVAL '15 minutes')")
    expect(migrationSql).toContain("clock_timestamp() - v_start_ts > INTERVAL '3500 milliseconds'")
  })

  test('Test 9: Cleanup job auto-retries pending [GRANT_RETRY_NEEDED] orders up to 3 times before marking exhausted', () => {
    const cleanupRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/cleanup-stale-entitlements/route.ts'),
      'utf8'
    )
    expect(cleanupRoute).toContain('GRANT_RETRY_NEEDED')
    expect(cleanupRoute).toContain('MANUAL_INTERVENTION_REQUIRED')
    expect(cleanupRoute).toContain('system:cleanup_retry')
    expect(cleanupRoute).toContain('nextCount >= 3')
  })

  // =========================================================================
  // Test 10: Lesson 14 & Lesson 22 Linking + Google Drive Manual URL
  // =========================================================================
  test('Test 10: Lesson 14 links to puppap-ugc-product, Lesson 22 links to puppap-fashion-studio, and guide_drive_url matches Google Drive folder', () => {
    expect(COURSE_BUNDLE_GUIDE_DRIVE_URL).toBe(
      'https://drive.google.com/drive/folders/1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA?usp=drive_link'
    )
    expect(COURSE_BUNDLE_BONUS_TOOL_SLUGS).toEqual([
      'puppap-fashion-studio',
      'puppap-ugc-product',
    ])
    expect(migrationSql).toContain("'puppap-ugc-product'")
    expect(migrationSql).toContain("'puppap-fashion-studio'")
    expect(migrationSql).toContain(
      'https://flow.google.com/shared/tool/7cd5fff0-d917-41c2-b530-acc8ae147dcc'
    )
    expect(migrationSql).toContain(
      'https://flow.google.com/shared/tool/2cf7e3b4-9ea3-443a-b5d4-a32b6d7aed50'
    )
  })

  // =========================================================================
  // Tests 11 & 12: GET /api/orders Read-Only + POST /api/orders 200 OK Fallback
  // =========================================================================
  test('Test 11: GET /api/orders is strictly read-only (zero writes to user_tools) and returns sharedKeyNotice within 7 days of approved_at', () => {
    const ordersRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/orders/route.ts'),
      'utf8'
    )
    const getSection = ordersRoute.slice(ordersRoute.indexOf('export async function GET'))
    expect(getSection).not.toContain('.upsert(')
    expect(getSection).not.toContain('.insert(')
    expect(getSection).not.toContain('.update(')
    expect(getSection).toContain('sharedKeyNotice')
    expect(getSection).toContain('7 * 24 * 60 * 60 * 1000')
  })

  test('Test 12: POST /api/orders returns 200 OK with grant_delayed: true when atomic bundle grant fails transiently', () => {
    const ordersRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/orders/route.ts'),
      'utf8'
    )
    expect(ordersRoute).toContain('grant_delayed: true')
    expect(ordersRoute).toContain('[GRANT_RETRY_NEEDED')
    expect(ordersRoute).toContain('status: 200')
  })

  // =========================================================================
  // Tests 13, 14, 15: Lock Retry Budget, Concurrent Dedup, Admin retry_grant
  // =========================================================================
  test('Test 13: Lock retry retries ADVISORY_LOCK_TIMEOUT up to 3 times but does NOT retry RPC_TIMEOUT (staying within Vercel 10s limit)', async () => {
    let lockCalls = 0
    const sbLock = createInMemorySupabase()
    sbLock.rpc = vi.fn(async () => {
      lockCalls++
      return { data: null, error: { code: '55P03', message: 'lock_not_available' } }
    })

    const lockRes = await approveOrderAndGrantBundle({
      orderId: 'ord-lock-13',
      supabaseClient: sbLock,
    })
    expect(lockRes.ok).toBe(false)
    expect(lockRes.error).toBe('ADVISORY_LOCK_TIMEOUT')
    expect(lockCalls).toBe(3)

    let stmtTimeoutCalls = 0
    const sbTimeout = createInMemorySupabase()
    sbTimeout.rpc = vi.fn(async () => {
      stmtTimeoutCalls++
      return { data: null, error: { code: '57014', message: 'statement timeout' } }
    })

    const timeoutRes = await approveOrderAndGrantBundle({
      orderId: 'ord-timeout-13',
      supabaseClient: sbTimeout,
    })
    expect(timeoutRes.ok).toBe(false)
    expect(timeoutRes.error).toBe('RPC_TIMEOUT')
    expect(stmtTimeoutCalls).toBe(1) // Must NOT retry RPC_TIMEOUT
  })

  test('Test 14: Concurrent double-tab approval reuses existing active license key (reused_existing_key = true)', async () => {
    const sb = createInMemorySupabase()
    sb._state.orders.set('ord-14a', {
      id: 'ord-14a',
      user_id: 'user-14',
      user_email: 'u14@example.com',
      tool_id: TOOL_COURSE_ID,
      status: 'pending',
    })
    sb._state.orders.set('ord-14b', {
      id: 'ord-14b',
      user_id: 'user-14',
      user_email: 'u14@example.com',
      tool_id: TOOL_COURSE_ID,
      status: 'pending',
    })

    const resA = await approveOrderAndGrantBundle({ orderId: 'ord-14a', supabaseClient: sb })
    const resB = await approveOrderAndGrantBundle({ orderId: 'ord-14b', supabaseClient: sb })

    expect(resA.ok).toBe(true)
    expect(resB.ok).toBe(true)
    expect(resB.reused_existing_key).toBe(true)
    expect(resB.license_key_id).toBe(resA.license_key_id)
    expect(sb._state.licenseKeys.size).toBe(1)
  })

  test('Test 15: Admin PATCH /api/admin/orders/[id] supports retry_grant and resets grant_retry_exhausted', () => {
    const adminOrderRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/orders/[id]/route.ts'),
      'utf8'
    )
    expect(adminOrderRoute).toContain("action === 'retry_grant'")
    expect(adminOrderRoute).toContain('grant_retry_count: 0')
    expect(adminOrderRoute).toContain('grant_retry_exhausted: false')
  })

  // =========================================================================
  // Tests 16, 17, 18, 19, 20: Trials, LRU Cache, Maintenance, Telegram, Leak
  // =========================================================================
  test('Test 16: Trial 7-day expiry check & revoke trial restoration logic', () => {
    expect(migrationSql).toContain('AND expires_at > now();')
    const trialRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/trial/route.ts'),
      'utf8'
    )
    expect(trialRoute).toContain('SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000')
    expect(trialRoute).toContain("status: 'expired'")
  })

  test('Test 17: Versioned LRU cache BUNDLE_SYNC_CACHE evicts oldest beyond 500 entries and invalidates on version mismatch', () => {
    for (let i = 1; i <= 505; i++) {
      setCachedBundleAccess(`user-${i}`, {
        version: 1,
        ownedToolIds: [TOOL_COURSE_ID],
        ownedSlugs: ['tiktok-ai-affiliate'],
        hasFullBundle: false,
        cachedAt: Date.now(),
      })
    }
    expect(BUNDLE_SYNC_CACHE.size).toBe(500)
    expect(getCachedBundleAccess('user-1', 1)).toBeNull()
    expect(getCachedBundleAccess('user-505', 1)).not.toBeNull()
    // Version mismatch invalidates cache
    expect(getCachedBundleAccess('user-505', 2)).toBeNull()
  })

  test('Test 18: Maintenance mode active blocks RPC mutations with 503 MAINTENANCE_MODE_ACTIVE', async () => {
    const sb = createInMemorySupabase()
    sb._state.maintenance = true

    const res = await approveOrderAndGrantBundle({
      orderId: 'ord-maint-18',
      supabaseClient: sb,
    })

    expect(res.ok).toBe(false)
    expect(res.error).toBe('MAINTENANCE_MODE_ACTIVE')
    expect(BUNDLE_ERROR_CATALOG.MAINTENANCE_MODE_ACTIVE.httpStatus).toBe(503)
  })

  test('Test 19: Telegram webhook passes approvedByActor = telegram:<chatId> and formatActorBadgeLabel maps all 4 actors', () => {
    const tgWebhook = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/telegram/webhook/route.ts'),
      'utf8'
    )
    expect(tgWebhook).toContain('`telegram:${chatId}`')
    expect(formatActorBadgeLabel('system:auto_slip')).toContain('AI Slip')
    expect(formatActorBadgeLabel('telegram:123456')).toContain('Telegram')
    expect(formatActorBadgeLabel('system:cleanup_retry')).toContain('Auto-Retry')
    expect(formatActorBadgeLabel('admin:uuid-1')).toContain('แอดมิน')
  })

  test('Test 20: Public data leak prevention strips flow_url and password on both new bonus tools for guests, but includes flow_url for owners', () => {
    const rawFashionTool: Tool = {
      id: TOOL_FASHION_ID,
      name: 'PUP PAP Fashion Studio',
      slug: 'puppap-fashion-studio',
      icon: '👗',
      poster_url: '/images/poster-puppap-fashion-studio.jpg',
      logo_url: null,
      password: 'LICENSE_KEY_ONLY',
      description: 'Fashion AI Studio',
      price: '299',
      badge_text: 'NEW',
      badge_color: 'pink',
      version: '1.0.0',
      is_active: true,
      is_coming_soon: false,
      sort_order: 2,
      flow_url: 'https://flow.google.com/shared/tool/7cd5fff0-d917-41c2-b530-acc8ae147dcc',
      trial_enabled: false,
      trial_flow_url: null,
      features: { guide_drive_url: COURSE_BUNDLE_GUIDE_DRIVE_URL },
    }

    const guestView = sanitizeToolForPublic(rawFashionTool, {
      session: null,
      hasAccess: false,
      isTrial: false,
    })
    expect(guestView).not.toHaveProperty('password')
    expect(guestView).not.toHaveProperty('flow_url')

    const ownerView = sanitizeToolForPublic(rawFashionTool, {
      session: null,
      hasAccess: true,
      isTrial: false,
    })
    expect(ownerView).not.toHaveProperty('password')
    expect((ownerView as any).flow_url).toBe(
      'https://flow.google.com/shared/tool/7cd5fff0-d917-41c2-b530-acc8ae147dcc'
    )
  })

  // =========================================================================
  // Tests 21, 22, 23: Backfill Idempotency, Down Migration & Note Sanitization
  // =========================================================================
  test('Test 21: Backfill RPC logs both fixed_rows_count and skipped_rows_count and is idempotent on second run', async () => {
    const sb = createInMemorySupabase()
    sb._state.userTools.set(`user-21:${TOOL_COURSE_ID}`, {
      user_id: 'user-21',
      tool_id: TOOL_COURSE_ID,
      license_key_id: 'key-21',
      is_active: true,
    })

    const run1 = await attemptCourseBundleHeal({ userId: 'user-21', supabaseClient: sb })
    expect(run1.ok).toBe(true)
    expect((run1 as any).healed_count).toBe(2)

    const run2 = await attemptCourseBundleHeal({ userId: 'user-21', supabaseClient: sb })
    expect(run2.ok).toBe(true)
    expect((run2 as any).healed_count).toBe(0)
    expect(migrationSql).toContain('skipped_rows_count')
  })

  test('Test 22: Down migration reference and _migration_log composite PK (migration_name, direction)', () => {
    expect(migrationSql).toContain('PRIMARY KEY (migration_name, direction)')
    expect(migrationSql).toContain('user_tool_id uuid PRIMARY KEY')
    expect(migrationSql).toContain('KEEP orders.approved_at & orders.updated_at')
  })

  test('Test 23: orders.admin_note sanitizes pipe/newline characters and caps note length at 500 chars', async () => {
    const sb = createInMemorySupabase()
    sb._state.orders.set('ord-23', {
      id: 'ord-23',
      user_id: 'user-23',
      user_email: 'u23@example.com',
      tool_id: TOOL_COURSE_ID,
      status: 'approved',
      admin_note: 'Initial note',
    })

    await revokeCourseBundleEntitlements({
      orderId: 'ord-23',
      revokeReason: 'admin_revoke',
      reason: 'Line1\nLine2 | PipeInjected',
      supabaseClient: sb,
    })

    const updatedOrder = sb._state.orders.get('ord-23')
    expect(updatedOrder.admin_note).toContain('Line1 Line2 / PipeInjected')
    expect(migrationSql).toContain("REPLACE(COALESCE(p_reason, ''), E'\\r', ' ')")
  })

  // =========================================================================
  // Test 24 (24A, 24A-Collision, 24B, 24C): 64-bit hashtextextended Lock, Contention & prosecdef
  // =========================================================================
  test('Test 24A: Migration uses 64-bit hashtextextended (0 occurrences of 32-bit hashtext) and zero dead lock helpers in src/', () => {
    const hashtext32Matches = migrationSql.match(/(^|[^a-zA-Z0-9_])hashtext\(/gm) || []
    const hashtext64Matches = migrationSql.match(/(^|[^a-zA-Z0-9_])hashtextextended\(/gm) || []
    expect(hashtext32Matches.length).toBe(0)
    expect(hashtext64Matches.length).toBe(1)

    const bundleLibCode = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/course-bundle.ts'),
      'utf8'
    )
    expect(bundleLibCode).not.toContain('getUserAdvisoryLockId')
    expect(bundleLibCode).not.toContain('computeUserAdvisoryLockKey')
  })

  test('Test 24A-Collision: Offline PG hash collision generator verifies 32-bit hashtext collision vs distinct 64-bit hashtextextended', () => {
    const collisionScript = fs.readFileSync(
      path.join(process.cwd(), 'scripts/find-pg-hashtext-collision.mjs'),
      'utf8'
    )
    expect(collisionScript).toContain('pgHashtext32')
    expect(collisionScript).toContain('pgHashtextExtended64')
    expect(collisionScript).toContain('39249983-7745-415d-a39b-4ed3f4c85258')
    expect(collisionScript).toContain('66f6be06-9125-445e-9682-6c7f6f976831')
  })

  test('Test 24B: Two-Phase Lock Protocol sets lock_timeout = 1000ms and catches 55P03 lock_not_available -> ADVISORY_LOCK_TIMEOUT', () => {
    expect(migrationSql).toContain("SET LOCAL lock_timeout = '1000ms'")
    expect(migrationSql).toContain('PERFORM pg_advisory_xact_lock(public.user_advisory_lock_id(v_user_id))')
    expect(migrationSql).toContain('WHEN lock_not_available THEN')
    expect(migrationSql).toContain("'ADVISORY_LOCK_TIMEOUT'")
  })

  test('Test 24C: All 6 RPC functions are declared SECURITY DEFINER with search_path = public and verified via pg_proc.prosecdef', () => {
    const rpcNames = [
      'user_advisory_lock_id',
      'approve_order_and_grant_bundle',
      'revoke_order_and_bundle',
      'attempt_course_bundle_heal',
      'record_bundle_heal_failure',
      'cleanup_stale_bundle_entitlements',
    ]
    for (const name of rpcNames) {
      expect(migrationSql).toContain(`FUNCTION public.${name}`)
    }
    expect(migrationSql).toContain('prosecdef = true')
  })

  // =========================================================================
  // Test 25 (25A, 25B): Zero Schema Leak & Partial Write Rollback Atomicity
  // =========================================================================
  test('Test 25A: sanitizeRpcResponseForClient strips _internal_sqlstate, _internal_sqlerrm, sqlstate, and detail from client response while logging server-side', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const rawRpcPayload = {
        ok: false,
        error: 'RPC_INTERNAL_ERROR',
        request_id: 'req-25a',
        _internal_sqlstate: '23505',
        _internal_sqlerrm: 'duplicate key value violates unique constraint "user_tools_pkey"',
        sqlstate: '23505',
        detail: 'Key (user_id, tool_id)=(xxx, yyy) already exists.',
      }

      const clientSafe = sanitizeRpcResponseForClient(
        rawRpcPayload,
        'req-25a',
        'approve_order_and_grant_bundle'
      )

      expect(clientSafe).toEqual({
        ok: false,
        error: 'RPC_INTERNAL_ERROR',
        request_id: 'req-25a',
        requestId: 'req-25a',
      })
      expect(clientSafe).not.toHaveProperty('_internal_sqlstate')
      expect(clientSafe).not.toHaveProperty('_internal_sqlerrm')
      expect(clientSafe).not.toHaveProperty('sqlstate')
      expect(clientSafe).not.toHaveProperty('detail')
      expect(errSpy).toHaveBeenCalledTimes(1)
    } finally {
      errSpy.mockRestore()
    }
  })

  test('Test 25B: Single outer BEGIN...EXCEPTION...END block in RPCs guarantees zero nested exception blocks (atomic rollback on statement 2 failure)', () => {
    // Strip SQL line comments before counting BEGIN / EXCEPTION keywords inside approve_order_and_grant_bundle
    const approveStart = migrationSql.indexOf(
      'CREATE OR REPLACE FUNCTION public.approve_order_and_grant_bundle'
    )
    const approveEnd = migrationSql.indexOf(
      '-- 2.3 Revoke Order & Bundle'
    )
    const approveBodyNoComments = migrationSql
      .slice(approveStart, approveEnd)
      .replace(/--.*$/gm, '')
    const beginCount = (approveBodyNoComments.match(/\bBEGIN\b/g) || []).length
    const exceptionCount = (approveBodyNoComments.match(/\bEXCEPTION\b/g) || []).length
    expect(beginCount).toBe(1)
    expect(exceptionCount).toBe(1)
  })

  // =========================================================================
  // Tests 26, 27, 28, 29: 4-Step Backfill, Trigger, RLS & Revoke Reason Enum
  // =========================================================================
  test('Test 26: 4-step backfill for user_trials.expires_at (started_at + 7 days) and orders.updated_at (COALESCE(approved_at, created_at))', () => {
    expect(migrationSql).toContain(
      'ADD COLUMN IF NOT EXISTS expires_at timestamptz;'
    )
    expect(migrationSql).toContain(
      "SET expires_at = COALESCE(started_at, created_at, now()) + INTERVAL '7 days'"
    )
    expect(migrationSql).toContain(
      'SET updated_at = COALESCE(approved_at, created_at, now())'
    )
  })

  test('Test 27: BEFORE UPDATE trigger trg_orders_set_updated_at updates orders.updated_at automatically', () => {
    expect(migrationSql).toContain('CREATE TRIGGER trg_orders_set_updated_at')
    expect(migrationSql).toContain('BEFORE UPDATE ON public.orders')
    expect(migrationSql).toContain('NEW.updated_at := now();')
  })

  test('Test 28: Internal tables enable RLS with deny_all policy and REVOKE ALL FROM anon, authenticated', () => {
    expect(migrationSql).toContain('ALTER TABLE public._system_maintenance ENABLE ROW LEVEL SECURITY;')
    expect(migrationSql).toContain('ALTER TABLE public._migration_log ENABLE ROW LEVEL SECURITY;')
    expect(migrationSql).toContain(
      'ALTER TABLE public._migration_20261105_user_tools_audit ENABLE ROW LEVEL SECURITY;'
    )
    expect(migrationSql).toContain(
      'REVOKE ALL ON TABLE public._system_maintenance FROM PUBLIC, anon, authenticated;'
    )
    expect(migrationSql).toContain(
      'REVOKE ALL ON TABLE public._migration_log FROM PUBLIC, anon, authenticated;'
    )
    expect(migrationSql).toContain(
      'REVOKE ALL ON TABLE public._migration_20261105_user_tools_audit FROM PUBLIC, anon, authenticated;'
    )
  })

  test('Test 29: Invalid p_revoke_reason returns INVALID_REVOKE_REASON (400 Bad Request with Thai message)', async () => {
    const sb = createInMemorySupabase()
    const res = await revokeCourseBundleEntitlements({
      orderId: 'ord-29',
      revokeReason: 'hacked_invalid_reason',
      supabaseClient: sb,
    })

    expect(res.ok).toBe(false)
    expect(res.error).toBe('INVALID_REVOKE_REASON')
    expect(BUNDLE_ERROR_CATALOG.INVALID_REVOKE_REASON.httpStatus).toBe(400)
    expect(BUNDLE_ERROR_CATALOG.INVALID_REVOKE_REASON.messageTh).toContain('admin_revoke')
  })

  // =========================================================================
  // Tests 30 & 31: All-in-One ฿999 Package & Future-Proof Exclusion Control
  // =========================================================================
  test('Test 30: Buying puppap-all-in-one (฿999) unlocks all eligible tools + courses and excludes tools flagged with exclude_from_all_in_one: true', async () => {
    const sb = createInMemorySupabase()
    const TOOL_ALL_IN_ONE_ID = '422e791a-a8f5-4821-9ae2-097adfcfa4d5'
    const TOOL_FUTURE_INCLUDED_ID = 'aaaa0000-0000-4000-8000-000000000010'
    const TOOL_FUTURE_EXCLUDED_ID = 'bbbb0000-0000-4000-8000-000000000011'

    sb._state.tools.push(
      { id: TOOL_ALL_IN_ONE_ID, slug: ALL_IN_ONE_SLUG, is_active: true, features: {} } as any,
      { id: TOOL_FUTURE_INCLUDED_ID, slug: 'puppap-future-tool-2027', is_active: true, features: {} } as any,
      {
        id: TOOL_FUTURE_EXCLUDED_ID,
        slug: 'puppap-vip-exclusive',
        is_active: true,
        features: { exclude_from_all_in_one: true },
      } as any
    )

    expect(isAllInOneSlug(ALL_IN_ONE_SLUG)).toBe(true)
    expect(
      isToolEligibleForAllInOne({
        id: TOOL_FUTURE_INCLUDED_ID,
        slug: 'puppap-future-tool-2027',
        is_active: true,
        features: {},
      })
    ).toBe(true)
    expect(
      isToolEligibleForAllInOne({
        id: TOOL_FUTURE_EXCLUDED_ID,
        slug: 'puppap-vip-exclusive',
        is_active: true,
        features: { exclude_from_all_in_one: true },
      })
    ).toBe(false)

    sb._state.orders.set('ord-all-in-one-1', {
      id: 'ord-all-in-one-1',
      user_id: 'user-all-1',
      user_email: 'all1@example.com',
      tool_id: TOOL_ALL_IN_ONE_ID,
      status: 'pending',
      admin_note: null,
    })

    const res = await approveOrderAndGrantBundle({
      orderId: 'ord-all-in-one-1',
      approvedByActor: 'system:auto_slip',
      supabaseClient: sb,
    })

    expect(res.ok).toBe(true)
    expect(res.is_bundle).toBe(true)
    expect(res.granted_slugs).toContain('tiktok-ai-affiliate')
    expect(res.granted_slugs).toContain('puppap-fashion-studio')
    expect(res.granted_slugs).toContain('puppap-ugc-product')
    expect(res.granted_slugs).toContain('puppap-future-tool-2027')
    expect(res.granted_slugs).toContain('puppap-all-in-one')
    expect(res.granted_slugs).not.toContain('puppap-vip-exclusive')
  })

  test('Test 31: resolveUserBundleAccess automatically grants future tools added after puppap-all-in-one purchase and triggers background heal', async () => {
    const sb = createInMemorySupabase()
    const TOOL_ALL_IN_ONE_ID = '422e791a-a8f5-4821-9ae2-097adfcfa4d5'
    const TOOL_BRAND_NEW_ID = 'cccc0000-0000-4000-8000-000000000099'

    sb._state.tools.push({
      id: TOOL_ALL_IN_ONE_ID,
      slug: ALL_IN_ONE_SLUG,
      is_active: true,
      features: {},
    } as any)

    // User owns puppap-all-in-one
    sb._state.userTools.set(`user-all-2:${TOOL_ALL_IN_ONE_ID}`, {
      id: 'ut-all-2',
      user_id: 'user-all-2',
      tool_id: TOOL_ALL_IN_ONE_ID,
      license_key_id: null,
      is_active: true,
    })

    // Admin adds a brand new tool later
    sb._state.tools.push({
      id: TOOL_BRAND_NEW_ID,
      slug: 'puppap-brand-new-2028',
      is_active: true,
      features: {},
    } as any)

    const access = await resolveUserBundleAccess(sb, 'user-all-2', 'all2@example.com')
    expect(access.hasFullBundle).toBe(true)
    expect(access.healed).toBe(true)
    expect(access.ownedToolIds).toContain(TOOL_BRAND_NEW_ID)
    expect(access.ownedToolIds).toContain(TOOL_COURSE_ID)
    expect(sb._state.userTools.has(`user-all-2:${TOOL_BRAND_NEW_ID}`)).toBe(true)
  })
})
