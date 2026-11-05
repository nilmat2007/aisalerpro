import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  getCourseBundleToolIds,
  revokeCourseBundleEntitlements,
  invalidateBundleSyncCache,
  type RevokeReason,
} from '@/lib/course-bundle'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { id: memberId } = await params
    const body = await request.json()
    const { user_tool_id, revoke_reason } = body

    if (!user_tool_id) {
      return NextResponse.json({ error: 'ไม่ระบุ user_tool_id' }, { status: 400 })
    }

    const validReasons: RevokeReason[] = ['false_slip', 'refund', 'chargeback', 'duplicate_test', 'admin_revoke']
    const revokeReason: RevokeReason = validReasons.includes(revoke_reason) ? revoke_reason : 'admin_revoke'

    // ดึงข้อมูล user_tools ก่อนลบ เพื่อเอา tool_id และ license_key_id ไปอัปเดตตารางที่เกี่ยวข้องครบทั้ง 3 ตาราง
    const { data: userTool } = await supabase
      .from('user_tools')
      .select('tool_id, license_key_id')
      .eq('id', user_tool_id)
      .eq('user_id', memberId)
      .single()

    if (!userTool) {
      return NextResponse.json({ error: 'ไม่พบสิทธิ์' }, { status: 404 })
    }

    // ดึง email ของ member
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', memberId)
      .single()

    const bundleInfo = await getCourseBundleToolIds(supabase)
    const isBundleTool = bundleInfo.bundleIds.includes(userTool.tool_id)
    const targetToolIds = isBundleTool ? bundleInfo.bundleIds : [userTool.tool_id]

    // หากมี order ที่ผูกกับ license_key_id นี้ ให้เรียก revokeCourseBundleEntitlements เพื่อรักษาความสอดคล้องของ bundle & surviving keys
    if (userTool.license_key_id) {
      const { data: linkedOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('license_key_id', userTool.license_key_id)
        .maybeSingle()

      if (linkedOrder?.id) {
        const rpcRes = await revokeCourseBundleEntitlements(supabase, {
          orderId: linkedOrder.id,
          adminNote: 'แอดมินยกเลิกสิทธิ์การใช้งาน (Revoked)',
          revokeReason,
        })
        invalidateBundleSyncCache(memberId)
        if (rpcRes.success) {
          return NextResponse.json({
            success: true,
            revokedToolIds: rpcRes.revokedToolIds,
            keptActiveViaOrderId: rpcRes.keptActiveViaOrderId || null,
          })
        }
      }
    }

    // Fallback สำหรับกรณีสิทธิ์ที่ไม่ได้ผูกกับ order โดยตรง (เช่น แอดมินสร้างคีย์ให้เอง)
    // 1. ลบ user_tools record ทั้งหมดของสมาชิกสำหรับเครื่องมือนี้ (หรือทั้งชุด bundle)
    await supabase
      .from('user_tools')
      .delete()
      .eq('user_id', memberId)
      .in('tool_id', targetToolIds)

    // 2. อัปเดต license_keys ที่เกี่ยวข้อง → เปลี่ยนเป็น revoked ทั้งจาก id, user_id และ email
    if (userTool.license_key_id) {
      await supabase
        .from('license_keys')
        .update({ status: 'revoked' })
        .eq('id', userTool.license_key_id)
    }

    await supabase
      .from('license_keys')
      .update({ status: 'revoked' })
      .in('tool_id', targetToolIds)
      .eq('activated_by', memberId)
      .eq('status', 'activated')

    if (profile?.email) {
      await supabase
        .from('license_keys')
        .update({ status: 'revoked' })
        .in('tool_id', targetToolIds)
        .ilike('activated_email', profile.email)
        .eq('status', 'activated')
    }

    // 3. อัปเดต orders ที่เคย approved ของสมาชิกนี้ → เปลี่ยนเป็น rejected เพื่อป้องกัน Auto-Heal ชุบชีวิตสิทธิ์กลับมา
    const revokeNote = `[REVOKE:${revokeReason}] แอดมินยกเลิกสิทธิ์การใช้งาน (Revoked)`
    await supabase
      .from('orders')
      .update({ status: 'rejected', admin_note: revokeNote })
      .eq('user_id', memberId)
      .in('tool_id', targetToolIds)
      .eq('status', 'approved')

    if (profile?.email) {
      await supabase
        .from('orders')
        .update({ status: 'rejected', admin_note: revokeNote })
        .ilike('user_email', profile.email)
        .in('tool_id', targetToolIds)
        .eq('status', 'approved')
    }

    // 4. อัปเดต user_trials ถ้ามี → เปลี่ยนกลับเป็น active เฉพาะที่ยังไม่หมดอายุ 7 วัน
    const nowIso = new Date().toISOString()
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: convertedTrials } = await supabase
      .from('user_trials')
      .select('id, started_at, created_at, expires_at')
      .eq('user_id', memberId)
      .in('tool_id', targetToolIds)
      .eq('status', 'converted')

    for (const t of convertedTrials || []) {
      const exp = (t as any).expires_at
      const start = (t as any).started_at || (t as any).created_at
      const isStillValid = exp ? exp > nowIso : start ? start > sevenDaysAgoIso : false
      await supabase
        .from('user_trials')
        .update({ status: isStillValid ? 'active' : 'expired' })
        .eq('id', t.id)
    }

    invalidateBundleSyncCache(memberId)

    return NextResponse.json({
      success: true,
      revokedToolIds: targetToolIds,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
