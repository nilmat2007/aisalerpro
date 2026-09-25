import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTrialStarted } from '@/lib/telegram'

// POST - เริ่มทดลองใช้
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทดลองใช้' }, { status: 401 })
    }

    const { tool_id } = await request.json()
    if (!tool_id) {
      return NextResponse.json({ error: 'ไม่ระบุ tool_id' }, { status: 400 })
    }

    // เช็คว่า tool เปิด trial มั้ย
    const { data: tool } = await supabase
      .from('tools')
      .select('id, name, trial_enabled, trial_flow_url')
      .eq('id', tool_id)
      .single()

    if (!tool || !tool.trial_enabled) {
      return NextResponse.json({ error: 'เครื่องมือนี้ไม่เปิดให้ทดลองใช้' }, { status: 400 })
    }

    // เช็คว่าซื้อจริงแล้วหรือยัง
    const { data: owned } = await supabase
      .from('user_tools')
      .select('id')
      .eq('user_id', user.id)
      .eq('tool_id', tool_id)
      .maybeSingle()

    if (owned) {
      return NextResponse.json({ error: 'คุณมีสิทธิ์ใช้งานเต็มแล้ว', alreadyOwned: true }, { status: 400 })
    }

    // เช็คว่าเคย trial แล้วหรือยัง
    const { data: existing } = await supabase
      .from('user_trials')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('tool_id', tool_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        message: 'คุณเคยทดลองใช้แล้ว',
        trial: existing,
        alreadyTried: true 
      })
    }

    // สร้าง trial record
    const { data: trial, error } = await supabase
      .from('user_trials')
      .insert({
        user_id: user.id,
        tool_id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // แจ้ง Telegram (พร้อมปุ่มให้สิทธิ์เต็ม)
    notifyTrialStarted(
      user.user_metadata?.full_name || user.email || '',
      user.email || '',
      tool.name,
      trial.id
    )

    return NextResponse.json({ 
      success: true, 
      message: 'เริ่มทดลองใช้สำเร็จ!',
      trial,
      trial_flow_url: tool.trial_flow_url
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET - เช็คสถานะ trial
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ hasTrialAccess: false })
    }

    const url = new URL(request.url)
    const toolId = url.searchParams.get('tool_id')

    if (!toolId) {
      // ดึง trial ทั้งหมดของ user
      const { data: trials } = await supabase
        .from('user_trials')
        .select('*, tools(name, slug, trial_flow_url)')
        .eq('user_id', user.id)

      return NextResponse.json({ trials: trials || [] })
    }

    // เช็คเฉพาะ tool
    const { data: trial } = await supabase
      .from('user_trials')
      .select('*, tools(name, slug, trial_flow_url)')
      .eq('user_id', user.id)
      .eq('tool_id', toolId)
      .maybeSingle()

    return NextResponse.json({
      hasTrialAccess: !!trial,
      trial
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
