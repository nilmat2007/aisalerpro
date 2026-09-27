import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail, buildTrialFollowUpEmail } from '@/lib/email'
import { notifyTrialConverted } from '@/lib/telegram'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (action === 'convert') {
      // ให้สิทธิ์เต็ม → สร้าง user_tools + License Key (นับรายได้)
      const { data: trial } = await supabase
        .from('user_trials')
        .select('user_id, tool_id, user_email, user_name')
        .eq('id', id)
        .single()

      if (!trial) return NextResponse.json({ error: 'ไม่พบ trial' }, { status: 404 })

      // สร้าง License Key อัตโนมัติ (activated ทันที → นับรายได้)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let part1 = '', part2 = ''
      for (let i = 0; i < 4; i++) {
        part1 += chars.charAt(Math.floor(Math.random() * chars.length))
        part2 += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      const keyCode = `PHM-${part1}-${part2}`

      await supabase.from('license_keys').insert({
        key_code: keyCode,
        tool_id: trial.tool_id,
        package_type: 'single',
        status: 'activated',
        activated_at: new Date().toISOString(),
        activated_email: trial.user_email,
        note: `จาก CRM Trial - ${trial.user_name || trial.user_email}`
      })

      // เพิ่มเข้า user_tools
      await supabase.from('user_tools').upsert({
        user_id: trial.user_id,
        tool_id: trial.tool_id,
      }, { onConflict: 'user_id,tool_id' })

      // อัปเดต trial status
      await supabase.from('user_trials').update({ status: 'converted' }).eq('id', id)

      // แจ้ง Telegram
      const { data: toolInfo } = await supabase.from('tools').select('name').eq('id', trial.tool_id).single()
      notifyTrialConverted(trial.user_name || '', trial.user_email || '', toolInfo?.name || 'ไม่ระบุ')

      return NextResponse.json({ success: true, message: `ให้สิทธิ์เต็มสำเร็จ + สร้าง License Key: ${keyCode}` })

    } else if (action === 'send_email') {
      // ส่งอีเมลติดตามปิดการขาย
      const { data: trial } = await supabase
        .from('user_trials')
        .select('user_email, user_name, tools(name, price, slug)')
        .eq('id', id)
        .single()

      if (!trial?.user_email) return NextResponse.json({ error: 'ไม่พบอีเมล' }, { status: 404 })

      const toolName = (trial as any).tools?.name || 'เครื่องมือ'
      const toolPrice = (trial as any).tools?.price
      const toolSlug = (trial as any).tools?.slug

      const html = buildTrialFollowUpEmail({
        customerName: trial.user_name,
        toolName,
        toolSlug,
        toolPrice,
        customMessage: body.message
      })

      const emailRes = await sendEmail({
        to: trial.user_email,
        subject: `🎁 คุณ ${trial.user_name || ''}! ข้อเสนอพิเศษปลดล็อก ${toolName} เวอร์ชันเต็ม (ตลอดชีพ) - PHEEM AI TOOLKIT`,
        html
      })

      if (!emailRes.success) {
        return NextResponse.json({ error: emailRes.error || 'ส่งอีเมลไม่สำเร็จ' }, { status: 500 })
      }

      try {
        await supabase
          .from('user_trials')
          .update({ followup_sent_at: new Date().toISOString() })
          .eq('id', id)
      } catch {}

      return NextResponse.json({ success: true, message: `ส่งอีเมลข้อเสนอพิเศษถึง ${trial.user_email} สำเร็จ` })

    } else if (action === 'delete') {
      await supabase.from('user_trials').delete().eq('id', id)
      return NextResponse.json({ success: true, message: 'ลบ trial สำเร็จ' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
