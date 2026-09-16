import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail, buildToolUpdateEmail } from '@/lib/email'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (action === 'convert') {
      // ให้สิทธิ์เต็ม → สร้าง user_tools record
      const { data: trial } = await supabase
        .from('user_trials')
        .select('user_id, tool_id, user_email')
        .eq('id', id)
        .single()

      if (!trial) return NextResponse.json({ error: 'ไม่พบ trial' }, { status: 404 })

      // เพิ่มเข้า user_tools
      await supabase.from('user_tools').upsert({
        user_id: trial.user_id,
        tool_id: trial.tool_id,
      }, { onConflict: 'user_id,tool_id' })

      // อัปเดต trial status
      await supabase.from('user_trials').update({ status: 'converted' }).eq('id', id)

      return NextResponse.json({ success: true, message: 'ให้สิทธิ์เต็มสำเร็จ' })

    } else if (action === 'send_email') {
      // ส่งอีเมลติดตาม
      const { data: trial } = await supabase
        .from('user_trials')
        .select('user_email, user_name, tools(name)')
        .eq('id', id)
        .single()

      if (!trial?.user_email) return NextResponse.json({ error: 'ไม่พบอีเมล' }, { status: 404 })

      const toolName = (trial as any).tools?.name || 'เครื่องมือ'
      const message = body.message || `สวัสดีครับ คุณ${trial.user_name || ''}! คุณได้ทดลองใช้ ${toolName} แล้ว สนใจซื้อเวอร์ชันเต็มไหมครับ?`

      const html = buildToolUpdateEmail(toolName, message)
      await sendEmail(trial.user_email, `🎁 ข้อเสนอพิเศษ - ${toolName}`, html)

      return NextResponse.json({ success: true, message: `ส่งอีเมลถึง ${trial.user_email} สำเร็จ` })

    } else if (action === 'delete') {
      await supabase.from('user_trials').delete().eq('id', id)
      return NextResponse.json({ success: true, message: 'ลบ trial สำเร็จ' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
