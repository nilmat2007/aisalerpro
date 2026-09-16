import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: memberId } = await params
    const { user_tool_id } = await request.json()

    if (!user_tool_id) {
      return NextResponse.json({ error: 'ไม่ระบุ user_tool_id' }, { status: 400 })
    }

    // ดึงข้อมูล user_tools ก่อนลบ เพื่อเอา tool_id ไปอัปเดต license_keys
    const { data: userTool } = await supabase
      .from('user_tools')
      .select('tool_id')
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

    // 1. ลบ user_tools record (ยกเลิกสิทธิ์เข้าใช้)
    await supabase
      .from('user_tools')
      .delete()
      .eq('id', user_tool_id)
      .eq('user_id', memberId)

    // 2. อัปเดต license_keys ที่เกี่ยวข้อง → เปลี่ยนเป็น revoked (ตัดรายได้)
    if (profile?.email) {
      await supabase
        .from('license_keys')
        .update({ status: 'revoked' })
        .eq('tool_id', userTool.tool_id)
        .eq('activated_email', profile.email)
        .eq('status', 'activated')
    }

    // 3. อัปเดต user_trials ถ้ามี → เปลี่ยนกลับเป็น active
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
