import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'

// GET - ดึงข้อมูล trial ทั้งหมดสำหรับ CRM
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { data: trials, error } = await supabase
      .from('user_trials')
      .select('id, user_id, tool_id, user_email, user_name, status, started_at, created_at, followup_sent_at, tools(name, slug, price)')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(trials || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
