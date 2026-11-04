import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { id: memberId } = await params
    const { user_tool_id } = await request.json()

    if (!user_tool_id) {
      return NextResponse.json({ error: 'ไม่ระบุ user_tool_id' }, { status: 400 })
    }

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

    // 1. ลบ user_tools record ทั้งหมดของสมาชิกสำหรับเครื่องมือนี้ (ยกเลิกสิทธิ์เข้าใช้ทันที)
    await supabase
      .from('user_tools')
      .delete()
      .eq('user_id', memberId)
      .eq('tool_id', userTool.tool_id)

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
      .eq('tool_id', userTool.tool_id)
      .eq('activated_by', memberId)
      .eq('status', 'activated')

    if (profile?.email) {
      await supabase
        .from('license_keys')
        .update({ status: 'revoked' })
        .eq('tool_id', userTool.tool_id)
        .ilike('activated_email', profile.email)
        .eq('status', 'activated')
    }

    // 3. อัปเดต orders ที่เคย approved ของสมาชิกนี้ → เปลี่ยนเป็น rejected เพื่อป้องกัน Auto-Heal ชุบชีวิตสิทธิ์กลับมา
    const revokeNote = 'แอดมินยกเลิกสิทธิ์การใช้งาน (Revoked)'
    await supabase
      .from('orders')
      .update({ status: 'rejected', admin_note: revokeNote })
      .eq('user_id', memberId)
      .eq('tool_id', userTool.tool_id)
      .eq('status', 'approved')

    if (profile?.email) {
      await supabase
        .from('orders')
        .update({ status: 'rejected', admin_note: revokeNote })
        .ilike('user_email', profile.email)
        .eq('tool_id', userTool.tool_id)
        .eq('status', 'approved')
    }

    // 4. อัปเดต user_trials ถ้ามี → เปลี่ยนกลับเป็น active
    await supabase
      .from('user_trials')
      .update({ status: 'active' })
      .eq('user_id', memberId)
      .eq('tool_id', userTool.tool_id)
      .eq('status', 'converted')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
