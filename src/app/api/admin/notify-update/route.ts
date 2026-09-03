import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { sendEmail, buildToolUpdateEmail } from '@/lib/email'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin_token')?.value

  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { toolId, toolName, updateNote } = await request.json()

    if (!toolId || !toolName) {
      return NextResponse.json({ error: 'toolId and toolName are required' }, { status: 400 })
    }

    // Find all users who own this tool
    const { data: userTools, error: utError } = await supabase
      .from('user_tools')
      .select('user_id, profiles(email)')
      .eq('tool_id', toolId)
      .eq('is_active', true)

    if (utError) {
      return NextResponse.json({ error: utError.message }, { status: 500 })
    }

    if (!userTools || userTools.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'ไม่มีลูกค้าที่ซื้อเครื่องมือนี้', 
        sent: 0 
      })
    }

    // Collect unique emails
    const emails = userTools
      .map((ut: any) => ut.profiles?.email)
      .filter((email: string) => email && email.includes('@'))
    
    const uniqueEmails = [...new Set(emails)] as string[]

    if (uniqueEmails.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'ไม่พบอีเมลของลูกค้า', 
        sent: 0 
      })
    }

    // Build email content
    const html = buildToolUpdateEmail(toolName, updateNote)

    // Send emails (BCC for privacy)
    const result = await sendEmail({
      to: uniqueEmails,
      subject: `🆕 อัปเดตใหม่: ${toolName} — PHEEM AI TOOLKIT`,
      html,
    })

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `ส่งอีเมลแจ้งเตือนสำเร็จ ${uniqueEmails.length} คน`, 
        sent: uniqueEmails.length 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'ส่งอีเมลไม่สำเร็จ' 
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
